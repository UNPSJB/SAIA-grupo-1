from typing import List, Optional
from fastapi import APIRouter, Depends, Response, status, Query
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import requiere_admin, get_usuario_actual
from src.categorias_incidentes import schemas, services
from src.database import get_db
from src.utils.csv import generar_respuesta_csv
from src.utils.pdf import generar_respuesta_pdf

router = APIRouter(prefix="/incidentes/categorias", tags=["Categorías de Incidentes"])

@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_categorias_csv(
    busqueda: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    datos = services.obtener_categorias_para_exportar(db, busqueda=busqueda)

    columnas = {
        "id": "ID",
        "nombre": "Nombre de la Categoría",
        "descripcion": "Descripción",
        "total_incidentes": "Total de Incidentes",
    }

    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo="categorias_incidentes.csv",
    )


@router.get("/exportar-pdf", dependencies=[Depends(get_usuario_actual)])
def exportar_categorias_pdf(
    busqueda: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    datos = services.obtener_categorias_para_exportar(db, busqueda=busqueda)

    columnas = {
        "id": "ID",
        "nombre": "Nombre de la Categoría",
        "descripcion": "Descripción",
        "total_incidentes": "Total de Incidentes",
    }

    return generar_respuesta_pdf(
        db=db,
        datos=datos,
        columnas=columnas,
        titulo_reporte="Listado de Categorías de Incidentes",
        nombre_archivo="categorias_incidentes.pdf",
    )

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

