from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from src.personal.models import Personal
from src.produccion.models import InsumoLote, LoteProduccion
from src.producto.models import Producto
from src.rotulado import exceptions, schemas
from src.rotulado.models import (
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

