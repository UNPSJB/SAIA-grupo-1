from datetime import date, datetime
import json
import logging
from typing import Dict, List, Literal, Optional, Tuple
from sqlalchemy import Sequence, delete, func, select, update
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import es_operador
from src.insumos.models import Insumo
from src.personal.models import Personal
from src.producto.models import Producto
from src.tipoInsumo.models import TipoInsumo, Aditivo
from src.recetas.models import Receta, VersionReceta, RecetaDetalle, ChecklistReceta, ChecklistRecetaItem, EstadoEtapaRecetaItem, EstadoGeneralRecetaChecklist
from src.personal.schemas import Capacidades
from src.recetas import schemas, exceptions




def es_administrador(persona: Personal) -> bool:
    return persona.capacidad in (Capacidades.ADMINISTRAR, Capacidades.AMBAS)

def obtener_descripcion_personal(persona) -> str:
    if not persona:
        return "Desconocido"
    legajo = getattr(persona, "legajo", "")
    nombre = getattr(persona, "nombre", "")
    apellido = getattr(persona, "apellido", "")
    usuario = getattr(persona, "usuario", None)
    desc = f"{legajo} - {nombre} {apellido}".strip()
    if usuario:
        desc += f" (@{usuario})"
    return desc

def verificar_permiso_administrador(
    db: Session,
    responsable_legajo: Optional[int] = None,
    usuario: Optional[Personal] = None,
) -> Personal:
    if responsable_legajo is not None:
        persona = db.scalar(select(Personal).where(Personal.legajo == responsable_legajo))
        if not persona:
            raise exceptions.ResponsableNoEncontrado()
        if not persona.activo:
            raise exceptions.ResponsableInactivo()
        if not es_administrador(persona):
            raise exceptions.SoloAdministradorPuedeSubir()
        return persona

    if usuario is not None:
        if not getattr(usuario, "activo", True):
            raise exceptions.ResponsableInactivo()
        if not es_administrador(usuario):
            raise exceptions.SoloAdministradorPuedeSubir()
        if isinstance(usuario, Personal):
            return usuario
        if hasattr(usuario, "legajo"):
            persona_db = db.scalar(select(Personal).where(Personal.legajo == usuario.legajo))
            if persona_db:
                return persona_db
        return usuario

    persona = db.scalar(
        select(Personal).where(
            Personal.activo == True,
            Personal.capacidad.in_([Capacidades.ADMINISTRAR, Capacidades.AMBAS]),
        )
    )
    if not persona:
        raise exceptions.SoloAdministradorPuedeSubir()
    return persona

def calcular_siguiente_version(versiones: Sequence[VersionReceta]) -> int:
    if not versiones:
        return 1
    numeros = []
    for v in versiones:
        try:
            numeros.append(int(v.version))
        except (ValueError, TypeError):
            pass
    if numeros:
        return max(numeros) + 1
    return len(versiones) + 1


def _normalizar_detalle_para_guardar(db: Session, detalle: dict) -> dict:
    from src.unidadesMedida.services import resolver_unidad_medida

    d = dict(detalle)
    params_ctrl = d.pop("parametros_control", None)
    if params_ctrl is not None:
        d["parametros_control_json"] = json.dumps(params_ctrl, ensure_ascii=False)

    unidad_texto = d.pop("unidad_medida", None)
    unidad_id_explicit = d.pop("unidad_medida_id", None)

    # La etapa de receta se asocia a TipoInsumo, no a un lote de Insumo
    tipo_id = d.get("tipo_insumo_id") or None
    adit_id = d.get("aditivo_id") or None

    
    d["tipo_insumo_id"] = tipo_id
    d["aditivo_id"] = adit_id

    tipo_obj = db.get(TipoInsumo, tipo_id) if tipo_id else None

    if tipo_obj and tipo_obj.unidad_medida_id:
        d["unidad_medida_id"] = tipo_obj.unidad_medida_id
    elif unidad_id_explicit:
        d["unidad_medida_id"] = unidad_id_explicit
    else:
        try:
            u = resolver_unidad_medida(
                db,
                valor_texto=unidad_texto or "gramos",
                exigir_activa=False,
            )
            d["unidad_medida_id"] = u.id
        except Exception:
            d["unidad_medida_id"] = 2

    if tipo_obj and tipo_obj.es_aditivo:
        d["es_aditivo"] = True
        d["clase_funcional"] = tipo_obj.clase_funcional
        d["numero_ins"] = tipo_obj.numero_ins
    elif adit_id:
        adit_obj = db.get(Aditivo, adit_id)
        if adit_obj:
            d["es_aditivo"] = True
            d["clase_funcional"] = adit_obj.clase_funcional
            d["numero_ins"] = adit_obj.numero_ins

    return d


def _sincronizar_derivados_receta(db: Session, receta: Receta, usuario: Optional[Personal] = None) -> None:
    try:
        from src.rotulado.services import sincronizar_rotulo_desde_receta
        sincronizar_rotulo_desde_receta(db, receta.id_producto, receta_id=receta.id, usuario=usuario)
    except Exception:
        pass


