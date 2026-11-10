from typing import Any, Dict, List, Optional
from datetime import date, datetime, timedelta
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session
from src.insumos.models import Insumo
from src.insumos import schemas, exceptions


# operaciones CRUD para Insumo
# La baja es logica (activo = False): los insumos dados de baja no se listan ni se pueden leer,
# pero siguen existiendo para los lotes de produccion que los usaron.


def _validar_nombre_unico(db: Session, nombre: str, excluir_id: Optional[int] = None) -> None:
    """El nombre no puede repetirse (sin distinguir mayusculas) entre los insumos activos."""
    consulta = select(Insumo.id).where(
        Insumo.activo, func.lower(Insumo.nombre) == nombre.strip().lower()
    )
    if excluir_id is not None:
        consulta = consulta.where(Insumo.id != excluir_id)
    if db.scalar(consulta) is not None:
        raise exceptions.NombreInsumoDuplicado()


def calcular_estado_vencimiento_insumo(
    fecha_vencimiento: Optional[datetime | date], stock: float
) -> tuple[str, Optional[int]]:
    if stock <= 0:
        return ("AGOTADO", None)
    if not fecha_vencimiento:
        return ("SIN_VENCIMIENTO", None)
    f_date = (
        fecha_vencimiento.date()
        if isinstance(fecha_vencimiento, datetime)
        else fecha_vencimiento
    )
    hoy = date.today()
    dias = (f_date - hoy).days
    if dias < 0:
        return ("VENCIDO", dias)
    if dias <= 7:
        return ("PROXIMO_A_VENCER", dias)
    return ("VIGENTE", dias)


def obtener_insumos_para_csv(
    db: Session,
    busqueda: Optional[str] = None,
    unidad: Optional[str] = None,
    vencimiento: Optional[str] = None,
) -> List[Dict[str, Any]]:
    query = select(Insumo)
    insumos = db.scalars(query).all()
    filas = []
    term = busqueda.lower().strip() if busqueda else None

    for i in insumos:
        nombre = getattr(i, "nombre", "") or ""
        lote = getattr(i, "lote", "") or ""
        medida_val = i.medida.value if hasattr(i.medida, "value") else str(i.medida or "")

        # Filtro por término de búsqueda (nombre o lote)
        if term and (term not in nombre.lower() and term not in lote.lower()):
            continue

        # Filtro por unidad de medida
        if unidad and unidad != "TODOS":
            if medida_val.upper() != unidad.upper():
                continue

        # Calcular estado de vencimiento para filtro y reporte
        f_venc = getattr(i, "fechaVencimiento", None)
        f_rec = getattr(i, "fechaRecepcion", None)

        str_venc = (
            f_venc.strftime("%Y-%m-%d")
            if isinstance(f_venc, (datetime, date))
            else "No aplica"
        )
        str_rec = (
            f_rec.strftime("%Y-%m-%d")
            if isinstance(f_rec, (datetime, date))
            else "No aplica"
        )

        estado_venc, _ = calcular_estado_vencimiento_insumo(f_venc, getattr(i, "stock", 0))

        if vencimiento and vencimiento != "TODOS":
            if estado_venc != vencimiento.upper():
                continue

        prov_nom = i.proveedor.nombre if getattr(i, "proveedor", None) else "-"
        tipo_nom = i.tipo.nombre if getattr(i, "tipo", None) else "-"

        filas.append(
            {
                "id": i.id,
                "nombre": nombre,
                "tipoInsumo": tipo_nom,
                "proveedor": prov_nom,
                "lote": lote,
                "stock": getattr(i, "stock", 0),
                "cantRecibida": getattr(i, "cantRecibida", 0),
                "medida": medida_val,
                "fechaRecepcion": str_rec,
                "fechaVencimiento": str_venc,
                "estadoVencimiento": estado_venc.replace("_", " ").capitalize(),
            }
        )

    return filas


