from datetime import date
from typing import List, Optional, Dict, Any
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from src.insumos.models import Insumo
from src.insumos.services import leer_insumo
from src.produccion import exceptions, schemas
from src.produccion.constants import INTENTOS_CODIGO_LOTE
from src.produccion.models import InsumoLote, LoteProduccion
from src.producto.models import Producto

def obtener_lotes_para_exportar(
    db: Session,
    producto_id: Optional[int] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
) -> List[Dict[str, Any]]:
    lotes = listar_lotes(db, producto_id=producto_id, desde=desde, hasta=hasta)
    filas: List[Dict[str, Any]] = []

    for l in lotes:
        unidad = ""
        nombre_producto = "-"
        if getattr(l, "producto", None):
            nombre_producto = getattr(l.producto, "nombre", "-") or "-"
            unidad_raw = getattr(l.producto, "unidadMedida", "")
            unidad = unidad_raw.value if hasattr(unidad_raw, "value") else str(unidad_raw or "")

        responsable = "-"
        if getattr(l, "responsable", None):
            nombre = getattr(l.responsable, "nombre", "") or ""
            apellido = getattr(l.responsable, "apellido", "") or ""
            responsable = f"{nombre} {apellido}".strip() or f"Legajo #{l.responsable_legajo}"
        elif getattr(l, "responsable_legajo", None):
            responsable = f"Legajo #{l.responsable_legajo}"

        fecha_str = l.fecha.strftime("%d/%m/%Y") if isinstance(l.fecha, date) else str(l.fecha)
        cantidad_str = f"{l.cantidad} {unidad}".strip()

        filas.append({
            "codigo": l.codigo,
            "fecha": fecha_str,
            "producto": nombre_producto,
            "cantidad": cantidad_str,
            "responsable": responsable,
            "insumos": len(l.insumos) if getattr(l, "insumos", None) else 0,
            "estado": "Abierto" if l.editable else "Cerrado",
        })

    return filas

def leer_producto_activo(db: Session, producto_id: int) -> Producto:
    """Los productos se dan de alta en el ABM de productos; a uno dado de baja no se le registran lotes."""
    producto = db.get(Producto, producto_id)
    if producto is None:
        raise exceptions.ProductoNoEncontrado()
    if not producto.activo:
        raise exceptions.ProductoInactivo()
    return producto


def _siguiente_codigo(db: Session, fecha: date) -> str:
    """Código `L-AAAAMMDD-NN`: fecha del lote + número correlativo dentro de ese día."""
    prefijo = f"L-{fecha:%Y%m%d}"
    codigos = db.scalars(select(LoteProduccion.codigo).where(LoteProduccion.fecha == fecha)).all()
    ultimo = max((int(c.rsplit("-", 1)[1]) for c in codigos if c.startswith(prefijo)), default=0)
    return f"{prefijo}-{ultimo + 1:02d}"


def registrar_lote(db: Session, legajo_responsable: int, datos: schemas.LoteProduccionCreate) -> LoteProduccion:
    producto = leer_producto_activo(db, datos.producto_id)
    for _ in range(INTENTOS_CODIGO_LOTE):
        try:
            lote = LoteProduccion(
                codigo=_siguiente_codigo(db, datos.fecha),
                producto_id=producto.id,
                fecha=datos.fecha,
                cantidad=datos.cantidad,
                responsable_legajo=legajo_responsable,
            )
            db.add(lote)
            db.commit()
            db.refresh(lote)
            return lote
        except IntegrityError:
            # código repetido (otro lote del mismo día registrado en paralelo): se reintenta
            db.rollback()
    raise exceptions.CodigoLoteNoGenerado()


def leer_lote(db: Session, lote_id: int) -> LoteProduccion:
    lote = db.get(LoteProduccion, lote_id)
    if lote is None:
        raise exceptions.LoteNoEncontrado()
    return lote


def _leer_lote_editable(db: Session, lote_id: int) -> LoteProduccion:
    lote = leer_lote(db, lote_id)
    if not lote.editable:
        raise exceptions.LoteCerrado()
    return lote


def listar_lotes(
    db: Session,
    producto_id: Optional[int] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
) -> List[LoteProduccion]:
    if desde is not None and desde < date(2000, 1, 1):
        raise exceptions.RangoFechasInvalido()
    if desde is not None and hasta is not None and desde > hasta:
        raise exceptions.RangoFechasInvalido()
    consulta = select(LoteProduccion)
    if producto_id is not None:
        consulta = consulta.where(LoteProduccion.producto_id == producto_id)
    if desde is not None:
        consulta = consulta.where(LoteProduccion.fecha >= desde)
    if hasta is not None:
        consulta = consulta.where(LoteProduccion.fecha <= hasta)
    consulta = consulta.order_by(LoteProduccion.fecha.desc(), LoteProduccion.id.desc())
    return list(db.scalars(consulta).unique().all())


# ------------------------------------------------------------------ insumos del lote


def listar_insumos_disponibles(db: Session) -> List[Insumo]:
    """Insumos activos del maestro que todavía tienen stock para usar en un lote."""
    consulta = select(Insumo).where(Insumo.activo, Insumo.stock > 0).order_by(func.lower(Insumo.nombre))
    return list(db.scalars(consulta).all())


def asociar_insumos(db: Session, lote_id: int, datos: schemas.AsociarInsumos) -> LoteProduccion:
    """Asocia los insumos al lote y descuenta lo usado del stock. Si alguno falla no se guarda ninguno."""
    lote = _leer_lote_editable(db, lote_id)
    ya_asociados = {i.insumo_id for i in lote.insumos}
    try:
        for item in datos.insumos:
            insumo = leer_insumo(db, item.insumo_id)
            if insumo.id in ya_asociados:
                raise exceptions.InsumoYaAsociado()
            if item.cantidad > insumo.stock:
                raise exceptions.StockInsuficiente()
            insumo.stock -= item.cantidad
            lote.insumos.append(InsumoLote(insumo=insumo, cantidad=item.cantidad))
        db.commit()
    except Exception:
        # descarta también los descuentos de stock que ya se hubieran hecho en la sesión
        db.rollback()
        raise
    db.refresh(lote)
    return lote


def quitar_insumo(db: Session, lote_id: int, insumo_id: int) -> LoteProduccion:
    """Quita un insumo asociado por error y le devuelve al stock la cantidad que se había descontado."""
    lote = _leer_lote_editable(db, lote_id)
    asociacion = next((i for i in lote.insumos if i.insumo_id == insumo_id), None)
    if asociacion is None:
        raise exceptions.InsumoNoAsociado()
    asociacion.insumo.stock += asociacion.cantidad
    lote.insumos.remove(asociacion)
    db.commit()
    db.refresh(lote)
    return lote