def crear_receta(db: Session, receta_data: schemas.RecetaCreate, usuario: Personal) -> Receta:
    datos = receta_data.model_dump()
    detalles_data = datos.pop("detalles", [])

    if not detalles_data:
        raise exceptions.AgregueIngredientes()

    tiene_ingrediente = any(
        (d.get("tipo_insumo_id") or d.get("aditivo_id")) and not d["es_aditivo"]
        for d in detalles_data
    )
    if not tiene_ingrediente:
        raise exceptions.AgregueIngredientes()

    validar_operario_etapa(db, datos["operario_legajo"])

    fecha_vigencia = datos.pop("fecha_vigencia", None)
    fecha_vencimiento = datos.pop("fecha_vencimiento", None)
    tiempo_maximo_dias = datos.get("tiempo_maximo_dias") or 1
    datos["tiempo_maximo_dias"] = max(1, int(tiempo_maximo_dias))

    _receta = Receta(**datos)
    db.add(_receta)
    db.flush()

    nueva_version = VersionReceta(
        receta_id=_receta.id,
        version=1,
        rendimiento_final=_receta.rendimiento_final,
        tiempo_maximo_dias=_receta.tiempo_maximo_dias,
        archivado=False,
        es_vigente=True,
        fecha_vigencia=fecha_vigencia,
        fecha_vencimiento=fecha_vencimiento,
        creado_por_legajo=getattr(usuario, "legajo", None),
        creado_por_usuario=getattr(usuario, "usuario", None),
    )
    db.add(nueva_version)
    db.flush()

    for detalle in detalles_data:
        det_norm = _normalizar_detalle_para_guardar(db, detalle)
        det_norm["version_receta_id"] = nueva_version.id
        nuevo_detalle = RecetaDetalle(**det_norm)
        db.add(nuevo_detalle)

    db.commit()
    db.refresh(_receta)
    _sincronizar_derivados_receta(db, _receta, usuario=usuario)
    return _receta


def obtener_receta(db: Session, receta_id: int, usuario: Personal) -> Receta:
    db_receta = db.scalar(select(Receta).where(Receta.id == receta_id))
    if db_receta is None:
        raise exceptions.RecetaNoEncontrada()
    return db_receta


def editar_receta(db: Session, receta_id: int, receta_data: schemas.RecetaUpdate, usuario: Personal) -> Receta:
    db_receta = obtener_receta(db, receta_id, usuario)
    datos = receta_data.model_dump(exclude_unset=True)
    detalles_data = datos.pop("detalles", None)

    if detalles_data is not None:
        if not detalles_data:
            raise exceptions.AgregueIngredientes()
        tiene_ingrediente = any(
        (d.get("tipo_insumo_id") or d.get("aditivo_id")) and not d["es_aditivo"]
        for d in detalles_data
    )
        if not tiene_ingrediente:
            raise exceptions.AgregueIngredientes()

    if "operario_legajo" in datos and datos["operario_legajo"] is not None:
        validar_operario_etapa(db, datos["operario_legajo"])

    fecha_vigencia = datos.pop("fecha_vigencia", None)
    fecha_vencimiento = datos.pop("fecha_vencimiento", None)

    
    if datos:
        db.execute(
            update(Receta).where(Receta.id == receta_id).values(**datos)
        )
        db.flush()

 
    version_anterior = db.scalar(
        select(VersionReceta).where(
            VersionReceta.receta_id == receta_id,
            VersionReceta.es_vigente == True,
        )
    )
    if version_anterior:
        version_anterior.es_vigente = False
        db.add(version_anterior)

    db.refresh(db_receta)
    siguiente_version = calcular_siguiente_version(db_receta.versiones)

    rendimiento_actual = datos.get("rendimiento_final", db_receta.rendimiento_final)
    tiempo_maximo_actual = datos.get("tiempo_maximo_dias", db_receta.tiempo_maximo_dias) or 1

    nueva_version = VersionReceta(
        receta_id=receta_id,
        version=siguiente_version,
        rendimiento_final=rendimiento_actual,
        tiempo_maximo_dias=max(1, int(tiempo_maximo_actual)),
        archivado=False,
        es_vigente=True,
        fecha_vigencia=fecha_vigencia,
        fecha_vencimiento=fecha_vencimiento,
        creado_por_legajo=getattr(usuario, "legajo", None),
        creado_por_usuario=getattr(usuario, "usuario", None),
    )
    db.add(nueva_version)
    db.flush()

    if detalles_data is not None:
        for detalle in detalles_data:
            det_norm = _normalizar_detalle_para_guardar(db, detalle)
            det_norm["version_receta_id"] = nueva_version.id
            nuevo_detalle = RecetaDetalle(**det_norm)
            db.add(nuevo_detalle)

    db.commit()
    db.refresh(db_receta)
    _sincronizar_derivados_receta(db, db_receta, usuario=usuario)
    return db_receta



def listar_versiones_receta(db: Session, receta_id: int) -> List[VersionReceta]:
    db_receta = obtener_receta(db, receta_id, usuario=None)
    return db_receta.versiones


def listar_recetas(db: Session) -> List[Receta]:
    return list(db.scalars(select(Receta)).all())