def crear_insumo(db: Session, insumo: schemas.InsumoCreate) -> Insumo:
    if not insumo.nombre or insumo.nombre.strip() == "":
        raise exceptions.NombreInsumoVacio()
    _validar_nombre_unico(db, insumo.nombre)
    _insumo = Insumo(**insumo.model_dump())
    db.add(_insumo)
    db.commit()
    db.refresh(_insumo)
    return _insumo


def recibir_lote_insumo(db: Session, datos: schemas.RecepcionInsumoRequest) -> Insumo:
    from src.tipoInsumo.models import TipoInsumo
    from src.proveedores.models import Proveedor

    tipo = db.get(TipoInsumo, datos.tipo_insumo_id)
    if not tipo or not tipo.activo:
        raise exceptions.TipoInsumoRequerido()

    proveedor = db.get(Proveedor, datos.proveedor_id)
    if not proveedor or not proveedor.activo:
        raise exceptions.ProveedorRequerido()

    if datos.fechaRecepcion is not None and datos.fechaRecepcion != date.today():
        raise exceptions.FechaRecepcionSoloHoy()

    min_venc = date.today() + timedelta(days=7)
    if datos.fechaVencimiento < min_venc:
        raise exceptions.FechaVencimientoPosterior()

    if datos.cantRecibida <= 0:
        raise exceptions.CantidadRecibidaInvalida()

    nombre_insumo = (
        datos.nombre.strip() if datos.nombre and datos.nombre.strip() else tipo.nombre
    )
    f_rec = datetime.now()
    f_venc = datetime.combine(datos.fechaVencimiento, datetime.min.time())

    _insumo = Insumo(
        nombre=nombre_insumo,
        lote=datos.lote.strip(),
        fechaRecepcion=f_rec,
        fechaVencimiento=f_venc,
        cantRecibida=float(datos.cantRecibida),
        stock=float(datos.cantRecibida),
        medida=tipo.unidadMedida,
        tipo_insumo_id=tipo.id,
        proveedor_id=proveedor.id,
        activo=True,
    )
    db.add(_insumo)
    db.commit()
    db.refresh(_insumo)
    return _insumo


def listar_insumos_agrupados_por_tipo(
    db: Session, busqueda: Optional[str] = None
) -> List[schemas.InsumoAgrupadoPorTipo]:
    from src.tipoInsumo.models import TipoInsumo

    tipos = list(
        db.scalars(
            select(TipoInsumo)
            .where(TipoInsumo.activo == True)
            .order_by(TipoInsumo.nombre.asc())
        ).all()
    )
    resultado: List[schemas.InsumoAgrupadoPorTipo] = []
    term = busqueda.lower().strip() if busqueda else None

    for t in tipos:
        lotes_db = list(
            db.scalars(
                select(Insumo)
                .where(Insumo.tipo_insumo_id == t.id, Insumo.activo == True)
                .order_by(Insumo.fechaVencimiento.asc().nulls_last(), Insumo.id.asc())
            ).all()
        )

        lotes_disponibles: List[schemas.InsumoLoteItem] = []
        lotes_agotados: List[schemas.InsumoLoteItem] = []

        for l in lotes_db:
            estado_v, dias = calcular_estado_vencimiento_insumo(l.fechaVencimiento, l.stock)
            prov_nom = l.proveedor.nombre if getattr(l, "proveedor", None) else None
            item = schemas.InsumoLoteItem(
                id=l.id,
                lote=l.lote,
                nombre=l.nombre,
                stock=float(l.stock),
                cantRecibida=float(l.cantRecibida),
                medida=str(l.medida.value if hasattr(l.medida, "value") else l.medida),
                fechaRecepcion=l.fechaRecepcion,
                fechaVencimiento=l.fechaVencimiento,
                proveedor_id=l.proveedor_id,
                proveedor_nombre=prov_nom,
                estadoVencimiento=estado_v,
                dias_para_vencer=dias,
                activo=l.activo,
            )
            if l.stock > 0:
                lotes_disponibles.append(item)
            else:
                lotes_agotados.append(item)

        if term:
            coincide_tipo = term in t.nombre.lower()
            coincide_lotes = any(
                term in l.nombre.lower() or term in l.lote.lower()
                for l in (lotes_disponibles + lotes_agotados)
            )
            if not (coincide_tipo or coincide_lotes):
                continue

        stock_total = sum(l.stock for l in lotes_disponibles)
        tiene_v = any(l.estadoVencimiento == "VENCIDO" for l in lotes_disponibles)
        tiene_p = any(l.estadoVencimiento == "PROXIMO_A_VENCER" for l in lotes_disponibles)

        resultado.append(
            schemas.InsumoAgrupadoPorTipo(
                tipo_id=t.id,
                nombre=t.nombre,
                descripcion=t.descripcion,
                unidadMedida=t.unidadMedida.value if hasattr(t.unidadMedida, "value") else str(t.unidadMedida),
                stock_total=stock_total,
                tiene_vencidos=tiene_v,
                tiene_proximos=tiene_p,
                lotes=lotes_disponibles,
                lotes_agotados=lotes_agotados,
            )
        )

    return resultado


