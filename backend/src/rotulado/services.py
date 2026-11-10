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


def obtener_lista_rotulo(
    db: Session, producto_id: int
) -> Optional[ListaIngredientesRotulo]:
    obtener_producto_o_404(db, producto_id)
    consulta = select(ListaIngredientesRotulo).where(
        ListaIngredientesRotulo.producto_id == producto_id
    )
    return db.scalars(consulta).first()


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
    producto = obtener_producto_o_404(db, producto_id)

    if lote_id is not None:
        lote = db.get(LoteProduccion, lote_id)
        if lote is None or lote.producto_id != producto_id:
            raise exceptions.SinLotesDisponibles()
    else:
        consulta_lote = (
            select(LoteProduccion)
            .where(LoteProduccion.producto_id == producto_id)
            .order_by(LoteProduccion.fecha.desc(), LoteProduccion.id.desc())
        )
        lote = db.scalars(consulta_lote).first()

    if lote is None or not lote.insumos:
        raise exceptions.SinLotesDisponibles()

    total_cant = sum(float(il.cantidad) for il in lote.insumos)
    if total_cant <= 0:
        raise exceptions.PorcentajeInvalido()

    items_create = []
    for il in lote.insumos:
        insumo = il.insumo
        nombre_insumo = insumo.nombre if insumo else "Insumo"
        pct = round((float(il.cantidad) / total_cant) * 100.0, 2)
        if pct <= 0:
            pct = 0.01

        es_adit = any(
            w in nombre_insumo.lower()
            for w in ["aditivo", "esencia", "colorante", "conservante", "polvo de hornear", "lecitina"]
        )
        funcion_sugerida = None
        es_aroma = False
        if "esencia" in nombre_insumo.lower() or "vainilla" in nombre_insumo.lower():
            funcion_sugerida = "Aromatizante"
            es_aroma = True
            es_adit = True
        elif "polvo de hornear" in nombre_insumo.lower():
            funcion_sugerida = "Leudante químico"
            es_adit = True

        items_create.append(
            schemas.ItemIngredienteCreate(
                nombre=nombre_insumo,
                denominacion_rotulo=nombre_insumo,
                porcentaje=pct,
                es_aditivo=es_adit,
                funcion=funcion_sugerida,
                numero_ins=None,
                es_aromatizante=es_aroma,
            )
        )

    req = schemas.PrevisualizarOrdenRequest(
        formato_aditivos=FormatoDeclaracionAditivos.INS_Y_NOMBRE,
        items=items_create,
    )
    return previsualizar_orden(req)


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


def obtener_o_crear_borrador(
    db: Session, producto_id: int
) -> BorradorRotulo:
    producto = obtener_producto_o_404(db, producto_id)
    borrador = (
        db.query(BorradorRotulo)
        .filter(BorradorRotulo.producto_id == producto_id)
        .first()
    )
    if borrador:
        return borrador

    u_lote = (
        db.query(LoteProduccion)
        .filter(LoteProduccion.producto_id == producto_id)
        .order_by(LoteProduccion.fecha.desc(), LoteProduccion.id.desc())
        .first()
    )
    cod_lote = u_lote.codigo if u_lote else "L-001"
    unidad_str = (
        producto.unidadMedida.value
        if hasattr(producto.unidadMedida, "value")
        else str(producto.unidadMedida)
    )

    nuevo_borrador = BorradorRotulo(
        producto_id=producto_id,
        denominacion_venta=producto.nombre,
        contenido_neto=f"1 {unidad_str}",
        rnpa_rppa=None,
        rne=None,
        razon_social="SAIA Alimentos S.A.",
        direccion_origen="Parque Industrial Trelew, Chubut, Argentina",
        pais_origen="Industria Argentina",
        lote=cod_lote,
        fecha_duracion="Consumir preferentemente antes de la fecha indicada en el envase",
        instrucciones_conservacion="Conservar en lugar fresco, seco y protegido de la luz directa",
        modo_empleo=None,
        porcion=None,
        porciones_por_envase=None,
        tabla_marcada_incompleta=False,
        modo_calculo_octogonos="automatico",
    )
    db.add(nuevo_borrador)
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
    for k, v in payload.items():
        setattr(borrador, k, v)
    borrador.usuario_actualizacion = _obtener_nombre_usuario(usuario)
    borrador.actualizado_el = datetime.now()
    db.commit()
    db.refresh(borrador)
    return borrador