def validar_operario_etapa(db: Session, legajo: int) -> Personal:
    """Verifica que el responsable de la etapa exista, esté activo y tenga capacidad de operar."""
    persona = db.scalar(select(Personal).where(Personal.legajo == legajo))
    if persona is None:
        raise exceptions.ResponsableNoEncontrado()
    if not persona.activo:
        raise exceptions.ResponsableInactivo()
    if not es_operador(persona):
        raise exceptions.PersonalNoOperador()
    return persona


def escalar_receta(
    db: Session,
    receta_id: int,
    datos: schemas.RecetaEscalarRequest,
) -> schemas.RecetaEscaladaResponse:
    """Calcula proporcionalmente las cantidades de cada ingrediente sin modificar la receta guardada."""
    receta = db.scalar(select(Receta).where(Receta.id == receta_id, Receta.activo == True))
    if receta is None:
        raise exceptions.RecetaNoEncontrada()

    version_vig = receta.version_vigente
    if version_vig is None:
        raise exceptions.RecetaSinVersionVigente()

    rendimiento_base = float(version_vig.rendimiento_final or receta.rendimiento_final)
    if rendimiento_base <= 0:
        raise exceptions.SeNecesitaRendimiento()

    if datos.cantidad_objetivo is not None:
        if datos.cantidad_objetivo <= 0:
            raise exceptions.EscaladoInvalido()
        cantidad_obj = float(datos.cantidad_objetivo)
        factor = cantidad_obj / rendimiento_base
    elif datos.factor is not None:
        if datos.factor <= 0:
            raise exceptions.EscaladoInvalido()
        factor = float(datos.factor)
        cantidad_obj = round(rendimiento_base * factor, 4)
    else:
        raise exceptions.EscaladoInvalido()

    ingredientes_escalados: List[schemas.IngredienteEscaladoItem] = []
    for det in version_vig.detalles:
        if not det.tipo_insumo_id and not det.aditivo_id:
            continue
        cant_escalada = round(float(det.cantidad) * factor, 3)
        ingredientes_escalados.append(
            schemas.IngredienteEscaladoItem(
                detalle_id=det.id,
                nombre_etapa=det.nombre,
                ingrediente_id=getattr(det, "ingrediente_id", None),
                nombre_ingrediente=det.nombre_ingrediente,
                es_aditivo=det.es_aditivo,
                unidad_medida=det.unidad_medida,
                cantidad_base=float(det.cantidad),
                cantidad_escalada=cant_escalada,
                descripcion_pasos=det.descripcion_pasos,
            )
        )

    return schemas.RecetaEscaladaResponse(
        receta_id=receta.id,
        version_receta_id=version_vig.id,
        version=version_vig.version,
        nombre_receta=receta.nombre,
        id_producto=receta.id_producto,
        nombre_producto=getattr(receta, "nombre_producto", None),
        rendimiento_base=rendimiento_base,
        cantidad_objetivo=round(cantidad_obj, 3),
        factor=round(factor, 4),
        ingredientes=ingredientes_escalados,
    )


_FACTORES_MASA_G = {
    "mg": 0.001,
    "miligramo": 0.001,
    "miligramos": 0.001,
    "g": 1.0,
    "gr": 1.0,
    "gramo": 1.0,
    "gramos": 1.0,
    "kg": 1000.0,
    "kilogramo": 1000.0,
    "kilogramos": 1000.0,
    "tn": 1000000.0,
    "tonelada": 1000000.0,
    "toneladas": 1000000.0,
}

_FACTORES_VOLUMEN_ML = {
    "ml": 1.0,
    "cc": 1.0,
    "mililitro": 1.0,
    "mililitros": 1.0,
    "l": 1000.0,
    "lt": 1000.0,
    "litro": 1000.0,
    "litros": 1000.0,
}


def _convertir_entre_unidades(cantidad: float, u_origen: Optional[str], u_destino: Optional[str]) -> float:
    orig = (u_origen or "").strip().lower()
    dest = (u_destino or "").strip().lower()
    if not orig or not dest or orig == dest:
        return float(cantidad)
    if orig in _FACTORES_MASA_G and dest in _FACTORES_MASA_G:
        return float(cantidad) * (_FACTORES_MASA_G[orig] / _FACTORES_MASA_G[dest])
    if orig in _FACTORES_VOLUMEN_ML and dest in _FACTORES_VOLUMEN_ML:
        return float(cantidad) * (_FACTORES_VOLUMEN_ML[orig] / _FACTORES_VOLUMEN_ML[dest])
    return float(cantidad)


