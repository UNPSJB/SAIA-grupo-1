from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from src.personal.models import Personal
from src.produccion.models import InsumoLote, LoteProduccion
from src.producto.models import Producto
from src.rotulado import exceptions, schemas
from src.rotulado.constants import (
    LEYENDA_BORRADOR_OBLIGATORIA,
    MENSAJE_SIN_OCTOGONOS,
)
from src.rotulado.models import (
    BorradorRotulo,
    FormatoDeclaracionAditivos,
    ItemIngredienteRotulo,
    ListaIngredientesRotulo,
)


def _obtener_nombre_usuario(usuario: Optional[Any]) -> Optional[str]:
    if not usuario:
        return None
    nombre_u = getattr(usuario, "usuario", None)
    if nombre_u:
        return nombre_u
    nom = getattr(usuario, "nombre", None)
    ape = getattr(usuario, "apellido", None)
    if nom or ape:
        return f"{nom or ''} {ape or ''}".strip()
    return "Administrador"


def es_aromatizante_item(item: Any) -> bool:
    if getattr(item, "es_aromatizante", False):
        return True
    funcion = (getattr(item, "funcion", None) or "").strip().lower()
    return "aroma" in funcion or "saboriz" in funcion


def formatear_declaracion_item(
    item: Any, formato: FormatoDeclaracionAditivos
) -> str:
    if not getattr(item, "es_aditivo", False):
        denominacion = getattr(item, "denominacion_rotulo", None) or getattr(
            item, "nombre", ""
        )
        return denominacion.strip()

    funcion = (getattr(item, "funcion", None) or "").strip()
    if not funcion:
        funcion = "Aditivo"

    if es_aromatizante_item(item):
        return funcion

    nombre_aditivo = (
        getattr(item, "denominacion_rotulo", None)
        or getattr(item, "nombre", "")
    ).strip()
    ins = (getattr(item, "numero_ins", None) or "").strip()

    if not ins:
        return f"{funcion} ({nombre_aditivo})"

    if formato == FormatoDeclaracionAditivos.SOLO_INS:
        return f"{funcion} (INS {ins})"
    if formato == FormatoDeclaracionAditivos.SOLO_NOMBRE:
        return f"{funcion} ({nombre_aditivo})"
    if formato == FormatoDeclaracionAditivos.NOMBRE_E_INS:
        return f"{funcion} ({nombre_aditivo}, INS {ins})"
    return f"{funcion} (INS {ins} - {nombre_aditivo})"


def construir_texto_rotulo(items: List[Any]) -> str:
    if not items:
        return ""
    declaraciones = [
        it.texto_declaracion
        for it in items
        if getattr(it, "texto_declaracion", None)
    ]
    return "INGREDIENTES: " + ", ".join(declaraciones) + "."


def ordenar_items_logica(
    items: List[Any], formato: FormatoDeclaracionAditivos
) -> List[Any]:
    ingredientes_con_indice = []
    aditivos_con_indice = []

    for idx, it in enumerate(items):
        if not getattr(it, "es_aditivo", False):
            ingredientes_con_indice.append((idx, it))
        else:
            if not getattr(it, "funcion", None) and not getattr(it, "nombre", None):
                raise exceptions.DatosIncompletosAditivo()
            aditivos_con_indice.append((idx, it))

    def clave_ingrediente(tupla):
        orig_idx, it = tupla
        denom = (
            getattr(it, "denominacion_rotulo", None)
            or getattr(it, "nombre", "")
        ).strip().lower()
        nombre = getattr(it, "nombre", "").strip().lower()
        return (-float(it.porcentaje), denom, nombre, orig_idx)

    ingredientes_ordenados = [
        it for _, it in sorted(ingredientes_con_indice, key=clave_ingrediente)
    ]

    grupos_por_funcion: Dict[str, List[Any]] = {}
    for orig_idx, it in aditivos_con_indice:
        f_norm = (getattr(it, "funcion", None) or "Otros").strip().capitalize()
        grupos_por_funcion.setdefault(f_norm, []).append((orig_idx, it))

    aditivos_ordenados = []
    for f_norm in sorted(grupos_por_funcion.keys()):
        grupo = grupos_por_funcion[f_norm]

        def clave_aditivo(tupla):
            orig_idx, it = tupla
            denom = (
                getattr(it, "denominacion_rotulo", None)
                or getattr(it, "nombre", "")
            ).strip().lower()
            ins = (getattr(it, "numero_ins", None) or "").strip().lower()
            return (-float(it.porcentaje), denom, ins, orig_idx)

        aditivos_ordenados.extend([it for _, it in sorted(grupo, key=clave_aditivo)])

    resultado = ingredientes_ordenados + aditivos_ordenados
    for pos, it in enumerate(resultado, start=1):
        it.orden = pos
        it.texto_declaracion = formatear_declaracion_item(it, formato)

    return resultado


def obtener_producto_o_404(db: Session, producto_id: int) -> Producto:
    producto = db.get(Producto, producto_id)
    if producto is None:
        raise exceptions.ProductoNoEncontrado()
    return producto


def previsualizar_orden(
    datos: schemas.PrevisualizarOrdenRequest,
) -> schemas.PrevisualizarOrdenResponse:
    if not datos.items:
        raise exceptions.ListaVacia()

    class ItemMock:
        def __init__(self, d: schemas.ItemIngredienteCreate, pseudo_id: int):
            self.id = pseudo_id
            self.nombre = d.nombre
            self.denominacion_rotulo = d.denominacion_rotulo or d.nombre
            self.porcentaje = d.porcentaje
            self.es_aditivo = d.es_aditivo
            self.funcion = d.funcion
            self.numero_ins = d.numero_ins
            self.es_aromatizante = d.es_aromatizante or (
                "aroma" in (d.funcion or "").lower()
                or "saboriz" in (d.funcion or "").lower()
            )
            self.orden = 0
            self.texto_declaracion = None

    items_mock = [ItemMock(it, idx + 1) for idx, it in enumerate(datos.items)]
    formato = datos.formato_aditivos or FormatoDeclaracionAditivos.INS_Y_NOMBRE
    ordenados = ordenar_items_logica(items_mock, formato)
    texto = construir_texto_rotulo(ordenados)

    resp_items = [
        schemas.ItemIngredienteResponse(
            id=it.id,
            orden=it.orden,
            nombre=it.nombre,
            denominacion_rotulo=it.denominacion_rotulo,
            porcentaje=it.porcentaje,
            es_aditivo=it.es_aditivo,
            funcion=it.funcion,
            numero_ins=it.numero_ins,
            es_aromatizante=it.es_aromatizante,
            texto_declaracion=it.texto_declaracion,
        )
        for it in ordenados
    ]

    return schemas.PrevisualizarOrdenResponse(
        formato_aditivos=formato,
        texto_rotulo=texto,
        items=resp_items,
    )


def _cantidad_insumo_a_gramos(cantidad: float, medida: Optional[str]) -> float:
    m = (medida or "").strip().lower()
    if m in ("kg", "kilogramo", "kilogramos", "kilo", "kilos", "l", "lt", "lts", "litro", "litros"):
        return cantidad * 1000.0
    if m in ("tn", "tonelada", "toneladas"):
        return cantidad * 1_000_000.0
    if m in ("mg", "miligramo", "miligramos"):
        return cantidad / 1000.0
    return cantidad


def obtener_lista_rotulo(
    db: Session, producto_id: int
) -> Optional[ListaIngredientesRotulo]:
    obtener_producto_o_404(db, producto_id)
    consulta = select(ListaIngredientesRotulo).where(
        ListaIngredientesRotulo.producto_id == producto_id
    )
    lista = db.scalars(consulta).first()
    if lista is not None and lista.items:
        return lista
    return sincronizar_lista_desde_lote(db, producto_id)


def guardar_lista_rotulo(
    db: Session,
    producto_id: int,
    datos: schemas.ListaIngredientesCreate,
    usuario: Optional[Personal] = None,
) -> ListaIngredientesRotulo:
    producto = obtener_producto_o_404(db, producto_id)
    if not datos.items:
        raise exceptions.ListaVacia()

    lista = (
        db.scalars(
            select(ListaIngredientesRotulo).where(
                ListaIngredientesRotulo.producto_id == producto_id
            )
        ).first()
    )

    formato = datos.formato_aditivos or FormatoDeclaracionAditivos.INS_Y_NOMBRE
    if lista is None:
        lista = ListaIngredientesRotulo(
            producto_id=producto.id,
            formato_aditivos=formato,
            ajustado_manualmente=datos.ajustado_manualmente,
        )
        db.add(lista)
        db.flush()
    else:
        lista.formato_aditivos = formato
        lista.ajustado_manualmente = datos.ajustado_manualmente
        lista.items.clear()
        db.flush()

    items_nuevos = []
    for it in datos.items:
        aroma = it.es_aromatizante or (
            "aroma" in (it.funcion or "").lower()
            or "saboriz" in (it.funcion or "").lower()
        )
        nuevo_item = ItemIngredienteRotulo(
            lista_id=lista.id,
            orden=0,
            nombre=it.nombre,
            denominacion_rotulo=it.denominacion_rotulo or it.nombre,
            porcentaje=it.porcentaje,
            es_aditivo=it.es_aditivo,
            funcion=it.funcion,
            numero_ins=it.numero_ins,
            es_aromatizante=aroma,
        )
        items_nuevos.append(nuevo_item)

    if not datos.ajustado_manualmente:
        items_finales = ordenar_items_logica(items_nuevos, formato)
        lista.ajustado_manualmente = False
        lista.fecha_ajuste_manual = None
        lista.usuario_ajuste_manual = None
    else:
        items_finales = items_nuevos
        for idx, it in enumerate(items_finales, start=1):
            it.orden = idx
            it.texto_declaracion = formatear_declaracion_item(it, formato)
        lista.ajustado_manualmente = True
        lista.fecha_ajuste_manual = datetime.now()
        lista.usuario_ajuste_manual = _obtener_nombre_usuario(usuario)

    lista.items = items_finales
    lista.texto_rotulo = construir_texto_rotulo(items_finales)
    lista.actualizado_el = datetime.now()

    db.commit()
    db.refresh(lista)
    return lista


