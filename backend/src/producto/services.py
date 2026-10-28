import logging
from typing import List, Optional
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session
from src.producto import exceptions, schemas
from src.producto.models import Producto
from src.documentos.models import Documento
from src.documentos.constants import TipoDocumento


def validar_receta(db: Session, id_receta: int) -> Documento:
    doc = db.scalar(select(Documento).where(Documento.id == id_receta, Documento.activo == True))
    if doc is None:
        raise exceptions.RecetaNoEncontrada()

    if doc.tipo != TipoDocumento.RECETA and str(doc.tipo).upper() != "RECETA":
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

    _producto = Producto(
        nombre=producto.nombre,
        descripcion=producto.descripcion,
        unidadMedida=producto.unidadMedida,
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
    productos = db.scalars(select(Producto).order_by(Producto.id.desc())).all()

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
    db.commit()
    db.refresh(db_producto)
    return db_producto


def restaurar_producto(db: Session, producto_id: int) -> Producto:
    db_producto = obtener_producto(db, producto_id)
    db_producto.activo = True
    db.commit()
    db.refresh(db_producto)
    return db_producto