def convertir_detalle_a_gramos(
    db: Session, det: RecetaDetalle
) -> Tuple[Optional[float], Optional[str]]:
    u = (det.unidad_medida or "").strip().lower()
    cant = float(det.cantidad or 0.0)

    tipo_obj = det.tipo_insumo
    adit_obj = det.aditivo

    if u in ("gramos", "gramo", "g"):
        return round(cant, 4), None
    if u in ("kilogramos", "kilogramo", "kg"):
        return round(cant * 1000.0, 4), None
    if u in ("toneladas", "tonelada", "tn"):
        return round(cant * 1000000.0, 4), None

    ref_entidad = adit_obj or tipo_obj
    if ref_entidad and ref_entidad.equivalencia_gramos is not None and ref_entidad.equivalencia_gramos > 0:
        cant_ref = float(ref_entidad.cantidad_referencia or 1.0)
        if cant_ref <= 0:
            cant_ref = 1.0
        unidad_maestro = (ref_entidad.unidadMedida or "").strip().lower()
        if u == unidad_maestro or u in ("unidades", "unidad", "un"):
            return round((cant / cant_ref) * float(ref_entidad.equivalencia_gramos), 4), None
        if u in ("mililitros", "mililitro", "ml") and unidad_maestro in ("litros", "litro", "l"):
            return round((cant / 1000.0 / cant_ref) * float(ref_entidad.equivalencia_gramos), 4), None
        if u in ("litros", "litro", "l") and unidad_maestro in ("mililitros", "mililitro", "ml"):
            return round((cant * 1000.0 / cant_ref) * float(ref_entidad.equivalencia_gramos), 4), None

    if u in ("mililitros", "mililitro", "ml"):
        return round(cant, 4), None
    if u in ("litros", "litro", "l"):
        return round(cant * 1000.0, 4), None

    nombre_item = det.nombre_ingrediente or det.nombre
    return (
        None,
        f"El insumo '{nombre_item}' está expresado en '{det.unidad_medida}' y no posee una equivalencia en gramos configurada en el maestro de tipos de insumo.",
    )


def calcular_composicion_porcentual(
    db: Session,
    receta_id: int,
    version_id: Optional[int] = None,
) -> schemas.ComposicionPorcentualResponse:
    receta = db.scalar(select(Receta).where(Receta.id == receta_id))
    if not receta:
        raise exceptions.RecetaNoEncontrada()

    version_obj: Optional[VersionReceta] = None
    if version_id is not None:
        version_obj = db.scalar(
            select(VersionReceta).where(
                VersionReceta.id == version_id,
                VersionReceta.receta_id == receta.id,
            )
        )
    if not version_obj:
        version_obj = receta.version_actual
    if not version_obj:
        raise exceptions.RecetaSinVersionVigente()

    equivalencias_faltantes: List[schemas.EquivalenciaFaltanteItem] = []
    items_temp: List[Tuple[RecetaDetalle, Optional[float]]] = []
    peso_total_gramos = 0.0

    for det in version_obj.detalles:
        if not det.tipo_insumo_id and not det.aditivo_id:
            continue
        gramos, msg_faltante = convertir_detalle_a_gramos(db, det)
        if msg_faltante is not None:
            equivalencias_faltantes.append(
                schemas.EquivalenciaFaltanteItem(
                    detalle_id=det.id,
                    tipo_insumo_id=det.tipo_insumo_id,
                    nombre=det.nombre_ingrediente,
                    unidad_medida=det.unidad_medida,
                    mensaje=msg_faltante,
                )
            )
        elif gramos is not None:
            peso_total_gramos += gramos
        items_temp.append((det, gramos))

    peso_total_gramos = round(peso_total_gramos, 4)

    ingredientes_list: List[schemas.ItemComposicionPorcentual] = []
    aditivos_list: List[schemas.ItemComposicionPorcentual] = []

    for det, gramos in items_temp:
        pct: Optional[float] = None
        if gramos is not None and peso_total_gramos > 0:
            pct = round((gramos / peso_total_gramos) * 100.0, 2)

        item_comp = schemas.ItemComposicionPorcentual(
            detalle_id=det.id,
            tipo_insumo_id=det.tipo_insumo_id,
            aditivo_id=det.aditivo_id,
            nombre=det.nombre_ingrediente,
            nombre_etapa=det.nombre,
            cantidad=float(det.cantidad),
            unidad_medida=det.unidad_medida,
            gramos_equivalentes=round(gramos, 2) if gramos is not None else None,
            porcentaje=pct,
            es_aditivo=bool(det.es_aditivo),
            clase_funcional=det.clase_funcional,
            numero_ins=det.numero_ins,
        )
        if det.es_aditivo:
            aditivos_list.append(item_comp)
        else:
            ingredientes_list.append(item_comp)

    ingredientes_list.sort(key=lambda x: -(x.porcentaje or 0.0))
    aditivos_list.sort(key=lambda x: (-(x.porcentaje or 0.0), (x.clase_funcional or "")))

    todos_con_pct = [it.porcentaje for it in (ingredientes_list + aditivos_list) if it.porcentaje is not None]
    suma_pct = round(sum(todos_con_pct), 2) if todos_con_pct else 0.0
    dif_redondeo = round(suma_pct - 100.0, 2) if todos_con_pct else 0.0
    cumple_100 = (
        len(equivalencias_faltantes) == 0
        and peso_total_gramos > 0
        and abs(dif_redondeo) <= 0.1
    )

    return schemas.ComposicionPorcentualResponse(
        receta_id=receta.id,
        nombre_receta=receta.nombre,
        id_producto=receta.id_producto,
        nombre_producto=getattr(receta, "nombre_producto", None),
        version_receta_id=version_obj.id,
        version=version_obj.version,
        rendimiento_final=float(version_obj.rendimiento_final or receta.rendimiento_final),
        peso_total_gramos=round(peso_total_gramos, 2),
        suma_porcentajes=suma_pct,
        diferencia_redondeo=dif_redondeo,
        cumple_cien_por_ciento=cumple_100,
        tiene_equivalencias_faltantes=len(equivalencias_faltantes) > 0,
        equivalencias_faltantes=equivalencias_faltantes,
        ingredientes=ingredientes_list,
        aditivos=aditivos_list,
    )