def reordenar_manualmente(
    db: Session,
    producto_id: int,
    datos: schemas.ReordenarItemsManual,
    usuario: Optional[Personal] = None,
) -> ListaIngredientesRotulo:
    lista = obtener_lista_rotulo(db, producto_id)
    if lista is None or not lista.items:
        raise exceptions.ListaIngredientesNoEncontrada()

    mapa_items = {it.id: it for it in lista.items}
    if set(datos.item_ids) != set(mapa_items.keys()) or len(datos.item_ids) != len(mapa_items):
        raise exceptions.ItemsReordenarInvalidos()

    formato = lista.formato_aditivos or FormatoDeclaracionAditivos.INS_Y_NOMBRE
    items_reordenados = []
    for nueva_pos, item_id in enumerate(datos.item_ids, start=1):
        it = mapa_items[item_id]
        it.orden = nueva_pos
        it.texto_declaracion = formatear_declaracion_item(it, formato)
        items_reordenados.append(it)

    lista.items = items_reordenados
    lista.ajustado_manualmente = True
    lista.fecha_ajuste_manual = datetime.now()
    lista.usuario_ajuste_manual = _obtener_nombre_usuario(usuario)

    lista.texto_rotulo = construir_texto_rotulo(items_reordenados)
    lista.actualizado_el = datetime.now()

    db.commit()
    db.refresh(lista)
    return lista


def restablecer_automatico(
    db: Session,
    producto_id: int,
    usuario: Optional[Personal] = None,
) -> ListaIngredientesRotulo:
    lista = obtener_lista_rotulo(db, producto_id)
    if lista is None or not lista.items:
        raise exceptions.ListaIngredientesNoEncontrada()

    formato = lista.formato_aditivos or FormatoDeclaracionAditivos.INS_Y_NOMBRE
    ordenados = ordenar_items_logica(list(lista.items), formato)

    lista.items = ordenados
    lista.ajustado_manualmente = False
    lista.fecha_ajuste_manual = None
    lista.usuario_ajuste_manual = None
    lista.texto_rotulo = construir_texto_rotulo(ordenados)
    lista.actualizado_el = datetime.now()

    db.commit()
    db.refresh(lista)
    return lista


def cambiar_formato_aditivos(
    db: Session,
    producto_id: int,
    formato: FormatoDeclaracionAditivos,
    usuario: Optional[Personal] = None,
) -> ListaIngredientesRotulo:
    lista = obtener_lista_rotulo(db, producto_id)
    if lista is None or not lista.items:
        raise exceptions.ListaIngredientesNoEncontrada()

    lista.formato_aditivos = formato
    for it in lista.items:
        it.texto_declaracion = formatear_declaracion_item(it, formato)

    lista.texto_rotulo = construir_texto_rotulo(lista.items)
    lista.actualizado_el = datetime.now()

    db.commit()
    db.refresh(lista)
    return lista


def obtener_para_e13(
    db: Session, producto_id: int
) -> schemas.RotuloIngredientesE13Response:
    producto = obtener_producto_o_404(db, producto_id)
    lista = (
        db.scalars(
            select(ListaIngredientesRotulo).where(
                ListaIngredientesRotulo.producto_id == producto_id
            )
        ).first()
    )

    if lista is None or not lista.items:
        return schemas.RotuloIngredientesE13Response(
            producto_id=producto.id,
            producto_nombre=producto.nombre,
            disponible=False,
            ajustado_manualmente=False,
            formato_aditivos=FormatoDeclaracionAditivos.INS_Y_NOMBRE,
            texto_rotulo=None,
            items=[],
        )

    resp_items = [
        schemas.ItemIngredienteResponse(
            id=it.id,
            orden=it.orden,
            nombre=it.nombre,
            denominacion_rotulo=it.denominacion_rotulo,
            porcentaje=it.porcentaje,
            es_aditivo=it.es_aditivo,
            funcion=it.funcion,
            numero_ins=it.numero_ins,
            es_aromatizante=it.es_aromatizante,
            texto_declaracion=it.texto_declaracion,
        )
        for it in sorted(lista.items, key=lambda x: x.orden)
    ]

    return schemas.RotuloIngredientesE13Response(
        producto_id=producto.id,
        producto_nombre=producto.nombre,
        disponible=True,
        ajustado_manualmente=lista.ajustado_manualmente,
        formato_aditivos=lista.formato_aditivos,
        texto_rotulo=lista.texto_rotulo,
        items=resp_items,
    )


def importar_desde_lote(
    db: Session,
    producto_id: int,
    lote_id: Optional[int] = None,
) -> schemas.PrevisualizarOrdenResponse:
    obtener_producto_o_404(db, producto_id)

    lote = None
    if lote_id is not None:
        lote = db.get(LoteProduccion, lote_id)
        if lote is None or lote.producto_id != producto_id:
            raise exceptions.SinLotesDisponibles()
    else:
        consulta_lotes = (
            select(LoteProduccion)
            .where(LoteProduccion.producto_id == producto_id)
            .order_by(LoteProduccion.fecha.desc(), LoteProduccion.id.desc())
        )
        for candidato in db.scalars(consulta_lotes).all():
            if candidato.insumos:
                lote = candidato
                break

    if lote is None or not lote.insumos:
        raise exceptions.SinLotesDisponibles()

    agrupados: Dict[str, Dict[str, Any]] = {}
    for il in lote.insumos:
        insumo = il.insumo
        tipo_obj = getattr(insumo, "tipo", None) if insumo else None
        nombre_insumo = (
            (tipo_obj.nombre if tipo_obj and getattr(tipo_obj, "nombre", None) else None)
            or (insumo.nombre if insumo else "Insumo")
        )
        medida = getattr(insumo, "medida", None) if insumo else None
        cant_g = _cantidad_insumo_a_gramos(float(il.cantidad), medida)
        clave = nombre_insumo.strip().lower()

        if clave not in agrupados:
            es_adit_catalogo = bool(
                (tipo_obj and getattr(tipo_obj, "es_aditivo", False))
                or (insumo and getattr(insumo, "es_aditivo", False))
            )
            funcion_catalogo = (
                getattr(tipo_obj, "clase_funcional", None) if tipo_obj else None
            )
            ins_catalogo = (
                getattr(tipo_obj, "numero_ins", None) if tipo_obj else None
            )

            es_adit = es_adit_catalogo or any(
                w in nombre_insumo.lower()
                for w in ["aditivo", "esencia", "colorante", "conservante", "polvo de hornear", "lecitina"]
            )
            funcion_sugerida = funcion_catalogo if es_adit else None
            es_aroma = False
            if funcion_sugerida and (
                "aroma" in funcion_sugerida.lower()
                or "saboriz" in funcion_sugerida.lower()
            ):
                es_aroma = True
                es_adit = True
            elif "esencia" in nombre_insumo.lower() or "vainilla" in nombre_insumo.lower():
                funcion_sugerida = funcion_sugerida or "Aromatizante"
                es_aroma = True
                es_adit = True
            elif "polvo de hornear" in nombre_insumo.lower():
                funcion_sugerida = funcion_sugerida or "Leudante químico"
                es_adit = True

            agrupados[clave] = {
                "nombre": nombre_insumo,
                "cantidad_g": cant_g,
                "es_aditivo": es_adit,
                "funcion": funcion_sugerida,
                "numero_ins": ins_catalogo if es_adit else None,
                "es_aromatizante": es_aroma,
            }
        else:
            agrupados[clave]["cantidad_g"] += cant_g

    total_cant = sum(v["cantidad_g"] for v in agrupados.values())
    if total_cant <= 0:
        raise exceptions.PorcentajeInvalido()

    items_create = []
    for datos_item in agrupados.values():
        pct = round((datos_item["cantidad_g"] / total_cant) * 100.0, 2)
        if pct <= 0:
            pct = 0.01
        items_create.append(
            schemas.ItemIngredienteCreate(
                nombre=datos_item["nombre"],
                denominacion_rotulo=datos_item["nombre"],
                porcentaje=pct,
                es_aditivo=datos_item["es_aditivo"],
                funcion=datos_item["funcion"],
                numero_ins=datos_item["numero_ins"],
                es_aromatizante=datos_item["es_aromatizante"],
            )
        )

    req = schemas.PrevisualizarOrdenRequest(
        formato_aditivos=FormatoDeclaracionAditivos.INS_Y_NOMBRE,
        items=items_create,
    )
    return previsualizar_orden(req)


def sincronizar_lista_desde_lote(
    db: Session,
    producto_id: int,
    lote_id: Optional[int] = None,
    usuario: Optional[Any] = None,
) -> Optional[ListaIngredientesRotulo]:
    try:
        preview = importar_desde_lote(db, producto_id, lote_id=lote_id)
    except (exceptions.SinLotesDisponibles, exceptions.PorcentajeInvalido, exceptions.ListaVacia):
        return None

    lista_actual = db.scalars(
        select(ListaIngredientesRotulo).where(
            ListaIngredientesRotulo.producto_id == producto_id
        )
    ).first()
    formato = (
        lista_actual.formato_aditivos
        if lista_actual and lista_actual.formato_aditivos
        else FormatoDeclaracionAditivos.INS_Y_NOMBRE
    )

    items_create = [
        schemas.ItemIngredienteCreate(
            nombre=it.nombre,
            denominacion_rotulo=it.denominacion_rotulo or it.nombre,
            porcentaje=it.porcentaje,
            es_aditivo=it.es_aditivo,
            funcion=it.funcion,
            numero_ins=it.numero_ins,
            es_aromatizante=it.es_aromatizante,
        )
        for it in preview.items
    ]
    return guardar_lista_rotulo(
        db=db,
        producto_id=producto_id,
        datos=schemas.ListaIngredientesCreate(
            formato_aditivos=formato,
            ajustado_manualmente=False,
            items=items_create,
        ),
        usuario=usuario,
    )


