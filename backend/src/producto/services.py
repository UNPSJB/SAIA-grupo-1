import logging
from typing import List, Optional, Dict, Any
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session
from src.producto import exceptions, schemas
from src.producto.models import Producto
from src.documentos.models import Documento
from src.unidadesMedida.services import resolver_unidad_medida

def obtener_productos_para_csv(
    db: Session,
    activo: Optional[bool] = None,
    busqueda: Optional[str] = None
) -> List[Dict[str, Any]]:
    
    query = db.query(Producto)
    
    if activo is not None:
        query = query.filter(Producto.activo == activo)
        
    productos = query.all()
    filas = []
    term = busqueda.lower().strip() if busqueda else None
    
    for p in productos:
        nombre = p.nombre or ""
        descripcion = p.descripcion or ""
        nombre_receta = p.receta.titulo if p.receta else ""

        # Filtro opcional por búsqueda
        if term:
            coincide = (
                term in nombre.lower()
                or term in descripcion.lower()
                or term in nombre_receta.lower()
            )
            if not coincide:
                continue

        unidad = str(p.unidadMedida or "")
        
        filas.append({
            "id": p.id,
            "nombre": nombre,
            "unidadMedida": unidad,
            "receta": nombre_receta or "Sin receta",
            "descripcion": descripcion,
            "estado": "Activo" if p.activo else "Inactivo"
        })
        
    return filas


def validar_receta(db: Session, id_receta: int) -> Documento:
    doc = db.scalar(select(Documento).where(Documento.id == id_receta, Documento.activo == True))
    if doc is None:
        raise exceptions.RecetaNoEncontrada()

    tipo_str = str(getattr(doc, "tipo", "") or "").upper()
    if tipo_str != "RECETA":
        raise exceptions.DocumentoNoEsReceta()

    return doc


def validar_nombre_unico(db: Session, nombre: str, producto_id_actual: Optional[int] = None) -> None:
    nombre_sin_espacios = nombre.replace(" ", "").lower()
    stmt = select(Producto).where(
        func.lower(func.replace(Producto.nombre, " ", "")) == nombre_sin_espacios
    )

    if producto_id_actual is not None:
        stmt = stmt.where(Producto.id != producto_id_actual)

    existente = db.scalar(stmt)
    if existente is not None:
        raise exceptions.NombreProductoDuplicado()


def crear_producto(db: Session, producto: schemas.ProductoCreate) -> Producto:
    validar_nombre_unico(db, producto.nombre)

    if producto.id_receta:
        validar_receta(db, producto.id_receta)

    unidad = resolver_unidad_medida(
        db,
        unidad_medida_id=producto.unidad_medida_id,
        valor_texto=producto.unidadMedida,
    )

    _producto = Producto(
        nombre=producto.nombre,
        descripcion=producto.descripcion,
        unidad_medida_id=unidad.id,
        id_receta=producto.id_receta,
        activo=True,
    )
    db.add(_producto)
    db.commit()
    db.refresh(_producto)

    if _producto.receta:
        _producto.nombre_receta = _producto.receta.titulo

    return _producto


def listar_productos(db: Session) -> List[Producto]:
    productos = list(db.scalars(select(Producto).order_by(Producto.id.desc())).all())

    for prod in productos:
        if prod.receta:
            prod.nombre_receta = prod.receta.titulo

    return productos


def obtener_producto(db: Session, producto_id: int) -> Producto:
    db_producto = db.scalar(select(Producto).where(Producto.id == producto_id))
    if db_producto is None:
        raise exceptions.ProductoNoEncontrado()

    if db_producto.receta:
        db_producto.nombre_receta = db_producto.receta.titulo

    return db_producto


def editar_producto(
    db: Session,
    producto_id: int,
    producto: schemas.ProductoUpdate,
) -> Producto:
    db_producto = obtener_producto(db, producto_id)

    datos_actualizar = producto.model_dump(exclude_unset=True)

    unidad_texto = datos_actualizar.pop("unidadMedida", None)
    unidad_id_val = datos_actualizar.pop("unidad_medida_id", None)
    if unidad_id_val is not None or unidad_texto is not None:
        unidad = resolver_unidad_medida(
            db,
            unidad_medida_id=unidad_id_val,
            valor_texto=unidad_texto,
        )
        datos_actualizar["unidad_medida_id"] = unidad.id

    if "nombre" in datos_actualizar and datos_actualizar["nombre"]:
        validar_nombre_unico(db, datos_actualizar["nombre"], producto_id_actual=producto_id)

    if "id_receta" in datos_actualizar and datos_actualizar["id_receta"]:
        validar_receta(db, datos_actualizar["id_receta"])

    if datos_actualizar:
        db.execute(
            update(Producto)
            .where(Producto.id == producto_id)
            .values(**datos_actualizar)
        )
        db.commit()
        db.refresh(db_producto)

    if db_producto.receta:
        db_producto.nombre_receta = db_producto.receta.titulo

    return db_producto


def eliminar_producto(db: Session, producto_id: int) -> Producto:
    db_producto = obtener_producto(db, producto_id)
    db_producto.activo = False
    # un producto dado de baja no se puede mostrar; si se restaura vuelve oculto
    db_producto.visible_publico = False
    db.commit()
    db.refresh(db_producto)
    return db_producto


def restaurar_producto(db: Session, producto_id: int) -> Producto:
    db_producto = obtener_producto(db, producto_id)
    db_producto.activo = True
    db.commit()
    db.refresh(db_producto)
    return db_producto

def actualizar_visibilidad_publica(db: Session, productos_visibles: List[int]) -> List[Producto]:
    """Deja visibles en la vista publica solo los productos indicados y oculta el resto.

    Si algun id no existe o esta dado de baja no se cambia nada.
    """
    ids = set(productos_visibles)
    encontrados = db.scalars(select(Producto).where(Producto.id.in_(list(ids)))).all() if ids else []
    if len(encontrados) != len(ids):
        raise exceptions.ProductoNoEncontrado()
    if any(not p.activo for p in encontrados):
        raise exceptions.ProductoInactivoNoPublicable()

    db.execute(update(Producto).values(visible_publico=Producto.id.in_(list(ids))))
    db.commit()
    return listar_productos(db)


def listar_productos_publicos(db: Session) -> List[Producto]:
    return list(db.scalars(
        select(Producto)
        .where(Producto.activo == True, Producto.visible_publico == True)
        .order_by(Producto.nombre)
    ).all())
