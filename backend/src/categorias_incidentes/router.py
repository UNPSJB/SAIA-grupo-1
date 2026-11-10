from typing import List
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import requiere_admin
from src.categorias_incidentes import schemas, services
from src.database import get_db

router = APIRouter(prefix="/incidentes/categorias", tags=["Categorías de Incidentes"])


@router.get("/", response_model=List[schemas.CategoriaIncidente])
async def listar_categorias_endpoint(db: Session = Depends(get_db)):
    return services.listar_categorias(db)


@router.get("/{categoria_id}", response_model=schemas.CategoriaIncidente)
async def obtener_categoria_endpoint(categoria_id: int, db: Session = Depends(get_db)):
    cat = services.obtener_categoria(db, categoria_id)
    return schemas.CategoriaIncidente(
        id=cat.id,
        nombre=cat.nombre,
        descripcion=cat.descripcion,
        total_incidentes=len(cat.incidentes) if cat.incidentes else 0,
    )


@router.post(
    "/",
    response_model=schemas.CategoriaIncidente,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requiere_admin)],
)
async def crear_categoria_endpoint(
    datos: schemas.CategoriaIncidenteCreate, db: Session = Depends(get_db)
):
    cat = services.crear_categoria(db, datos)
    return schemas.CategoriaIncidente(
        id=cat.id,
        nombre=cat.nombre,
        descripcion=cat.descripcion,
        total_incidentes=0,
    )


@router.put(
    "/{categoria_id}",
    response_model=schemas.CategoriaIncidente,
    dependencies=[Depends(requiere_admin)],
)
async def editar_categoria_endpoint(
    categoria_id: int,
    datos: schemas.CategoriaIncidenteUpdate,
    db: Session = Depends(get_db),
):
    cat = services.editar_categoria(db, categoria_id, datos)
    return schemas.CategoriaIncidente(
        id=cat.id,
        nombre=cat.nombre,
        descripcion=cat.descripcion,
        total_incidentes=len(cat.incidentes) if cat.incidentes else 0,
    )


@router.delete(
    "/{categoria_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(requiere_admin)],
)
async def eliminar_categoria_endpoint(categoria_id: int, db: Session = Depends(get_db)):
    services.eliminar_categoria(db, categoria_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

