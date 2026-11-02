from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from src.database import get_db
from src.sectores import schemas, services
from src.utils.csv import generar_respuesta_csv
from src.autenticacion.dependencies import get_usuario_actual

router = APIRouter()

@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_sectores_csv(
    busqueda: Optional[str] = None,
    db: Session = Depends(get_db)
):
    
    datos = services.obtener_sectores_para_csv(db, busqueda=busqueda)

    columnas = {
        "id": "ID",
        "nombre": "Nombre del Sector",
    }

    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo="sectores.csv",
    )

@router.post("/", response_model=schemas.Sector, status_code=status.HTTP_201_CREATED)
def create_sector(sector: schemas.SectorCreate, db: Session = Depends(get_db)):
    return services.crear_sector(db, sector)

@router.get("/", response_model=List[schemas.Sector])
def read_sectores(db: Session = Depends(get_db)):
    return services.listar_sectores(db)

@router.get("/{sector_id}", response_model=schemas.Sector)
def read_sector(sector_id: int, db: Session = Depends(get_db)):
    return services.obtener_sector(db, sector_id)

@router.put("/{sector_id}", response_model=schemas.Sector)
def update_sector(sector_id: int, sector: schemas.SectorUpdate, db: Session = Depends(get_db)):
    return services.editar_sector(db, sector_id, sector)

@router.delete("/{sector_id}", response_model=schemas.Sector)
def delete_sector(sector_id: int, db: Session = Depends(get_db)):
    return services.eliminar_sector(db, sector_id)