def mapear_respuesta_lista(
    lista: ListaIngredientesRotulo,
) -> schemas.ListaIngredientesResponse:
    prod_nom = lista.producto.nombre if lista.producto else ""
    resp_items = [
        schemas.ItemIngredienteResponse(
            id=it.id,
            orden=it.orden,
            nombre=it.nombre,
            denominacion_rotulo=it.denominacion_rotulo,
            porcentaje=it.porcentaje,
            es_aditivo=it.es_aditivo,
            funcion=it.funcion,
            numero_ins=it.numero_ins,
            es_aromatizante=it.es_aromatizante,
            texto_declaracion=it.texto_declaracion,
        )
        for it in sorted(lista.items, key=lambda x: x.orden)
    ]
    return schemas.ListaIngredientesResponse(
        id=lista.id,
        producto_id=lista.producto_id,
        producto_nombre=prod_nom,
        formato_aditivos=lista.formato_aditivos,
        ajustado_manualmente=lista.ajustado_manualmente,
        fecha_ajuste_manual=lista.fecha_ajuste_manual,
        usuario_ajuste_manual=lista.usuario_ajuste_manual,
        texto_rotulo=lista.texto_rotulo,
        actualizado_el=lista.actualizado_el,
        items=resp_items,
    )


def _obtener_abreviatura_unidad(producto: Producto) -> str:
    abrev = getattr(producto, "unidad_medida_abreviatura", None)
    if abrev:
        return str(abrev).strip()
    u_med = getattr(producto, "unidadMedida", None)
    if not u_med:
        return "kg"
    val = (
        u_med.value
        if hasattr(u_med, "value")
        else str(u_med).replace("UnidadMedida.", "")
    ).lower().strip()
    mapa = {
        "kilogramos": "kg",
        "gramos": "g",
        "litros": "l",
        "mililitros": "ml",
        "unidades": "un",
        "kilogramo": "kg",
        "gramo": "g",
        "litro": "l",
        "mililitro": "ml",
        "unidad": "un",
    }
    return mapa.get(val, val or "kg")


def _construir_contenido_neto_sugerido(producto: Producto) -> str:
    unidad_str = _obtener_abreviatura_unidad(producto)
    cant_env = getattr(producto, "cantidad_por_envase", None)
    if cant_env is not None and float(cant_env) > 0:
        num = float(cant_env)
        num_str = str(int(num)) if num == int(num) else f"{round(num, 2):g}"
        return f"{num_str} {unidad_str}"
    peso_u = getattr(producto, "peso_unidad_g", None)
    if peso_u is not None and float(peso_u) > 0:
        num = float(peso_u)
        num_str = str(int(num)) if num == int(num) else f"{round(num, 2):g}"
        return f"{num_str} g"
    return f"1 {unidad_str}"


def _sincronizar_tabla_nutricional_en_borrador(
    db: Session,
    producto: Producto,
    borrador: BorradorRotulo,
    recalcular: bool = True,
) -> None:
    if borrador.tabla_editada_manualmente:
        return

    if recalcular:
        from src.nutricion.services import calcular_informacion_nutricional

        try:
            calcular_informacion_nutricional(db, producto_id=producto.id)
        except Exception:
            pass

    from src.nutricion.models import InformacionNutricionalProducto

    info_nut = db.scalar(
        select(InformacionNutricionalProducto).where(
            InformacionNutricionalProducto.producto_id == producto.id
        )
    )
    if not info_nut:
        return

    if info_nut.tamano_porcion_g:
        porc_num = float(info_nut.tamano_porcion_g)
        porc_str = str(int(porc_num)) if porc_num == int(porc_num) else f"{porc_num:.1f}"
        borrador.porcion = f"{porc_str} g"
    if info_nut.porciones_por_envase:
        pe_num = float(info_nut.porciones_por_envase)
        borrador.porciones_por_envase = (
            str(int(pe_num)) if pe_num == int(pe_num) else f"{round(pe_num, 2):g}"
        )
    borrador.valor_energetico_kcal = info_nut.energia_kcal_porcion
    borrador.valor_energetico_kj = info_nut.energia_kj_porcion
    borrador.carbohidratos = info_nut.carbohidratos_porcion
    borrador.azucares_totales = info_nut.azucares_totales_porcion
    borrador.azucares_anadidos = info_nut.azucares_anadidos_porcion
    borrador.proteinas = info_nut.proteinas_porcion
    borrador.grasas_totales = info_nut.grasas_totales_porcion
    borrador.grasas_saturadas = info_nut.grasas_saturadas_porcion
    borrador.grasas_trans = info_nut.grasas_trans_porcion
    borrador.fibra_alimentaria = info_nut.fibra_alimentaria_porcion
    borrador.sodio = info_nut.sodio_mg_porcion
    borrador.tabla_marcada_incompleta = bool(getattr(info_nut, "es_incompleta", False))


def obtener_o_crear_borrador(
    db: Session, producto_id: int
) -> BorradorRotulo:
    producto = obtener_producto_o_404(db, producto_id)
    borrador = (
        db.query(BorradorRotulo)
        .filter(BorradorRotulo.producto_id == producto_id)
        .first()
    )
    contenido_sugerido = _construir_contenido_neto_sugerido(producto)
    if borrador:
        cambio = False
        if (
            not borrador.contenido_neto_editado_manualmente
            and borrador.contenido_neto != contenido_sugerido
        ):
            borrador.contenido_neto = contenido_sugerido
            cambio = True
        if (
            not borrador.tabla_editada_manualmente
            and (
                borrador.porcion is None
                or borrador.valor_energetico_kcal is None
                or borrador.tabla_marcada_incompleta
            )
        ):
            _sincronizar_tabla_nutricional_en_borrador(db, producto, borrador, recalcular=True)
            cambio = True
        if cambio:
            db.commit()
            db.refresh(borrador)
        return borrador

    u_lote = (
        db.query(LoteProduccion)
        .filter(LoteProduccion.producto_id == producto_id)
        .order_by(LoteProduccion.fecha.desc(), LoteProduccion.id.desc())
        .first()
    )
    cod_lote = u_lote.codigo if u_lote else "L-001"

    nuevo_borrador = BorradorRotulo(
        producto_id=producto_id,
        denominacion_venta=producto.nombre,
        contenido_neto=contenido_sugerido,
        rnpa_rppa=None,
        rne=None,
        razon_social="SAIA Alimentos S.A.",
        direccion_origen="Parque Industrial Trelew, Chubut, Argentina",
        pais_origen="Industria Argentina",
        lote=cod_lote,
        fecha_duracion="Consumir preferentemente antes de la fecha indicada en el envase",
        instrucciones_conservacion=producto.conservacion,
        modo_empleo=None,
        porcion=None,
        porciones_por_envase=None,
        tabla_marcada_incompleta=False,
        modo_calculo_octogonos="automatico",
    )
    db.add(nuevo_borrador)
    db.commit()
    db.refresh(nuevo_borrador)
    _sincronizar_tabla_nutricional_en_borrador(db, producto, nuevo_borrador, recalcular=True)
    db.commit()
    db.refresh(nuevo_borrador)
    return nuevo_borrador


def guardar_borrador(
    db: Session,
    producto_id: int,
    datos: schemas.BorradorRotuloUpdate,
    usuario: Optional[Any] = None,
) -> BorradorRotulo:
    borrador = obtener_o_crear_borrador(db, producto_id)
    payload = datos.model_dump(exclude_unset=True)

    if "lote" in payload and payload["lote"] != borrador.lote and "lote_editado_manualmente" not in payload:
        borrador.lote_editado_manualmente = True

    if "denominacion_venta" in payload and payload["denominacion_venta"] != borrador.denominacion_venta and "denominacion_editada_manualmente" not in payload:
        borrador.denominacion_editada_manualmente = True

    if "contenido_neto" in payload and payload["contenido_neto"] != borrador.contenido_neto and "contenido_neto_editado_manualmente" not in payload:
        borrador.contenido_neto_editado_manualmente = True

    if ("modo_calculo_octogonos" in payload or any(k.startswith("tiene_exceso_") or k.startswith("contiene_") for k in payload)) and "sellos_editados_manualmente" not in payload:
        nuevo_modo = payload.get("modo_calculo_octogonos", borrador.modo_calculo_octogonos)
        borrador.sellos_editados_manualmente = (nuevo_modo == "manual")

    nutri_keys = [
        "porcion", "porciones_por_envase", "valor_energetico_kcal", "valor_energetico_kj",
        "carbohidratos", "azucares_totales", "azucares_anadidos", "proteinas",
        "grasas_totales", "grasas_saturadas", "grasas_trans", "fibra_alimentaria",
        "sodio", "tabla_marcada_incompleta"
    ]
    if any(nk in payload for nk in nutri_keys) and "tabla_editada_manualmente" not in payload:
        borrador.tabla_editada_manualmente = True

    for k, v in payload.items():
        setattr(borrador, k, v)

    borrador.usuario_actualizacion = _obtener_nombre_usuario(usuario)
    borrador.actualizado_el = datetime.now()
    db.commit()
    db.refresh(borrador)
    return borrador