def listar_insumos_para_selector(
    db: Session, tipo_id: int
) -> List[schemas.InsumoSelectorItem]:
    lotes_db = list(
        db.scalars(
            select(Insumo)
            .where(
                Insumo.tipo_insumo_id == tipo_id,
                Insumo.activo == True,
                Insumo.stock > 0,
            )
            .order_by(Insumo.fechaVencimiento.asc().nulls_last(), Insumo.id.asc())
        ).all()
    )
    items: List[schemas.InsumoSelectorItem] = []
    for l in lotes_db:
        estado_v, _ = calcular_estado_vencimiento_insumo(l.fechaVencimiento, l.stock)
        f_venc_date = (
            l.fechaVencimiento.date()
            if isinstance(l.fechaVencimiento, datetime)
            else l.fechaVencimiento
        )
        f_formateada = (
            f_venc_date.strftime("%d/%m/%Y") if f_venc_date else "Sin vencimiento"
        )
        prov_nom = l.proveedor.nombre if getattr(l, "proveedor", None) else None
        tipo_nom = l.tipo.nombre if getattr(l, "tipo", None) else None
        items.append(
            schemas.InsumoSelectorItem(
                id=l.id,
                nombre=l.nombre,
                lote=l.lote,
                fechaVencimiento=f_venc_date,
                fechaVencimientoFormateada=f_formateada,
                stock=float(l.stock),
                medida=str(l.medida.value if hasattr(l.medida, "value") else l.medida),
                estadoVencimiento=estado_v,
                proveedor=prov_nom,
                tipo_insumo_id=l.tipo_insumo_id,
                tipo_insumo_nombre=tipo_nom,
            )
        )
    return items


def desechar_insumo(db: Session, insumo_id: int) -> Insumo:
    insumo = leer_insumo(db, insumo_id)
    estado_v, _ = calcular_estado_vencimiento_insumo(insumo.fechaVencimiento, insumo.stock)
    if estado_v != "VENCIDO":
        raise exceptions.InsumoNoVencido()
    insumo.stock = 0.0
    db.commit()
    db.refresh(insumo)
    return insumo