def obtener_composicion_porcentual_producto(
    db: Session,
    producto_id: int,
    version_id: Optional[int] = None,
) -> schemas.ComposicionPorcentualResponse:
    receta = db.scalar(
        select(Receta).where(Receta.id_producto == producto_id, Receta.activo == True)
    )
    if not receta:
        raise exceptions.RecetaNoEncontrada()
    return calcular_composicion_porcentual(db, receta.id, version_id=version_id)


def generar_checklist_receta(
    db: Session, datos: schemas.ChecklistRecetaGenerar
) -> ChecklistReceta:
    fecha = datos.fecha or date.today()
    if fecha != date.today():
        raise exceptions.ChecklistFechaInvalida()

    responsable = validar_operario_etapa(db, datos.responsable_legajo)

    if datos.cantidad_objetivo is not None:
        if abs(float(datos.cantidad_objetivo) - round(float(datos.cantidad_objetivo))) > 1e-6:
            raise exceptions.CantidadLoteNoDiscreta()

    query_recetas = select(Receta).where(Receta.activo == True)
    if datos.id_producto is not None:
        query_recetas = query_recetas.where(Receta.id_producto == datos.id_producto)
        if not es_administrador(responsable):
            query_recetas = query_recetas.where(Receta.operario_legajo == responsable.legajo)
    else:
        query_recetas = query_recetas.where(Receta.operario_legajo == responsable.legajo)

    recetas_asignadas = db.scalars(query_recetas).all()

    items_a_crear: List[ChecklistRecetaItem] = []
    receta_principal: Optional[Receta] = None
    version_principal: Optional[VersionReceta] = None
    hoy = date.today()

    for receta in recetas_asignadas:
        version_vig = receta.version_vigente
        if not version_vig:
            continue

        receta_principal = receta
        version_principal = version_vig
        rendimiento_base = float(version_vig.rendimiento_final or receta.rendimiento_final or 1.0)

        factor = 1.0
        if datos.cantidad_objetivo is not None and rendimiento_base > 0:
            factor = float(datos.cantidad_objetivo) / rendimiento_base
        elif datos.factor is not None:
            factor = float(datos.factor)

        if datos.id_producto is not None:
            requerido_por_tipo: Dict[int, Tuple[str, float, str]] = {}
            requerido_por_insumo: Dict[int, Tuple[str, float, str]] = {}
            for det in version_vig.detalles:
                cant_req = round(float(det.cantidad) * factor, 3)
                u_det = det.unidad_medida or "gramos"
                det_ing = getattr(det, "ingrediente", None)
                det_ing_id = getattr(det, "ingrediente_id", None)
                t_id = det.tipo_insumo_id or (det_ing.tipo_insumo_id if det_ing else None)
                if t_id:
                    nom_prev, acum_prev, u_prev = requerido_por_tipo.get(t_id, (det.nombre_ingrediente, 0.0, u_det))
                    cant_conv = _convertir_entre_unidades(cant_req, u_det, u_prev)
                    requerido_por_tipo[t_id] = (nom_prev, acum_prev + cant_conv, u_prev)
                elif det_ing_id:
                    nom_prev, acum_prev, u_prev = requerido_por_insumo.get(det_ing_id, (det.nombre_ingrediente, 0.0, u_det))
                    cant_conv = _convertir_entre_unidades(cant_req, u_det, u_prev)
                    requerido_por_insumo[det_ing_id] = (nom_prev, acum_prev + cant_conv, u_prev)

            for t_id, (nom_t, total_req, u_req) in requerido_por_tipo.items():
                lotes_activos = list(
                    db.scalars(
                        select(Insumo).where(
                            Insumo.tipo_insumo_id == t_id,
                            Insumo.activo == True,
                            Insumo.stock > 0,
                        )
                    ).all()
                )
                stock_vigente_en_u_req = 0.0
                for l_ins in lotes_activos:
                    f_v = l_ins.fechaVencimiento.date() if isinstance(l_ins.fechaVencimiento, datetime) else l_ins.fechaVencimiento
                    if f_v is None or f_v >= hoy:
                        stock_vigente_en_u_req += _convertir_entre_unidades(float(l_ins.stock), l_ins.medida, u_req)
                if stock_vigente_en_u_req + 1e-6 < total_req:
                    raise exceptions.StockInsumoInsuficienteReceta(
                        f"Stock insuficiente de '{nom_t}': se requieren {round(total_req, 3)} {u_req} y hay {round(stock_vigente_en_u_req, 3)} {u_req} disponibles."
                    )

            for i_id, (nom_i, total_req) in requerido_por_insumo.items():
                ins_db = db.get(Insumo, i_id)
                stock_disp = float(ins_db.stock) if ins_db and ins_db.activo else 0.0
                if stock_disp + 1e-6 < total_req:
                    raise exceptions.StockInsumoInsuficienteReceta(
                        f"Stock insuficiente de '{nom_i}': se requieren {round(total_req, 3)} y hay {round(stock_disp, 3)} disponibles."
                    )

        for idx_orden, detalle in enumerate(version_vig.detalles, start=1):
            cantidad_calculada = round(float(detalle.cantidad) * factor, 3)
            det_ing = getattr(detalle, "ingrediente", None)
            t_id_det = detalle.tipo_insumo_id or (det_ing.tipo_insumo_id if det_ing else None)

            item = ChecklistRecetaItem(
                orden=idx_orden,
                receta_id=receta.id,
                version_receta_id=version_vig.id,
                nombre_receta=receta.nombre,
                detalle_id=detalle.id,
                etapa=detalle.etapa,
                nombre_etapa=detalle.nombre,
                descripcion_pasos=detalle.descripcion_pasos,
                ingrediente_id=getattr(detalle, "ingrediente_id", None),
                tipo_insumo_id=t_id_det,
                cantidad=cantidad_calculada,
                unidad_medida_id=detalle.unidad_medida_id,
                parametros_control_json=detalle.parametros_control_json,
                estado=EstadoEtapaRecetaItem.PENDIENTE,
                responsable_legajo=responsable.legajo,
            )
            items_a_crear.append(item)

    if not items_a_crear:
        raise exceptions.NoHayEtapasAsignadas()

    dias_max = (
        version_principal.tiempo_maximo_dias
        if version_principal and version_principal.tiempo_maximo_dias
        else (receta_principal.tiempo_maximo_dias if receta_principal and receta_principal.tiempo_maximo_dias else 1)
    )

    checklist = ChecklistReceta(
        fecha=fecha,
        responsable_legajo=responsable.legajo,
        id_producto=datos.id_producto or (receta_principal.id_producto if receta_principal else None),
        receta_id=receta_principal.id if receta_principal else None,
        version_receta_id=version_principal.id if version_principal else None,
        cantidad_objetivo=datos.cantidad_objetivo,
        tiempo_maximo_dias=dias_max,
        activo=True,
        items=items_a_crear,
    )
    db.add(checklist)
    db.commit()
    db.refresh(checklist)
    return checklist