def autocompletar_datos_borrador(
    db: Session,
    producto_id: int,
    campos: Optional[List[str]] = None,
    usuario: Optional[Any] = None,
) -> BorradorRotulo:
    producto = obtener_producto_o_404(db, producto_id)
    borrador = obtener_o_crear_borrador(db, producto_id)

    u_lote = (
        db.query(LoteProduccion)
        .filter(LoteProduccion.producto_id == producto_id)
        .order_by(LoteProduccion.fecha.desc(), LoteProduccion.id.desc())
        .first()
    )
    cod_lote = u_lote.codigo if u_lote else "L-001"
    unidad_str = _obtener_abreviatura_unidad(producto)

    t_campos = set(campos) if campos else {"lote", "denominacion", "contenido_neto", "sellos", "tabla", "ingredientes"}

    if "lote" in t_campos:
        borrador.lote = cod_lote
        borrador.lote_editado_manualmente = False

    if "denominacion" in t_campos:
        borrador.denominacion_venta = producto.nombre
        borrador.denominacion_editada_manualmente = False

    if "contenido_neto" in t_campos:
        borrador.contenido_neto = _construir_contenido_neto_sugerido(producto)
        borrador.contenido_neto_editado_manualmente = False

    if "sellos" in t_campos:
        borrador.modo_calculo_octogonos = "automatico"
        borrador.sellos_editados_manualmente = False

    if "tabla" in t_campos:
        borrador.tabla_editada_manualmente = False
        _sincronizar_tabla_nutricional_en_borrador(db, producto, borrador, recalcular=True)

    if "ingredientes" in t_campos:
        borrador.ingredientes_editado_manualmente = False

    borrador.usuario_actualizacion = _obtener_nombre_usuario(usuario)
    borrador.actualizado_el = datetime.now()
    db.commit()
    db.refresh(borrador)
    return borrador


def sincronizar_rotulo_desde_receta(
    db: Session,
    producto_id: int,
    receta_id: Optional[int] = None,
    usuario: Optional[Any] = None,
) -> None:
    from src.recetas.services import obtener_composicion_porcentual_producto
    from src.nutricion.services import calcular_informacion_nutricional

    producto = db.get(Producto, producto_id)
    if not producto:
        return

    comp = obtener_composicion_porcentual_producto(db, producto_id)
    items_rotulo: List[schemas.ItemIngredienteCreate] = []
    for ing in comp.ingredientes:
        pct_val = ing.porcentaje if ing.porcentaje and ing.porcentaje > 0 else 0.01
        items_rotulo.append(
            schemas.ItemIngredienteCreate(
                nombre=ing.nombre,
                denominacion_rotulo=ing.nombre,
                porcentaje=pct_val,
                es_aditivo=False,
            )
        )
    for adit in comp.aditivos:
        pct_val = adit.porcentaje if adit.porcentaje and adit.porcentaje > 0 else 0.01
        func_str = adit.clase_funcional or "Aditivo"
        es_aroma = "aroma" in func_str.lower() or "saboriz" in func_str.lower()
        items_rotulo.append(
            schemas.ItemIngredienteCreate(
                nombre=adit.nombre,
                denominacion_rotulo=adit.nombre,
                porcentaje=pct_val,
                es_aditivo=True,
                funcion=func_str,
                numero_ins=adit.numero_ins,
                es_aromatizante=es_aroma,
            )
        )

    if items_rotulo:
        guardar_lista_rotulo(
            db=db,
            producto_id=producto_id,
            datos=schemas.ListaIngredientesCreate(
                formato_aditivos=FormatoDeclaracionAditivos.INS_Y_NOMBRE,
                ajustado_manualmente=False,
                items=items_rotulo,
            ),
            usuario=usuario,
        )

    if getattr(producto, "aplica_rotulado", True):
        try:
            calcular_informacion_nutricional(
                db,
                producto_id=producto_id,
                receta_id=receta_id,
                usuario_actual=_obtener_nombre_usuario(usuario),
            )
        except Exception:
            pass
        obtener_o_crear_borrador(db, producto_id)
        autocompletar_datos_borrador(db, producto_id, usuario=usuario)


def calcular_octogonos_e12(
    borrador: BorradorRotulo, lista: Optional[ListaIngredientesRotulo]
) -> tuple[List[schemas.OctogonoItem], bool, str]:
    from sqlalchemy.orm import object_session
    from src.rotulado_frontal.models import EstadoModulo
    from src.rotulado_frontal.constants import CLAVE_MODULO_OCTOGONOS

    sess = object_session(borrador)
    if sess is not None:
        estado_mod = sess.get(EstadoModulo, CLAVE_MODULO_OCTOGONOS)
        if estado_mod is not None and not estado_mod.activo:
            return [], False, "El sistema de octógonos y leyendas precautorias se encuentra desactivado en Configuración."

        if borrador.producto is not None and not borrador.producto.aplica_rotulado:
            return (
                [],
                False,
                "No corresponde el rotulado frontal porque el producto no se comercializa envasado en ausencia del cliente.",
            )

    octogonos: List[schemas.OctogonoItem] = []

    if borrador.modo_calculo_octogonos == "manual":
        if borrador.tiene_exceso_azucares:
            octogonos.append(
                schemas.OctogonoItem(
                    id="azucares", texto="EXCESO EN AZÚCARES", tipo="octogono"
                )
            )
        if borrador.tiene_exceso_grasas_totales:
            octogonos.append(
                schemas.OctogonoItem(
                    id="grasas_totales",
                    texto="EXCESO EN GRASAS TOTALES",
                    tipo="octogono",
                )
            )
        if borrador.tiene_exceso_grasas_saturadas:
            octogonos.append(
                schemas.OctogonoItem(
                    id="grasas_saturadas",
                    texto="EXCESO EN GRASAS SATURADAS",
                    tipo="octogono",
                )
            )
        if borrador.tiene_exceso_calorias:
            octogonos.append(
                schemas.OctogonoItem(
                    id="calorias", texto="EXCESO EN CALORÍAS", tipo="octogono"
                )
            )
        if borrador.tiene_exceso_sodio:
            octogonos.append(
                schemas.OctogonoItem(
                    id="sodio", texto="EXCESO EN SODIO", tipo="octogono"
                )
            )
        if borrador.contiene_edulcorantes:
            octogonos.append(
                schemas.OctogonoItem(
                    id="edulcorantes",
                    texto="CONTIENE EDULCORANTES: NO RECOMENDABLE EN NIÑOS/AS",
                    tipo="micro_sello",
                )
            )
        if borrador.contiene_cafeina:
            octogonos.append(
                schemas.OctogonoItem(
                    id="cafeina",
                    texto="CONTIENE CAFEÍNA: EVITAR EN NIÑOS/AS",
                    tipo="micro_sello",
                )
            )
    else:
        kcal = borrador.valor_energetico_kcal or 0.0
        gt = borrador.grasas_totales or 0.0
        gs = borrador.grasas_saturadas or 0.0
        az_anad = borrador.azucares_anadidos or 0.0
        sodio_mg = borrador.sodio or 0.0

        from src.rotulado_frontal.services import obtener_parametros_sellos_vigentes, UNIDADES_LIQUIDAS

        params_s = obtener_parametros_sellos_vigentes(sess) if sess is not None else None
        f_carb = float(params_s.factor_kcal_carbohidratos) if params_s else 4.0
        f_grasa = float(params_s.factor_kcal_grasas) if params_s else 9.0
        u_az = float(params_s.umbral_azucares_pct) / 100.0 if params_s else 0.10
        u_gt = float(params_s.umbral_grasas_totales_pct) / 100.0 if params_s else 0.30
        u_gs = float(params_s.umbral_grasas_saturadas_pct) / 100.0 if params_s else 0.10
        u_sodio_rel = float(params_s.umbral_sodio_mg_por_kcal) if params_s else 1.0
        u_sodio_abs = float(params_s.umbral_sodio_max_100g) if params_s else 300.0
        u_cal_sol = float(params_s.umbral_calorias_solido_100g) if params_s else 275.0
        u_cal_liq = float(params_s.umbral_calorias_liquido_100ml) if params_s else 25.0

        unidad_prod = ""
        if borrador.producto is not None:
            unidad_prod = str(getattr(borrador.producto, "unidadMedida", "") or "").strip().lower()
        es_liquido = unidad_prod in {u.lower() for u in UNIDADES_LIQUIDAS}
        u_cal = u_cal_liq if es_liquido else u_cal_sol

        exceso_az = (
            (az_anad * f_carb >= kcal * u_az) if (kcal > 0 and az_anad > 0) else False
        )
        exceso_gt = (
            (gt * f_grasa >= kcal * u_gt) if (kcal > 0 and gt > 0) else False
        )
        exceso_gs = (
            (gs * f_grasa >= kcal * u_gs) if (kcal > 0 and gs > 0) else False
        )
        exceso_sodio = (
            (((sodio_mg / kcal) >= u_sodio_rel and kcal > 0) or (sodio_mg >= u_sodio_abs))
            if sodio_mg > 0
            else False
        )
        exceso_cal = (
            (kcal >= u_cal and (exceso_az or exceso_gt or exceso_gs))
            if kcal > 0
            else False
        )

        tiene_edulc = borrador.contiene_edulcorantes
        tiene_caf = borrador.contiene_cafeina

        if lista and lista.items:
            palabras_edulcorantes = (
                "edulcorante",
                "sucralosa",
                "aspartamo",
                "stevia",
                "estevia",
                "ciclamato",
                "acesulfamo",
                "sacarina",
                "ins 950",
                "ins 951",
                "ins 952",
                "ins 954",
                "ins 955",
                "ins 960",
            )
            palabras_cafeina = (
                "cafeina",
                "cafeína",
                "café",
                "cafe",
                "guaraná",
                "guarana",
            )
            for it in lista.items:
                nom_low = (it.nombre or "").lower()
                func_low = (it.funcion or "").lower()
                ins_low = (it.numero_ins or "").lower()
                texto_item = f"{nom_low} {func_low} {ins_low}"
                if any(p in texto_item for p in palabras_edulcorantes):
                    tiene_edulc = True
                if any(p in texto_item for p in palabras_cafeina):
                    tiene_caf = True

        if exceso_az or borrador.tiene_exceso_azucares:
            octogonos.append(
                schemas.OctogonoItem(
                    id="azucares", texto="EXCESO EN AZÚCARES", tipo="octogono"
                )
            )
        if exceso_gt or borrador.tiene_exceso_grasas_totales:
            octogonos.append(
                schemas.OctogonoItem(
                    id="grasas_totales",
                    texto="EXCESO EN GRASAS TOTALES",
                    tipo="octogono",
                )
            )
        if exceso_gs or borrador.tiene_exceso_grasas_saturadas:
            octogonos.append(
                schemas.OctogonoItem(
                    id="grasas_saturadas",
                    texto="EXCESO EN GRASAS SATURADAS",
                    tipo="octogono",
                )
            )
        if exceso_cal or borrador.tiene_exceso_calorias:
            octogonos.append(
                schemas.OctogonoItem(
                    id="calorias", texto="EXCESO EN CALORÍAS", tipo="octogono"
                )
            )
        if exceso_sodio or borrador.tiene_exceso_sodio:
            octogonos.append(
                schemas.OctogonoItem(
                    id="sodio", texto="EXCESO EN SODIO", tipo="octogono"
                )
            )
        if tiene_edulc:
            octogonos.append(
                schemas.OctogonoItem(
                    id="edulcorantes",
                    texto="CONTIENE EDULCORANTES: NO RECOMENDABLE EN NIÑOS/AS",
                    tipo="micro_sello",
                )
            )
        if tiene_caf:
            octogonos.append(
                schemas.OctogonoItem(
                    id="cafeina",
                    texto="CONTIENE CAFEÍNA: EVITAR EN NIÑOS/AS",
                    tipo="micro_sello",
                )
            )

    tiene_oct = len(octogonos) > 0
    msg = (
        f"Corresponde la inclusión de {len(octogonos)} sello(s) de advertencia nutricional."
        if tiene_oct
        else MENSAJE_SIN_OCTOGONOS
    )
    return octogonos, tiene_oct, msg


