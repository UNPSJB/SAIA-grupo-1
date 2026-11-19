from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from src.database import get_db
from src.alergenos import schemas, services


router=APIRouter(prefix="/alergenos", tags=["alergenos"])


@router.post("/",response_model=schemas.Alergeno)
async def create_alergeno(alerg:schemas.AlergenoCreate,db:Session= Depends(get_db)):
    return services.crear_alergeno(db,alerg)

@router.get("/", response_model=list[schemas.Alergeno])
async def read_alergenos(db: Session = Depends(get_db)):
    return services.listar_alergenos(db)


@router.get("/{alergeno_id}", response_model=schemas.Alergeno)
async def read_alergeno(alergeno_id: int, db: Session = Depends(get_db)):
    return services.leer_alergeno(db, alergeno_id)

@router.put("/{alergeno_id}",response_model=schemas.Alergeno)
async def update_alergeno(alergeno_id:int,alerg:schemas.AlergenoUpdate,db: Session = (Depends(get_db))):
    return services.actualizar_alergeno(db,alergeno_id,alerg)