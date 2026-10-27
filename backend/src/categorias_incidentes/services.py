from typing import List
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from src.categorias_incidentes import exceptions, models, schemas


def listar_categorias(db: Session) -> List[schemas.CategoriaIncidente]:
    from src.incidentes.models import Incidente
    consulta = (
        select(
            models.CategoriaIncidente,
            func.count(Incidente.id).label("total_incidentes"),
        )
        .outerjoin(Incidente, Incidente.categoria_id == models.CategoriaIncidente.id)
        .group_by(models.CategoriaIncidente.id)
        .order_by(models.CategoriaIncidente.nombre.asc())
    )
    filas = db.execute(consulta).all()
    resultado: List[schemas.CategoriaIncidente] = []
    for cat, total in filas:
        resultado.append(
            schemas.CategoriaIncidente(
                id=cat.id,
                nombre=cat.nombre,
                descripcion=cat.descripcion,
                total_incidentes=total,
            )
        )
    return resultado


def obtener_categoria(db: Session, categoria_id: int) -> models.CategoriaIncidente:
    cat = db.get(models.CategoriaIncidente, categoria_id)
    if not cat:
        raise exceptions.CategoriaNoEncontrada()
    return cat


def crear_categoria(db: Session, datos: schemas.CategoriaIncidenteCreate) -> models.CategoriaIncidente:
    existente = db.scalar(
        select(models.CategoriaIncidente).where(
            func.lower(models.CategoriaIncidente.nombre) == datos.nombre.lower()
        )
    )
    if existente:
        raise exceptions.CategoriaNombreDuplicado()

    nueva = models.CategoriaIncidente(
        nombre=datos.nombre,
        descripcion=datos.descripcion,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva


def editar_categoria(
    db: Session, categoria_id: int, datos: schemas.CategoriaIncidenteUpdate
) -> models.CategoriaIncidente:
    cat = obtener_categoria(db, categoria_id)
    if datos.nombre and datos.nombre.lower() != cat.nombre.lower():
        existente = db.scalar(
            select(models.CategoriaIncidente).where(
                func.lower(models.CategoriaIncidente.nombre) == datos.nombre.lower()
            )
        )
        if existente:
            raise exceptions.CategoriaNombreDuplicado()
        cat.nombre = datos.nombre

    if datos.descripcion is not None:
        cat.descripcion = datos.descripcion

    db.commit()
    db.refresh(cat)
    return cat


def eliminar_categoria(db: Session, categoria_id: int) -> None:
    from src.incidentes.models import Incidente
    cat = obtener_categoria(db, categoria_id)
    cant_incidentes = db.scalar(
        select(func.count(Incidente.id)).where(Incidente.categoria_id == categoria_id)
    )
    if cant_incidentes and cant_incidentes > 0:
        raise exceptions.CategoriaConIncidentes()

    db.delete(cat)
    db.commit()