def detectar_datos_faltantes_y_tabla(
    borrador: BorradorRotulo, lista: Optional[ListaIngredientesRotulo]
) -> tuple[List[str], bool, List[str], bool, int, int, int]:
    datos_faltantes: List[str] = []

    if not borrador.denominacion_venta or not borrador.denominacion_venta.strip():
        datos_faltantes.append(
            "Falta especificar la denominación de venta del producto (nombre legal que describe el alimento)"
        )

    if not lista or not lista.items or len(lista.items) == 0:
        datos_faltantes.append(
            "Falta confeccionar la lista de ingredientes y aditivos del rótulo"
        )

    if not borrador.contenido_neto or not borrador.contenido_neto.strip():
        datos_faltantes.append(
            "Falta indicar el contenido neto del producto (peso o volumen neto)"
        )

    if not borrador.rnpa_rppa or not borrador.rnpa_rppa.strip():
        datos_faltantes.append(
            "Falta ingresar el número de registro del producto (RNPA o RPPA)"
        )

    if not borrador.rne or not borrador.rne.strip():
        datos_faltantes.append(
            "Falta ingresar el número de registro del establecimiento (RNE o RPE)"
        )

    if not borrador.razon_social or not borrador.razon_social.strip():
        datos_faltantes.append(
            "Falta indicar la razón social o titular del establecimiento elaborador"
        )

    if not borrador.direccion_origen or not borrador.direccion_origen.strip():
        datos_faltantes.append(
            "Falta indicar la dirección o domicilio del establecimiento elaborador"
        )

    if not borrador.pais_origen or not borrador.pais_origen.strip():
        datos_faltantes.append(
            "Falta indicar el país de origen del producto"
        )

    if not borrador.lote or not borrador.lote.strip():
        datos_faltantes.append("Falta indicar la identificación del lote")

    if not borrador.fecha_duracion or not borrador.fecha_duracion.strip():
        datos_faltantes.append("Falta indicar la fecha de duración o vencimiento")

    if borrador.es_importado:
        if not borrador.razon_social_importador or not borrador.razon_social_importador.strip():
            datos_faltantes.append(
                "Falta indicar la razón social o titular del importador (obligatorio para producto importado)"
            )
        if not borrador.domicilio_importador or not borrador.domicilio_importador.strip():
            datos_faltantes.append(
                "Falta indicar el domicilio fiscal o legal del importador (obligatorio para producto importado)"
            )

    motivos_incompleta: List[str] = []
    if borrador.tabla_marcada_incompleta:
        motivos_incompleta.append(
            "La tabla nutricional está marcada expresamente como incompleta"
        )
    else:
        from sqlalchemy.orm import object_session
        sess = object_session(borrador)
        if sess is not None:
            from src.nutricion.models import InformacionNutricionalProducto
            info_nut = sess.scalar(
                select(InformacionNutricionalProducto).where(
                    InformacionNutricionalProducto.producto_id == borrador.producto_id
                )
            )
            if info_nut and getattr(info_nut, "es_incompleta", False):
                motivos_incompleta.append(
                    "La tabla nutricional del producto está marcada como incompleta por ingredientes con datos faltantes"
                )

    if not borrador.porcion or not borrador.porcion.strip():
        motivos_incompleta.append("Falta indicar el tamaño de porción de referencia")

    if borrador.valor_energetico_kcal is None:
        motivos_incompleta.append("Falta el valor energético (kcal)")
    if borrador.carbohidratos is None:
        motivos_incompleta.append("Falta declarar carbohidratos (g)")
    if borrador.proteinas is None:
        motivos_incompleta.append("Falta declarar proteínas (g)")
    if borrador.grasas_totales is None:
        motivos_incompleta.append("Falta declarar grasas totales (g)")
    if borrador.sodio is None:
        motivos_incompleta.append("Falta declarar sodio (mg)")

    tabla_incompleta = len(motivos_incompleta) > 0
    if tabla_incompleta:
        datos_faltantes.append(
            "La tabla de información nutricional está incompleta o faltan nutrientes obligatorios"
        )

    campos_totales = 13 if borrador.es_importado else 11
    faltantes_count = len(datos_faltantes)
    completados = max(0, campos_totales - faltantes_count)
    porcentaje_completitud = int(round((completados / campos_totales) * 100))
    es_completo = (faltantes_count == 0) and not tabla_incompleta

    return (
        datos_faltantes,
        tabla_incompleta,
        motivos_incompleta,
        es_completo,
        porcentaje_completitud,
        campos_totales,
        completados,
    )