def listar_checklists_receta(
    db: Session,
    fecha: Optional[date] = None,
    estado: Optional[str] = None,
    responsable_legajo: Optional[int] = None,
) -> List[ChecklistReceta]:
    query = select(ChecklistReceta).order_by(ChecklistReceta.fecha.desc(), ChecklistReceta.id.desc())
    if fecha:
        query = query.where(ChecklistReceta.fecha == fecha)
    if responsable_legajo is not None:
        query = query.where(ChecklistReceta.responsable_legajo == responsable_legajo)

    checklists = list(db.scalars(query).all())
    if estado:
        estado_lower = estado.lower()
        checklists = [c for c in checklists if c.estado.value == estado_lower]
    return checklists


def obtener_checklist_receta(db: Session, checklist_id: int) -> ChecklistReceta:
    checklist = db.scalar(
        select(ChecklistReceta).where(ChecklistReceta.id == checklist_id)
    )
    if not checklist:
        raise exceptions.ChecklistNoEncontrado()
    return checklist


def obtener_etapa_checklist(
    db: Session, checklist_id: int, item_id: int
) -> ChecklistRecetaItem:
    item = db.scalar(
        select(ChecklistRecetaItem).where(
            ChecklistRecetaItem.id == item_id,
            ChecklistRecetaItem.checklist_id == checklist_id,
        )
    )
    if not item:
        raise exceptions.EtapaChecklistNoEncontrada()
    return item


def _crear_lote_desde_checklist_completado(
    db: Session, checklist: ChecklistReceta, operario_legajo: int
) -> None:
    if not checklist.id_producto or checklist.lote_produccion_id is not None:
        return
    from src.produccion.models import LoteProduccion, InsumoLote
    from src.produccion.services import _siguiente_codigo

    producto = db.get(Producto, checklist.id_producto)
    if not producto:
        return

    version_vig = db.get(VersionReceta, checklist.version_receta_id) if checklist.version_receta_id else None
    cant_lote = float(
        checklist.cantidad_objetivo
        or (version_vig.rendimiento_final if version_vig else 1.0)
    )

    fecha_lote = date.today()
    nuevo_lote = LoteProduccion(
        codigo=_siguiente_codigo(db, fecha_lote),
        producto_id=producto.id,
        fecha=fecha_lote,
        cantidad=cant_lote,
        responsable_legajo=operario_legajo,
        version_receta_id=checklist.version_receta_id,
        checklist_receta_id=checklist.id,
    )
    db.add(nuevo_lote)
    db.flush()

    acumulado_por_lote_insumo: Dict[int, float] = {}
    for it in checklist.items:
        if it.estado == EstadoEtapaRecetaItem.REALIZADO:
            usados_multi = it.lotes_insumo_usados
            if usados_multi:
                for entry in usados_multi:
                    l_id = entry.get("lote_insumo_id")
                    cant_e = float(entry.get("cantidad_descontada_lote") or entry.get("cantidad") or 0.0)
                    if l_id and cant_e > 0:
                        acumulado_por_lote_insumo[int(l_id)] = (
                            acumulado_por_lote_insumo.get(int(l_id), 0.0) + cant_e
                        )
            else:
                lote_ins_id = it.lote_insumo_usado_id
                if lote_ins_id and it.cantidad > 0:
                    lote_ref = db.get(Insumo, lote_ins_id)
                    cant_conv = (
                        _convertir_entre_unidades(float(it.cantidad), it.unidad_medida, lote_ref.medida)
                        if lote_ref
                        else float(it.cantidad)
                    )
                    acumulado_por_lote_insumo[lote_ins_id] = (
                        acumulado_por_lote_insumo.get(lote_ins_id, 0.0) + cant_conv
                    )

    for ins_id, cant_usada in acumulado_por_lote_insumo.items():
        ins_obj = db.get(Insumo, ins_id)
        if ins_obj:
            nuevo_lote.insumos.append(InsumoLote(insumo=ins_obj, cantidad=round(cant_usada, 3)))

    checklist.lote_produccion_id = nuevo_lote.id
    db.flush()