def calcular_octogonos_e12(
    borrador: BorradorRotulo, lista: Optional[ListaIngredientesRotulo]
) -> tuple[List[schemas.OctogonoItem], bool, str]:
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

        exceso_az = (
            (az_anad * 4 >= kcal * 0.10) if (kcal > 0 and az_anad > 0) else False
        )
        exceso_gt = (
            (gt * 9 >= kcal * 0.30) if (kcal > 0 and gt > 0) else False
        )
        exceso_gs = (
            (gs * 9 >= kcal * 0.10) if (kcal > 0 and gs > 0) else False
        )
        exceso_sodio = (
            ((sodio_mg >= kcal and kcal > 0) or (sodio_mg >= 300))
            if sodio_mg > 0
            else False
        )
        exceso_cal = (
            (kcal >= 275 and (exceso_az or exceso_gt or exceso_gs))
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
) -> tuple[List[str], bool, List[str], bool]:
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

    if not borrador.lote or not borrador.lote.strip():
        datos_faltantes.append("Falta indicar la identificación del lote")

    if not borrador.fecha_duracion or not borrador.fecha_duracion.strip():
        datos_faltantes.append("Falta indicar la fecha de duración o vencimiento")

    motivos_incompleta: List[str] = []
    if borrador.tabla_marcada_incompleta:
        motivos_incompleta.append(
            "La tabla nutricional está marcada expresamente como incompleta"
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

    es_completo = len(datos_faltantes) == 0 and not tabla_incompleta
    return datos_faltantes, tabla_incompleta, motivos_incompleta, es_completo


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

    filas: List[schemas.FilaTablaNutricional] = []

    kcal = borrador.valor_energetico_kcal
    kj = borrador.valor_energetico_kj
    texto_kcal = f"{int(kcal)} kcal" if kcal is not None else None
    if kcal is not None and kj is not None:
        texto_kcal = f"{int(kcal)} kcal / {int(kj)} kJ"
    vd_kcal = _calc_vd(kcal, 2000.0)
    filas.append(
        schemas.FilaTablaNutricional(
            nutriente="Valor energético",
            por_100g=texto_kcal,
            por_porcion=texto_kcal,
            porcentaje_vd=vd_kcal,
            es_subitem=False,
        )
    )

    carb = borrador.carbohidratos
    filas.append(
        schemas.FilaTablaNutricional(
            nutriente="Carbohidratos",
            por_100g=_fmt(carb),
            por_porcion=_fmt(carb),
            porcentaje_vd=_calc_vd(carb, 300.0),
            es_subitem=False,
        )
    )

    az_tot = borrador.azucares_totales
    if az_tot is not None:
        filas.append(
            schemas.FilaTablaNutricional(
                nutriente="Azúcares totales",
                por_100g=_fmt(az_tot),
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
                por_100g=_fmt(az_anad),
                por_porcion=_fmt(az_anad),
                porcentaje_vd=_calc_vd(az_anad, 50.0),
                es_subitem=True,
            )
        )

    prot = borrador.proteinas
    filas.append(
        schemas.FilaTablaNutricional(
            nutriente="Proteínas",
            por_100g=_fmt(prot),
            por_porcion=_fmt(prot),
            porcentaje_vd=_calc_vd(prot, 75.0),
            es_subitem=False,
        )
    )

    gt = borrador.grasas_totales
    filas.append(
        schemas.FilaTablaNutricional(
            nutriente="Grasas totales",
            por_100g=_fmt(gt),
            por_porcion=_fmt(gt),
            porcentaje_vd=_calc_vd(gt, 55.0),
            es_subitem=False,
        )
    )

    gs = borrador.grasas_saturadas
    if gs is not None:
        filas.append(
            schemas.FilaTablaNutricional(
                nutriente="Grasas saturadas",
                por_100g=_fmt(gs),
                por_porcion=_fmt(gs),
                porcentaje_vd=_calc_vd(gs, 22.0),
                es_subitem=True,
            )
        )

    gtr = borrador.grasas_trans
    if gtr is not None:
        filas.append(
            schemas.FilaTablaNutricional(
                nutriente="Grasas trans",
                por_100g=_fmt(gtr),
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
                por_100g=_fmt(fibra),
                por_porcion=_fmt(fibra),
                porcentaje_vd=_calc_vd(fibra, 25.0),
                es_subitem=False,
            )
        )

    sodio = borrador.sodio
    filas.append(
        schemas.FilaTablaNutricional(
            nutriente="Sodio",
            por_100g=_fmt(sodio, "mg"),
            por_porcion=_fmt(sodio, "mg"),
            porcentaje_vd=_calc_vd(sodio, 2000.0),
            es_subitem=False,
        )
    )

    return filas


def mapear_respuesta_borrador(
    borrador: BorradorRotulo, lista: Optional[ListaIngredientesRotulo]
) -> schemas.BorradorRotuloResponse:
    prod_nom = borrador.producto.nombre if borrador.producto else ""
    texto_ingredientes = (
        lista.texto_rotulo if lista and lista.texto_rotulo else None
    )
    tiene_ingr = bool(lista and lista.items and len(lista.items) > 0)

    octogonos, tiene_oct, msg_oct = calcular_octogonos_e12(borrador, lista)
    faltantes, tabla_inc, motivos_inc, es_compl = (
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
        lote=borrador.lote,
        fecha_duracion=borrador.fecha_duracion,
        instrucciones_conservacion=borrador.instrucciones_conservacion,
        modo_empleo=borrador.modo_empleo,
        lista_ingredientes_texto=texto_ingredientes,
        tiene_lista_ingredientes=tiene_ingr,
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
    )


def exportar_borrador(
    db: Session, producto_id: int, req: schemas.ExportarBorradorRequest
) -> schemas.ExportarBorradorResponse:
    if not req.incluir_leyenda:
        raise exceptions.ExportacionSinLeyendaError()

    borrador = obtener_o_crear_borrador(db, producto_id)
    lista = obtener_lista_rotulo(db, producto_id)
    datos_rotulo = mapear_respuesta_borrador(borrador, lista)

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
                <strong>Ingredientes:</strong> {ingredientes_html}<br><br>
                <strong>Elaborado por:</strong> {datos_rotulo.razon_social or 'No especificada'}<br>
                <strong>Dirección:</strong> {datos_rotulo.direccion_origen or 'No especificada'}<br>
                <strong>Origen:</strong> {datos_rotulo.pais_origen}<br>
                <strong>RNE:</strong> {datos_rotulo.rne or 'Trámite pendiente'}<br>
                <strong>RNPA/RPPA:</strong> {datos_rotulo.rnpa_rppa or 'Trámite pendiente'}<br>
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