def generar_filas_tabla_nutricional(
    borrador: BorradorRotulo,
) -> List[schemas.FilaTablaNutricional]:
    def _fmt(val: Optional[float], unidad: str = "g") -> Optional[str]:
        if val is None:
            return None
        return f"{val:.1f} {unidad}" if val != int(val) else f"{int(val)} {unidad}"

    def _calc_vd(val: Optional[float], ref: float) -> Optional[str]:
        if val is None or ref <= 0:
            return None
        pct = (val / ref) * 100.0
        return f"{round(pct)} %"

    from sqlalchemy.orm import object_session
    from src.nutricion.constants import NUTRIENTES_DEFECTO_CAA
    from src.nutricion.services import listar_parametros as listar_parametros_nutricion

    vdr_map: Dict[str, Optional[float]] = {
        p["nutriente"]: p.get("vdr") for p in NUTRIENTES_DEFECTO_CAA
    }
    sess_vdr = object_session(borrador)
    if sess_vdr is not None:
        for p_db in listar_parametros_nutricion(sess_vdr):
            vdr_map[p_db.nutriente] = p_db.vdr

    def _vdr(clave: str) -> float:
        val_r = vdr_map.get(clave)
        return float(val_r) if val_r is not None else 0.0

    import re as _re
    tamano_porcion_g: Optional[float] = None
    if borrador.producto is not None and getattr(borrador.producto, "tamano_porcion_g", None):
        tamano_porcion_g = float(borrador.producto.tamano_porcion_g)
    elif borrador.porcion:
        m_porc = _re.search(r"(\d+(?:[.,]\d+)?)", str(borrador.porcion))
        if m_porc:
            try:
                tamano_porcion_g = float(m_porc.group(1).replace(",", "."))
            except ValueError:
                tamano_porcion_g = None
    factor_porcion = (tamano_porcion_g / 100.0) if (tamano_porcion_g and tamano_porcion_g > 0) else 1.0

    from src.nutricion.models import InformacionNutricionalProducto

    info_nut_db = (
        sess_vdr.scalar(
            select(InformacionNutricionalProducto).where(
                InformacionNutricionalProducto.producto_id == borrador.producto_id
            )
        )
        if sess_vdr is not None
        else None
    )

    def _v100(val_porc: Optional[float], campo_100g: str, dec: int = 1) -> Optional[float]:
        if info_nut_db is not None:
            v_db = getattr(info_nut_db, campo_100g, None)
            if v_db is not None:
                return round(float(v_db), dec)
        if val_porc is None:
            return None
        return round(val_porc / factor_porcion, dec)

    filas: List[schemas.FilaTablaNutricional] = []

    kcal = borrador.valor_energetico_kcal
    kj = borrador.valor_energetico_kj
    kcal_100 = round(_v100(kcal, "energia_kcal_100g", 0)) if _v100(kcal, "energia_kcal_100g", 0) is not None else None
    kj_100 = round(_v100(kj, "energia_kj_100g", 0)) if _v100(kj, "energia_kj_100g", 0) is not None else None
    texto_kcal_100 = f"{kcal_100} kcal" if kcal_100 is not None else None
    if kcal_100 is not None and kj_100 is not None:
        texto_kcal_100 = f"{kcal_100} kcal / {kj_100} kJ"
    texto_kcal_p = f"{round(kcal)} kcal" if kcal is not None else None
    if kcal is not None and kj is not None:
        texto_kcal_p = f"{round(kcal)} kcal / {round(kj)} kJ"
    vd_kcal = _calc_vd(kcal, _vdr("energia_kcal"))
    filas.append(
        schemas.FilaTablaNutricional(
            nutriente="Valor energético",
            por_100g=texto_kcal_100,
            por_porcion=texto_kcal_p,
            porcentaje_vd=vd_kcal,
            es_subitem=False,
        )
    )

    carb = borrador.carbohidratos
    filas.append(
        schemas.FilaTablaNutricional(
            nutriente="Carbohidratos",
            por_100g=_fmt(_v100(carb, "carbohidratos_100g")),
            por_porcion=_fmt(carb),
            porcentaje_vd=_calc_vd(carb, _vdr("carbohidratos")),
            es_subitem=False,
        )
    )

    az_tot = borrador.azucares_totales
    if az_tot is not None:
        filas.append(
            schemas.FilaTablaNutricional(
                nutriente="Azúcares totales",
                por_100g=_fmt(_v100(az_tot, "azucares_totales_100g")),
                por_porcion=_fmt(az_tot),
                porcentaje_vd=None,
                es_subitem=True,
            )
        )

    az_anad = borrador.azucares_anadidos
    if az_anad is not None:
        filas.append(
            schemas.FilaTablaNutricional(
                nutriente="Azúcares añadidos",
                por_100g=_fmt(_v100(az_anad, "azucares_anadidos_100g")),
                por_porcion=_fmt(az_anad),
                porcentaje_vd=_calc_vd(az_anad, _vdr("azucares_anadidos")),
                es_subitem=True,
            )
        )

    prot = borrador.proteinas
    filas.append(
        schemas.FilaTablaNutricional(
            nutriente="Proteínas",
            por_100g=_fmt(_v100(prot, "proteinas_100g")),
            por_porcion=_fmt(prot),
            porcentaje_vd=_calc_vd(prot, _vdr("proteinas")),
            es_subitem=False,
        )
    )

    gt = borrador.grasas_totales
    filas.append(
        schemas.FilaTablaNutricional(
            nutriente="Grasas totales",
            por_100g=_fmt(_v100(gt, "grasas_totales_100g")),
            por_porcion=_fmt(gt),
            porcentaje_vd=_calc_vd(gt, _vdr("grasas_totales")),
            es_subitem=False,
        )
    )

    gs = borrador.grasas_saturadas
    if gs is not None:
        filas.append(
            schemas.FilaTablaNutricional(
                nutriente="Grasas saturadas",
                por_100g=_fmt(_v100(gs, "grasas_saturadas_100g")),
                por_porcion=_fmt(gs),
                porcentaje_vd=_calc_vd(gs, _vdr("grasas_saturadas")),
                es_subitem=True,
            )
        )

    gtr = borrador.grasas_trans
    if gtr is not None:
        filas.append(
            schemas.FilaTablaNutricional(
                nutriente="Grasas trans",
                por_100g=_fmt(_v100(gtr, "grasas_trans_100g")),
                por_porcion=_fmt(gtr),
                porcentaje_vd=None,
                es_subitem=True,
            )
        )

    fibra = borrador.fibra_alimentaria
    if fibra is not None:
        filas.append(
            schemas.FilaTablaNutricional(
                nutriente="Fibra alimentaria",
                por_100g=_fmt(_v100(fibra, "fibra_alimentaria_100g")),
                por_porcion=_fmt(fibra),
                porcentaje_vd=_calc_vd(fibra, _vdr("fibra_alimentaria")),
                es_subitem=False,
            )
        )

    sodio = borrador.sodio
    filas.append(
        schemas.FilaTablaNutricional(
            nutriente="Sodio",
            por_100g=_fmt(_v100(sodio, "sodio_mg_100g", 0), "mg"),
            por_porcion=_fmt(sodio, "mg"),
            porcentaje_vd=_calc_vd(sodio, _vdr("sodio_mg")),
            es_subitem=False,
        )
    )

    return filas


def calcular_declaracion_alergenos(db: Session, producto_id: int) -> dict:
    """
    Analiza la receta vigente del producto (CONTIENE) y los alérgenos de precaución
    configurados en el producto (PUEDE CONTENER) para armar las leyendas de rotulado.
    """
    from src.recetas.models import Receta

    receta = db.scalar(
        select(Receta).where(Receta.id_producto == producto_id, Receta.activo == True)
    )
    producto = db.get(Producto, producto_id)

    alergenos_encontrados = set()
    contiene_gluten = False

    if receta and receta.version_vigente:
        for detalle in receta.version_vigente.detalles:
            tipo_insumo = getattr(detalle, "tipo_insumo", None)
            if tipo_insumo and hasattr(tipo_insumo, "alergenos"):
                for alg in tipo_insumo.alergenos:
                    if alg and alg.nombre:
                        nombre_alg = alg.nombre.strip().upper()
                        alergenos_encontrados.add(nombre_alg)
                        if "GLUTEN" in nombre_alg or "TRIGO" in nombre_alg:
                            contiene_gluten = True

            insumo = getattr(detalle, "insumo", None)
            if insumo:
                if getattr(insumo, "contiene_gluten", False):
                    contiene_gluten = True
                for alg in getattr(insumo, "alergenos", []):
                    if alg and alg.nombre:
                        alergenos_encontrados.add(alg.nombre.strip().upper())

    # Alérgenos de precaución / contaminación cruzada configurados en Producto
    precaucion_encontrados = set()
    if producto and hasattr(producto, "alergenos_precaucion"):
        for alg in producto.alergenos_precaucion or []:
            if alg and alg.nombre:
                nombre_alg = alg.nombre.strip().upper()
                # Si ya está declarado como CONTIENE, no hace falta repetirlo en PUEDE CONTENER
                if nombre_alg not in alergenos_encontrados:
                    precaucion_encontrados.add(nombre_alg)

    elementos_contiene = sorted(list(alergenos_encontrados))
    elementos_puede_contener = sorted(list(precaucion_encontrados))

    if elementos_contiene:
        texto_contiene = f"CONTIENE: {', '.join(elementos_contiene)}."
    else:
        texto_contiene = "SIN ALÉRGENOS DECLARADOS."

    texto_puede_contener = (
        f"PUEDE CONTENER: {', '.join(elementos_puede_contener)}."
        if elementos_puede_contener
        else None
    )

    return {
        "contiene_gluten": contiene_gluten,
        "alergenos_lista": elementos_contiene,
        "texto_contiene_alergenos": texto_contiene,
        "puede_contener_lista": elementos_puede_contener,
        "texto_puede_contener": texto_puede_contener,
    }

def mapear_respuesta_borrador(
    db: Session, borrador: BorradorRotulo, lista: Optional[ListaIngredientesRotulo]
) -> schemas.BorradorRotuloResponse:
    prod_nom = borrador.producto.nombre if borrador.producto else ""
    texto_ingredientes = (
        lista.texto_rotulo if lista and lista.texto_rotulo else None
    )

    info_alergenos = calcular_declaracion_alergenos(db, borrador.producto_id)
    tiene_ingr = bool(lista and lista.items and len(lista.items) > 0)

    octogonos, tiene_oct, msg_oct = calcular_octogonos_e12(borrador, lista)
    faltantes, tabla_inc, motivos_inc, es_compl, pct, tot, comp = (
        detectar_datos_faltantes_y_tabla(borrador, lista)
    )
    filas_nutri = generar_filas_tabla_nutricional(borrador)

    return schemas.BorradorRotuloResponse(
        id=borrador.id,
        producto_id=borrador.producto_id,
        producto_nombre=prod_nom,
        denominacion_venta=borrador.denominacion_venta,
        contenido_neto=borrador.contenido_neto,
        rnpa_rppa=borrador.rnpa_rppa,
        rne=borrador.rne,
        razon_social=borrador.razon_social,
        direccion_origen=borrador.direccion_origen,
        pais_origen=borrador.pais_origen,
        es_importado=borrador.es_importado,
        razon_social_importador=borrador.razon_social_importador,
        domicilio_importador=borrador.domicilio_importador,
        lote=borrador.lote,
        fecha_duracion=borrador.fecha_duracion,
        instrucciones_conservacion=borrador.instrucciones_conservacion,
        modo_empleo=borrador.modo_empleo,
        lista_ingredientes_texto=texto_ingredientes,
        tiene_lista_ingredientes=tiene_ingr,
        texto_alergenos=info_alergenos["texto_contiene_alergenos"],
        texto_puede_contener=info_alergenos["texto_puede_contener"],
        porcion=borrador.porcion,
        porciones_por_envase=borrador.porciones_por_envase,
        valor_energetico_kcal=borrador.valor_energetico_kcal,
        valor_energetico_kj=borrador.valor_energetico_kj,
        carbohidratos=borrador.carbohidratos,
        azucares_totales=borrador.azucares_totales,
        azucares_anadidos=borrador.azucares_anadidos,
        proteinas=borrador.proteinas,
        grasas_totales=borrador.grasas_totales,
        grasas_saturadas=borrador.grasas_saturadas,
        grasas_trans=borrador.grasas_trans,
        fibra_alimentaria=borrador.fibra_alimentaria,
        sodio=borrador.sodio,
        tabla_marcada_incompleta=borrador.tabla_marcada_incompleta,
        tiene_exceso_azucares=borrador.tiene_exceso_azucares,
        tiene_exceso_sodio=borrador.tiene_exceso_sodio,
        tiene_exceso_grasas_saturadas=borrador.tiene_exceso_grasas_saturadas,
        tiene_exceso_grasas_totales=borrador.tiene_exceso_grasas_totales,
        tiene_exceso_calorias=borrador.tiene_exceso_calorias,
        contiene_edulcorantes=borrador.contiene_edulcorantes,
        contiene_cafeina=borrador.contiene_cafeina,
        modo_calculo_octogonos=borrador.modo_calculo_octogonos,
        lote_editado_manualmente=borrador.lote_editado_manualmente,
        ingredientes_editado_manualmente=borrador.ingredientes_editado_manualmente,
        denominacion_editada_manualmente=borrador.denominacion_editada_manualmente,
        contenido_neto_editado_manualmente=borrador.contenido_neto_editado_manualmente,
        sellos_editados_manualmente=borrador.sellos_editados_manualmente,
        tabla_editada_manualmente=borrador.tabla_editada_manualmente,
        porcentaje_completitud=pct,
        campos_obligatorios_totales=tot,
        campos_obligatorios_completados=comp,
        octogonos=octogonos,
        tiene_octogonos=tiene_oct,
        mensaje_octogonos=msg_oct,
        datos_faltantes=faltantes,
        tabla_nutricional_incompleta=tabla_inc,
        motivos_tabla_incompleta=motivos_inc,
        filas_tabla_nutricional=filas_nutri,
        leyenda_obligatoria=LEYENDA_BORRADOR_OBLIGATORIA,
        es_completo_para_tramite=es_compl,
        actualizado_el=borrador.actualizado_el,
        usuario_actualizacion=borrador.usuario_actualizacion,
        fecha_ultima_exportacion_pdf=borrador.fecha_ultima_exportacion_pdf,
        version_receta_exportada=borrador.version_receta_exportada,
    )


