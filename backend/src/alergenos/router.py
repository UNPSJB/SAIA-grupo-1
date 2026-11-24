from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from src.database import get_db
from typing import Optional
from src.alergenos import schemas, services
from src.autenticacion.dependencies import get_usuario_actual
from src.utils.csv import generar_respuesta_csv
from src.utils.pdf import generar_respuesta_pdf


router=APIRouter(prefix="/alergenos", tags=["alergenos"])


@router.post("/",response_model=schemas.Alergeno)
async def create_alergeno(alerg:schemas.AlergenoCreate,db:Session= Depends(get_db)):
    return services.crear_alergeno(db,alerg)

COLUMNAS_EXPORTACION = {
    "id": "ID",
    "nombre": "Nombre del Alérgeno",
    "tipos_insumos": "Tipos de Insumo Asociados",
    "total_tipos": "Total de Tipos de Insumo",
}


@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_alergenos_csv(
    busqueda: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    datos = services.obtener_alergenos_para_exportar(db, busqueda=busqueda)
    return generar_respuesta_csv(
        datos=datos,
        columnas=COLUMNAS_EXPORTACION,
        nombre_archivo="alergenos.csv",
    )


@router.get("/exportar-pdf", dependencies=[Depends(get_usuario_actual)])
def exportar_alergenos_pdf(
    busqueda: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    datos = services.obtener_alergenos_para_exportar(db, busqueda=busqueda)
    return generar_respuesta_pdf(
        db=db,
        datos=datos,
        columnas=COLUMNAS_EXPORTACION,
        titulo_reporte="Listado de Alérgenos",
        nombre_archivo="alergenos.pdf",
    )


@router.get("/", response_model=list[schemas.Alergeno])
async def read_alergenos(db: Session = Depends(get_db)):
    return services.listar_alergenos(db)


@router.get("/{alergeno_id}", response_model=schemas.Alergeno)
async def read_alergeno(alergeno_id: int, db: Session = Depends(get_db)):
    return services.leer_alergeno(db, alergeno_id)

@router.put("/{alergeno_id}",response_model=schemas.Alergeno)
async def update_alergeno(alergeno_id:int,alerg:schemas.AlergenoUpdate,db: Session = (Depends(get_db))):
    return services.actualizar_alergeno(db,alergeno_id,alerg)

@router.delete("/{alergeno_id}", response_model=schemas.Alergeno)
async def delete_alergeno(alergeno_id: int, db: Session = Depends(get_db)):
    return services.eliminar_alergeno(db, alergeno_id)