from datetime import date
from typing import List, Optional
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from src.insumos.models import Insumo
from src.insumos.services import leer_insumo
from src.produccion import exceptions, schemas
from src.produccion.constants import INTENTOS_CODIGO_LOTE
from src.produccion.models import InsumoLote, LoteProduccion, Producto


def listar_productos(db: Session) -> List[Producto]:
    return list(db.scalars(select(Producto).order_by(func.lower(Producto.nombre))).all())


def leer_producto(db: Session, producto_id: int) -> Producto:
    producto = db.get(Producto, producto_id)
    if producto is None:
        raise exceptions.ProductoNoEncontrado()
    return producto


def obtener_o_crear_producto(db: Session, nombre: str) -> Producto:
    """Devuelve el producto con ese nombre (sin distinguir mayúsculas) o lo crea. No hace commit."""
    nombre = schemas.normalizar_nombre_producto(nombre)
    producto = db.scalar(select(Producto).where(func.lower(Producto.nombre) == nombre.lower()))
    if producto is None:
        producto = Producto(nombre=nombre)
        db.add(producto)
        db.flush()
    return producto


def _siguiente_codigo(db: Session, fecha: date) -> str:
    """Código `L-AAAAMMDD-NN`: fecha del lote + número correlativo dentro de ese día."""
    prefijo = f"L-{fecha:%Y%m%d}"
    codigos = db.scalars(select(LoteProduccion.codigo).where(LoteProduccion.fecha == fecha)).all()
    ultimo = max((int(c.rsplit("-", 1)[1]) for c in codigos if c.startswith(prefijo)), default=0)
    return f"{prefijo}-{ultimo + 1:02d}"


def registrar_lote(db: Session, legajo_responsable: int, datos: schemas.LoteProduccionCreate) -> LoteProduccion:
    """Registra el lote (y el producto, si es nuevo) en una única transacción."""
    for _ in range(INTENTOS_CODIGO_LOTE):
        try:
            if datos.producto_id is not None:
                producto = leer_producto(db, datos.producto_id)
            else:
                producto = obtener_o_crear_producto(db, datos.producto_nombre)
            lote = LoteProduccion(
                codigo=_siguiente_codigo(db, datos.fecha),
                producto_id=producto.id,
                fecha=datos.fecha,
                cantidad=datos.cantidad,
                unidad_medida=datos.unidad_medida,
                responsable_legajo=legajo_responsable,
            )
            db.add(lote)
            db.commit()
            db.refresh(lote)
            return lote
        except IntegrityError:
            # código repetido (o producto creado en paralelo): se descarta todo y se reintenta
            db.rollback()
    raise exceptions.CodigoLoteNoGenerado()


def leer_lote(db: Session, lote_id: int) -> LoteProduccion:
    lote = db.get(LoteProduccion, lote_id)
    if lote is None:
        raise exceptions.LoteNoEncontrado()
    return lote


def listar_lotes(
    db: Session,
    producto_id: Optional[int] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
) -> List[LoteProduccion]:
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
    """Insumos del maestro que todavía tienen stock para usar en un lote."""
    return list(db.scalars(select(Insumo).where(Insumo.stock > 0).order_by(func.lower(Insumo.nombre))).all())


def asociar_insumos(db: Session, lote_id: int, datos: schemas.AsociarInsumos) -> LoteProduccion:
    """Asocia los insumos al lote y descuenta lo usado del stock. Si alguno falla no se guarda ninguno."""
    lote = leer_lote(db, lote_id)
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
    lote = leer_lote(db, lote_id)
    asociacion = next((i for i in lote.insumos if i.insumo_id == insumo_id), None)
    if asociacion is None:
        raise exceptions.InsumoNoAsociado()
    asociacion.insumo.stock += asociacion.cantidad
    lote.insumos.remove(asociacion)
    db.commit()
    db.refresh(lote)
    return lote