def completar_etapa_checklist(
    db: Session,
    checklist_id: int,
    item_id: int,
    operario_legajo: int,
    datos: Optional[schemas.CompletarEtapaSchema] = None,
) -> ChecklistRecetaItem:
    checklist = obtener_checklist_receta(db, checklist_id)
    if checklist.estado in (
        EstadoGeneralRecetaChecklist.COMPLETADO,
        EstadoGeneralRecetaChecklist.VENCIDO,
    ):
        raise exceptions.ChecklistNoModificable()

    item = obtener_etapa_checklist(db, checklist_id, item_id)
    if item.estado != EstadoEtapaRecetaItem.PENDIENTE:
        raise exceptions.EtapaYaCompletada()

    items_ordenados = sorted(checklist.items, key=lambda x: (x.orden or 0, x.id))
    for previo in items_ordenados:
        if previo.id == item.id:
            break
        if previo.estado == EstadoEtapaRecetaItem.PENDIENTE:
            raise exceptions.PasoAnteriorPendiente()

    validar_operario_etapa(db, operario_legajo)

    lotes_multi = datos.lotes_insumo if datos and datos.lotes_insumo else []
    lote_elegido_id = datos.lote_insumo_id if datos and datos.lote_insumo_id else None

    if lotes_multi:
        agrupado: Dict[int, float] = {}
        for entry in lotes_multi:
            agrupado[entry.lote_insumo_id] = round(
                agrupado.get(entry.lote_insumo_id, 0.0) + float(entry.cantidad), 4
            )
        total_asignado = round(sum(agrupado.values()), 4)
        if total_asignado + 1e-3 < float(item.cantidad):
            raise exceptions.StockInsumoInsuficienteReceta(
                f"La cantidad total asignada entre los lotes ({total_asignado}) es menor a la requerida ({item.cantidad})."
            )
        registros_usados = []
        for l_id, cant_usar in agrupado.items():
            lote_ins = db.get(Insumo, l_id)
            if not lote_ins or not lote_ins.activo:
                raise exceptions.StockInsumoInsuficienteReceta(
                    "Uno de los lotes de insumo seleccionados no existe o está inactivo."
                )
            if item.tipo_insumo_id and lote_ins.tipo_insumo_id != item.tipo_insumo_id:
                raise exceptions.StockInsumoInsuficienteReceta(
                    f"El lote {lote_ins.lote} no corresponde al tipo de insumo requerido por el paso."
                )
            cant_en_unidad_lote = _convertir_entre_unidades(cant_usar, item.unidad_medida, lote_ins.medida)
            if float(lote_ins.stock) + 1e-6 < cant_en_unidad_lote:
                stock_en_u_item = round(_convertir_entre_unidades(float(lote_ins.stock), lote_ins.medida, item.unidad_medida), 3)
                raise exceptions.StockInsumoInsuficienteReceta(
                    f"Stock insuficiente en el lote {lote_ins.lote}: disponible {lote_ins.stock} {lote_ins.medida} ({stock_en_u_item} {item.unidad_medida}), solicitado {cant_usar} {item.unidad_medida}."
                )
            lote_ins.stock = round(max(0.0, float(lote_ins.stock) - cant_en_unidad_lote), 4)
            registros_usados.append({
                "lote_insumo_id": lote_ins.id,
                "lote_codigo": lote_ins.lote,
                "nombre": lote_ins.nombre,
                "cantidad": round(cant_usar, 3),
                "cantidad_descontada_lote": round(cant_en_unidad_lote, 4),
            })
        item.lote_insumo_usado_id = registros_usados[0]["lote_insumo_id"]
        item.lotes_insumo_usados_json = json.dumps(registros_usados, ensure_ascii=False)
    elif lote_elegido_id is not None:
        lote_ins = db.get(Insumo, lote_elegido_id)
        if not lote_ins or not lote_ins.activo:
            raise exceptions.StockInsumoInsuficienteReceta("El lote de insumo seleccionado no existe o está inactivo.")
        if item.tipo_insumo_id and lote_ins.tipo_insumo_id != item.tipo_insumo_id:
            raise exceptions.StockInsumoInsuficienteReceta(
                "El lote seleccionado no corresponde al tipo de insumo requerido por la etapa."
            )
        cant_en_unidad_lote = _convertir_entre_unidades(float(item.cantidad), item.unidad_medida, lote_ins.medida)
        if float(lote_ins.stock) + 1e-6 < cant_en_unidad_lote:
            stock_en_u_item = round(_convertir_entre_unidades(float(lote_ins.stock), lote_ins.medida, item.unidad_medida), 3)
            raise exceptions.StockInsumoInsuficienteReceta(
                f"Stock insuficiente en el lote {lote_ins.lote}: disponible {lote_ins.stock} {lote_ins.medida} ({stock_en_u_item} {item.unidad_medida}), requerido {item.cantidad} {item.unidad_medida}."
            )
        lote_ins.stock = round(max(0.0, float(lote_ins.stock) - cant_en_unidad_lote), 4)
        item.lote_insumo_usado_id = lote_ins.id
        item.lotes_insumo_usados_json = json.dumps([{
            "lote_insumo_id": lote_ins.id,
            "lote_codigo": lote_ins.lote,
            "nombre": lote_ins.nombre,
            "cantidad": round(float(item.cantidad), 3),
            "cantidad_descontada_lote": round(cant_en_unidad_lote, 4),
        }], ensure_ascii=False)
    elif checklist.id_producto and item.tipo_insumo_id and float(item.cantidad) > 0:
        lotes = list(
            db.scalars(
                select(Insumo).where(
                    Insumo.tipo_insumo_id == item.tipo_insumo_id,
                    Insumo.activo == True,
                    Insumo.stock > 0,
                ).order_by(Insumo.fechaVencimiento.asc())
            ).all()
        )
        restante = float(item.cantidad)
        registros_usados = []
        for lote_ins in lotes:
            if restante <= 1e-6:
                break
            disp_en_u_item = _convertir_entre_unidades(float(lote_ins.stock), lote_ins.medida, item.unidad_medida)
            tomar_u_item = min(disp_en_u_item, restante)
            if tomar_u_item > 0:
                tomar_u_lote = _convertir_entre_unidades(tomar_u_item, item.unidad_medida, lote_ins.medida)
                lote_ins.stock = round(max(0.0, float(lote_ins.stock) - tomar_u_lote), 4)
                registros_usados.append({
                    "lote_insumo_id": lote_ins.id,
                    "lote_codigo": lote_ins.lote,
                    "nombre": lote_ins.nombre,
                    "cantidad": round(tomar_u_item, 3),
                    "cantidad_descontada_lote": round(tomar_u_lote, 4),
                })
                restante = round(restante - tomar_u_item, 4)
        if registros_usados:
            item.lote_insumo_usado_id = registros_usados[0]["lote_insumo_id"]
            item.lotes_insumo_usados_json = json.dumps(registros_usados, ensure_ascii=False)

    if datos and datos.valores_control:
        item.valores_registrados_json = json.dumps(
            [v.model_dump() for v in datos.valores_control],
            ensure_ascii=False,
        )

    item.estado = EstadoEtapaRecetaItem.REALIZADO
    item.responsable_legajo = operario_legajo
    item.fecha_hora_fin = datetime.now()
    if datos and datos.observaciones:
        item.observaciones = datos.observaciones.strip()

    db.flush()
    todos_completos = all(
        it.estado in (EstadoEtapaRecetaItem.REALIZADO, EstadoEtapaRecetaItem.NO_REALIZADO)
        for it in checklist.items
    )
    if todos_completos and checklist.id_producto and checklist.lote_produccion_id is None:
        _crear_lote_desde_checklist_completado(db, checklist, operario_legajo)

    db.commit()
    if todos_completos and checklist.id_producto and checklist.lote_produccion_id:
        try:
            from src.rotulado.services import sincronizar_lista_desde_lote
            sincronizar_lista_desde_lote(
                db, checklist.id_producto, lote_id=checklist.lote_produccion_id
            )
        except Exception:
            pass
    db.refresh(item)
    return item


def marcar_etapa_no_realizada(
    db: Session,
    checklist_id: int,
    item_id: int,
    datos: schemas.MarcarEtapaNoRealizadaSchema,
    operario_legajo: int,
) -> ChecklistRecetaItem:
    checklist = obtener_checklist_receta(db, checklist_id)
    if checklist.estado in (
        EstadoGeneralRecetaChecklist.COMPLETADO,
        EstadoGeneralRecetaChecklist.VENCIDO,
    ):
        raise exceptions.ChecklistNoModificable()

    item = obtener_etapa_checklist(db, checklist_id, item_id)
    if item.estado != EstadoEtapaRecetaItem.PENDIENTE:
        raise exceptions.EtapaYaCompletada()

    validar_operario_etapa(db, operario_legajo)

    item.estado = EstadoEtapaRecetaItem.NO_REALIZADO
    item.motivo_no_realizado = datos.motivo.strip()
    item.observacion_no_realizado = (
        datos.observacion.strip() if datos.observacion else None
    )
    item.responsable_legajo = operario_legajo
    item.fecha_hora_no_realizado = datetime.now()

    db.commit()
    db.refresh(item)
    return item