def obtener_trazabilidad_insumo(
    db: Session, insumo_id: int
) -> schemas.InsumoDetalleTrazabilidad:
    from src.produccion.models import InsumoLote

    insumo = leer_insumo(db, insumo_id)
    asoc = list(
        db.scalars(select(InsumoLote).where(InsumoLote.insumo_id == insumo_id)).all()
    )
    trazabilidad: List[schemas.TrazabilidadLoteProduccion] = []
    for a in asoc:
        lote_p = a.lote
        if lote_p:
            trazabilidad.append(
                schemas.TrazabilidadLoteProduccion(
                    lote_produccion_id=lote_p.id,
                    lote_produccion_codigo=lote_p.codigo,
                    producto_nombre=lote_p.producto.nombre if lote_p.producto else "Producto",
                    fecha_produccion=lote_p.fecha,
                    cantidad_usada=float(a.cantidad),
                    unidad_medida=str(
                        insumo.medida.value if hasattr(insumo.medida, "value") else insumo.medida
                    ),
                    responsable_nombre=lote_p.nombre_responsable,
                )
            )

    estado_v, _ = calcular_estado_vencimiento_insumo(insumo.fechaVencimiento, insumo.stock)
    insumo_schema = schemas.Insumo(
        id=insumo.id,
        nombre=insumo.nombre,
        lote=insumo.lote,
        fechaRecepcion=insumo.fechaRecepcion,
        fechaVencimiento=insumo.fechaVencimiento,
        cantRecibida=float(insumo.cantRecibida),
        stock=float(insumo.stock),
        medida=insumo.medida,
        tipo_insumo_id=insumo.tipo_insumo_id,
        proveedor_id=insumo.proveedor_id,
        activo=insumo.activo,
        proveedor_nombre=insumo.proveedor.nombre if getattr(insumo, "proveedor", None) else None,
        tipo_insumo_nombre=insumo.tipo.nombre if getattr(insumo, "tipo", None) else None,
        estadoVencimiento=estado_v,
    )
    return schemas.InsumoDetalleTrazabilidad(
        insumo=insumo_schema,
        lotes_produccion=trazabilidad,
    )


def listar_insumos(db: Session) -> List[Insumo]:
    return list(db.scalars(select(Insumo).where(Insumo.activo)).all())


def leer_insumo(db: Session, insumo_id: int) -> Insumo:
    db_insumo = db.scalar(select(Insumo).where(Insumo.id == insumo_id, Insumo.activo))
    if db_insumo is None:
        raise exceptions.InsumoNoEncontrado()
    return db_insumo


def modificar_insumo(
    db: Session, insumo_id: int, insumo: schemas.InsumoUpdate
) -> Insumo:
    db_insumo = leer_insumo(db, insumo_id)
    datos_actualizados = insumo.model_dump(exclude_unset=True)

    campos_no_nulos = ["nombre", "lote", "cantRecibida", "stock", "medida"]
    for campo in campos_no_nulos:
        if campo in datos_actualizados and datos_actualizados[campo] is None:
            datos_actualizados.pop(campo)

    if "nombre" in datos_actualizados:
        nombre_val = datos_actualizados["nombre"]
        if nombre_val.strip() == "":
            raise exceptions.NombreInsumoVacio()
        _validar_nombre_unico(db, nombre_val, excluir_id=insumo_id)

    if (
        "fechaVencimiento" in datos_actualizados
        and datos_actualizados["fechaVencimiento"] is not None
    ):
        f_venc = datos_actualizados["fechaVencimiento"]
        minimo_venc = (datetime.now() + timedelta(days=7)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        if f_venc < minimo_venc:
            raise exceptions.FechaVencimientoInvalida()
        if f_venc < db_insumo.fechaRecepcion:
            raise exceptions.FechaVencimientoInvalida()

    stock_efectivo = datos_actualizados.get("stock", db_insumo.stock)
    cant_efectiva = datos_actualizados.get("cantRecibida", db_insumo.cantRecibida)

    if stock_efectivo > cant_efectiva:
        raise exceptions.StockMayorCantidad()

    if datos_actualizados:
        db.execute(
            update(Insumo)
            .where(Insumo.id == insumo_id)
            .values(**datos_actualizados)
        )
        db.commit()
        db.refresh(db_insumo)
    return db_insumo


def eliminar_insumo(db: Session, insumo_id: int) -> Insumo:
    db_insumo = leer_insumo(db, insumo_id)
    db_insumo.activo = False
    db.commit()
    return db_insumo


def modificar_stock(
    db: Session, insumo_id: int, datos_stock: schemas.InsumoUpdateStock
) -> Insumo:
    db_insumo = leer_insumo(db, insumo_id)
    nuevo_stock = db_insumo.stock - datos_stock.stock
    if nuevo_stock < 0:
        raise exceptions.StockInvalido()
    db_insumo.stock = nuevo_stock
    db.commit()
    db.refresh(db_insumo)
    return db_insumo