def exportar_borrador(
    db: Session, producto_id: int, req: schemas.ExportarBorradorRequest
) -> schemas.ExportarBorradorResponse:
    if not req.incluir_leyenda:
        raise exceptions.ExportacionSinLeyendaError()

    borrador = obtener_o_crear_borrador(db, producto_id)
    lista = obtener_lista_rotulo(db, producto_id)
    datos_rotulo = mapear_respuesta_borrador(db, borrador, lista)

    # Obtenemos el texto formateado de alérgenos calculados a partir de la receta vigente
    info_alergenos = calcular_declaracion_alergenos(db, producto_id)
    alergenos_html = f'<div style="margin-top: 6px; font-weight: 800; text-transform: uppercase;">{info_alergenos["texto_contiene_alergenos"]}</div>'
    if info_alergenos.get("texto_puede_contener"):
        alergenos_html += f'<div style="margin-top: 4px; font-weight: 700; text-transform: uppercase;">{info_alergenos["texto_puede_contener"]}</div>'

    octogonos_html = ""
    if datos_rotulo.tiene_octogonos:
        bloques = []
        for o in datos_rotulo.octogonos:
            if o.tipo == "micro_sello":
                bloques.append(
                    f'<div style="background:#000;color:#fff;border:2px solid #fff;border-radius:4px;padding:6px 12px;font-size:11px;font-weight:800;letter-spacing:0.5px;text-align:center;max-width:220px;margin:4px;">{o.texto}</div>'
                )
            else:
                bloques.append(
                    f'<div style="background:#000;color:#fff;border:3px solid #fff;border-radius:12px;padding:12px 14px;font-size:13px;font-weight:900;letter-spacing:0.5px;text-align:center;width:110px;height:110px;display:flex;align-items:center;justify-content:center;margin:4px;box-shadow:0 2px 6px rgba(0,0,0,0.4);">{o.texto}</div>'
                )
        octogonos_html = f'<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:16px 0;">{"".join(bloques)}</div>'
    else:
        octogonos_html = f'<div style="background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;padding:8px 14px;border-radius:6px;font-size:12px;margin:12px 0;text-align:center;">{MENSAJE_SIN_OCTOGONOS}</div>'

    filas_nutri_html = ""
    for f in datos_rotulo.filas_tabla_nutricional:
        sub = (
            "padding-left:20px;font-style:italic;"
            if f.es_subitem
            else "font-weight:600;"
        )
        filas_nutri_html += f"""
        <tr>
            <td style="border:1px solid #cbd5e1;padding:6px 10px;{sub}">{f.nutriente}</td>
            <td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:right;">{f.por_porcion or '-'}</td>
            <td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:right;">{f.porcentaje_vd or '-'}</td>
        </tr>
        """

    tabla_nutri_html = f"""
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;">
        <thead>
            <tr style="background:#f1f5f9;">
                <th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:left;">Nutriente</th>
                <th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:right;">Por porción</th>
                <th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:right;">% VD*</th>
            </tr>
        </thead>
        <tbody>{filas_nutri_html}</tbody>
    </table>
    <div style="font-size:10px;color:#64748b;margin-top:4px;">* Valores Diarios con base a una dieta de 2.000 kcal u 8.400 kJ.</div>
    """

    ingredientes_html = (
        datos_rotulo.lista_ingredientes_texto
        or "Lista de ingredientes no definida."
    )

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Borrador de Rótulo - {datos_rotulo.producto_nombre}</title>
<style>
* {{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }}
body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 20px; color: #1e293b; background: #fff; }}
.watermark {{ position: fixed; top: 45%; left: 10%; transform: rotate(-30deg); font-size: 42px; font-weight: 900; color: rgba(220, 38, 38, 0.12); pointer-events: none; z-index: 1000; border: 4px dashed rgba(220, 38, 38, 0.2); padding: 10px 30px; }}
.banner-borrador {{ background: #fef2f2; border: 2px solid #ef4444; color: #b91c1c; padding: 12px 18px; border-radius: 8px; font-weight: 800; font-size: 13px; text-align: center; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px; }}
.rotulo-card {{ border: 2px solid #000; border-radius: 10px; padding: 24px; max-width: 780px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }}
.rotulo-header {{ text-align: center; border-bottom: 2px solid #000; padding-bottom: 14px; margin-bottom: 16px; }}
.denominacion {{ font-size: 18px; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; }}
.nombre-fantasia {{ font-size: 26px; font-weight: 900; color: #0f172a; margin-bottom: 8px; }}
.neto {{ font-size: 15px; font-weight: 700; }}
.grid-rotulo {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 16px; }}
.seccion-titulo {{ font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px; }}
.texto-regular {{ font-size: 12px; line-height: 1.5; color: #334155; }}
.footer-borrador {{ margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center; font-size: 11px; color: #64748b; }}
@media print {{
  body {{ margin: 10mm; background: #fff; }}
  .rotulo-card {{ box-shadow: none; border: 2px solid #000; }}
  .banner-borrador {{ border: 2px solid #ef4444; background: #fef2f2 !important; color: #b91c1c !important; }}
}}
</style>
</head>
<body>
<div class="watermark">BORRADOR NO COMERCIAL</div>
<div class="banner-borrador">
    ⚠️ {LEYENDA_BORRADOR_OBLIGATORIA}
</div>
<div class="rotulo-card">
    <div class="rotulo-header">
        <div class="nombre-fantasia">{datos_rotulo.producto_nombre}</div>
        <div class="denominacion">{datos_rotulo.denominacion_venta or datos_rotulo.producto_nombre}</div>
        <div class="neto">CONTENIDO NETO: {datos_rotulo.contenido_neto or 'No especificado'}</div>
        {octogonos_html}
    </div>
    <div class="grid-rotulo">
        <div>
            <div class="seccion-titulo">Información del Producto</div>
            <div class="texto-regular">
                <strong>Ingredientes:</strong> {ingredientes_html}<br>
                {alergenos_html}<br>
                <strong>Elaborado por:</strong> {datos_rotulo.razon_social or 'No especificada'}<br>
                <strong>Dirección:</strong> {datos_rotulo.direccion_origen or 'No especificada'}<br>
                <strong>Origen:</strong> {datos_rotulo.pais_origen}<br>
                <strong>RNE:</strong> {datos_rotulo.rne or 'Trámite pendiente'}<br>
                <strong>RNPA/RPPA:</strong> {datos_rotulo.rnpa_rppa or 'Trámite pendiente'}<br>
                {f"<strong>Importador:</strong> {datos_rotulo.razon_social_importador or 'No declarado'}<br><strong>Domicilio importador:</strong> {datos_rotulo.domicilio_importador or 'No declarado'}<br>" if datos_rotulo.es_importado else ""}
                <strong>Lote:</strong> {datos_rotulo.lote or 'Sin lote'}<br>
                <strong>Duración:</strong> {datos_rotulo.fecha_duracion or 'Ver envase'}<br>
                <strong>Conservación:</strong> {datos_rotulo.instrucciones_conservacion or 'Lugar fresco y seco'}
            </div>
        </div>
        <div>
            <div class="seccion-titulo">Información Nutricional</div>
            <div class="texto-regular">
                Porción: {datos_rotulo.porcion or 'No indicada'} | Porciones por envase: {datos_rotulo.porciones_por_envase or 'No indicadas'}
            </div>
            {tabla_nutri_html}
        </div>
    </div>
    <div class="footer-borrador">
        Documento generado automáticamente por SAIA · {datetime.now().strftime('%d/%m/%Y %H:%M')}<br>
        <strong>{LEYENDA_BORRADOR_OBLIGATORIA}</strong>
    </div>
</div>
</body>
</html>"""

    return schemas.ExportarBorradorResponse(
        producto_id=producto_id,
        producto_nombre=datos_rotulo.producto_nombre,
        contenido_html=html,
        leyenda_incluida=True,
        timestamp=datetime.now(),
    )


def generar_pdf_borrador_rotulo(
    db: Session,
    producto_id: int,
    usuario: Optional[Personal] = None,
) -> bytes:
    from src.rotulado.pdf import armar_pdf_borrador, validar_sin_menciones_aprobacion
    from src.nutricion.services import resolver_receta_para_producto, normalizar_a_gramos
    from src.recetas.services import convertir_detalle_a_gramos
    from src.recetas.models import Receta, VersionReceta, RecetaDetalle
    from src.insumos.models import Insumo
    from src.rotulado_frontal.models import ConjuntoParametrosRotulado
    from src.rotulado_frontal.constants import EstadoConjunto

    borrador = obtener_o_crear_borrador(db, producto_id)
    lista = obtener_lista_rotulo(db, producto_id)
    datos_rotulo = mapear_respuesta_borrador(db, borrador, lista)

    # Validar que no haya menciones de aprobación o certificación
    validar_sin_menciones_aprobacion([
        datos_rotulo.producto_nombre,
        datos_rotulo.denominacion_venta or "",
        datos_rotulo.lista_ingredientes_texto or "",
    ])

    fecha_emision = datetime.now()
    nom_usuario = (
        f"{usuario.nombre} {usuario.apellido}"
        if usuario and getattr(usuario, "nombre", None)
        else (getattr(usuario, "usuario", None) or "Administrador")
    )

    receta_info: Dict[str, Any] = {
        "id": None,
        "nombre": "Sin receta asignada",
        "version": 1,
        "fecha_creacion": fecha_emision.strftime("%d/%m/%Y"),
        "rendimiento_final": 0.0,
        "peso_total_ingredientes": 0.0,
        "factor_rendimiento": 1.0,
    }
    composicion_ingredientes: List[Dict[str, Any]] = []
    fuentes_ingredientes: List[Dict[str, Any]] = []

    try:
        receta = resolver_receta_para_producto(db, borrador.producto, None)
    except Exception:
        receta = None

    if receta:
        version = receta.version_actual
        receta_info["id"] = receta.id
        receta_info["nombre"] = receta.nombre
        receta_info["version"] = version.version if version else 1
        f_creac = version.creado_el if version and version.creado_el else receta.fecha_creacion
        receta_info["fecha_creacion"] = f_creac.strftime("%d/%m/%Y") if f_creac else "-"

        rend_final = (
            version.rendimiento_final
            if version and version.rendimiento_final and version.rendimiento_final > 0
            else (receta.rendimiento_final or 0.0)
        )
        receta_info["rendimiento_final"] = rend_final

        detalles: List[RecetaDetalle] = version.detalles if version else []
        peso_total_g = 0.0
        items_temp = []

        for det in detalles:
            det_ing_id = getattr(det, "ingrediente_id", None)
            insumo = db.get(Insumo, det_ing_id) if det_ing_id else None
            tipo_obj = det.tipo_insumo
            adit_obj = det.aditivo
            if not insumo and not tipo_obj and not adit_obj:
                continue

            cant_g_calc, _ = convertir_detalle_a_gramos(db, det)
            cant_g = (
                cant_g_calc
                if cant_g_calc is not None
                else normalizar_a_gramos(det.cantidad, det.unidad_medida)
            )
            peso_total_g += cant_g

            tipo_desc = "Insumo base"
            if det.es_aditivo or adit_obj:
                func_t = det.clase_funcional or (adit_obj.clase_funcional if adit_obj else None) or "Aditivo tecnológico"
                ins_num = det.numero_ins or (adit_obj.numero_ins if adit_obj else None) or ""
                tipo_desc = f"Aditivo: {func_t} {f'(INS {ins_num})' if ins_num else ''}".strip()
            elif tipo_obj:
                tipo_desc = tipo_obj.nombre or "Materia prima"

            fuente = None
            fuente_det = None
            for entidad in (tipo_obj, adit_obj, insumo):
                if entidad is not None:
                    f_val = getattr(entidad, "fuente_datos", None)
                    if f_val and str(f_val).strip():
                        fuente = str(f_val).strip()
                        fuente_det = getattr(entidad, "fuente_detalle", None) or getattr(entidad, "alimento_referencia_id", None)
                        break

            items_temp.append({
                "nombre": det.nombre,
                "cantidad": det.cantidad,
                "unidad_medida": det.unidad_medida,
                "peso_gramos": cant_g,
                "tipo": tipo_desc,
                "fuente_datos": fuente or "Código Alimentario Argentino (CAA)",
                "fuente_detalle": fuente_det or "-",
            })

        receta_info["peso_total_ingredientes"] = round(peso_total_g / 1000.0, 3) if peso_total_g >= 1000 else round(peso_total_g, 2)
        factor_r = round(rend_final / peso_total_g, 4) if (peso_total_g > 0 and rend_final > 0) else 1.0
        receta_info["factor_rendimiento"] = factor_r

        for it in items_temp:
            pct = (it["peso_gramos"] / peso_total_g * 100.0) if peso_total_g > 0 else 0.0
            it["porcentaje"] = pct
            composicion_ingredientes.append(it)
            fuentes_ingredientes.append({
                "nombre": it["nombre"],
                "fuente_datos": it["fuente_datos"],
                "fuente_detalle": it["fuente_detalle"],
            })

        composicion_ingredientes.sort(key=lambda x: x["peso_gramos"], reverse=True)

    from src.rotulado_frontal.services import (
        modulo_activo as modulo_octogonos_activo,
        ultimo_calculo as obtener_ultimo_calculo_sellos,
        calcular_desde_nutricion_producto,
    )

    octogonos_habilitados = modulo_octogonos_activo(db)
    producto_aplica = bool(getattr(borrador.producto, "aplica_rotulado", True))
    detalles_sellos: List[Dict[str, str]] = []

    if not octogonos_habilitados:
        version_normativa = "Módulo de octógonos desactivado en Configuración"
        datos_rotulo.octogonos = []
        datos_rotulo.mostrar_octogonos = False
    elif not producto_aplica:
        version_normativa = "Producto exceptuado de rotulado frontal"
        datos_rotulo.octogonos = []
        datos_rotulo.mostrar_octogonos = False
    else:
        calculo_guardado = obtener_ultimo_calculo_sellos(db, producto_id)
        if calculo_guardado is None:
            try:
                calculo_guardado = calcular_desde_nutricion_producto(db, producto_id, usuario=usuario)
            except Exception:
                calculo_guardado = None

        if calculo_guardado is not None:
            norma_origen = getattr(calculo_guardado, "norma_origen", None) or "Ley 27.642"
            version_normativa = f"Versión {calculo_guardado.version_parametros} ({norma_origen})"
            pasos_calc = calculo_guardado.pasos or []
            if pasos_calc:
                for p in pasos_calc:
                    aplica_p = bool(p.get("aplica"))
                    supera_p = bool(p.get("supera"))
                    resultado_txt = (
                        "SUPERADO (Sello)" if supera_p else ("No supera" if aplica_p else "No aplica")
                    )
                    detalles_sellos.append({
                        "nutriente": str(p.get("criterio") or p.get("leyenda") or "-"),
                        "criterio": str(p.get("detalle_agregado") or "-"),
                        "valor": str(p.get("calculo_realizado") or "-"),
                        "umbral": str(p.get("umbral") or "-"),
                        "resultado": resultado_txt,
                    })
            else:
                for d in (calculo_guardado.resultado or []):
                    supera_d = bool(d.get("aplica"))
                    detalles_sellos.append({
                        "nutriente": str(d.get("leyenda") or d.get("codigo") or "-"),
                        "criterio": str(d.get("motivo") or "-"),
                        "valor": "-",
                        "umbral": "-",
                        "resultado": "SUPERADO (Sello)" if supera_d else "No supera",
                    })
        else:
            conjunto_vigente = db.scalar(
                select(ConjuntoParametrosRotulado)
                .where(ConjuntoParametrosRotulado.estado == EstadoConjunto.PUBLICADO)
                .order_by(ConjuntoParametrosRotulado.fecha_vigencia.desc())
                .limit(1)
            )
            if conjunto_vigente:
                version_normativa = f"Versión {conjunto_vigente.version} ({conjunto_vigente.norma_origen or 'Ley 27.642'})"
            else:
                version_normativa = "Sin cálculo de sellos registrado"

        detalles_sellos.extend([
            {
                "nutriente": "Edulcorantes",
                "criterio": "Presencia de edulcorantes añadidos",
                "valor": "Detectado" if borrador.contiene_edulcorantes else "No detectado",
                "umbral": "Presencia",
                "resultado": "APLICA LEYENDA" if borrador.contiene_edulcorantes else "No aplica",
            },
            {
                "nutriente": "Cafeína",
                "criterio": "Presencia de cafeína añadida",
                "valor": "Detectado" if borrador.contiene_cafeina else "No detectado",
                "umbral": "Presencia",
                "resultado": "APLICA LEYENDA" if borrador.contiene_cafeina else "No aplica",
            },
        ])

    calculo_sellos = {
        "version_normativa": version_normativa,
        "detalles": detalles_sellos,
    }

    pdf_bytes = armar_pdf_borrador(
        datos_rotulo=datos_rotulo,
        receta_info=receta_info,
        composicion_ingredientes=composicion_ingredientes,
        fuentes_ingredientes=fuentes_ingredientes,
        calculo_sellos=calculo_sellos,
        usuario_nombre=nom_usuario,
        fecha_emision=fecha_emision,
    )

    borrador.fecha_ultima_exportacion_pdf = fecha_emision
    borrador.version_receta_exportada = receta_info["version"]
    borrador.usuario_actualizacion = getattr(usuario, "usuario", None) or nom_usuario
    db.commit()

    return pdf_bytes

