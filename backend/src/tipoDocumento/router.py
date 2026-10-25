from typing import List
from fastapi import APIRouter, Depends, Form
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import get_usuario_actual, requiere_admin
from src.tipoDocumento import schemas, services
from src.database import get_db

router = APIRouter(prefix="/documentos/tipos", tags=["tipos_documentos"])

@router.get("/", response_model=List[schemas.TipoDocumento], dependencies=[Depends(get_usuario_actual)])
async def read_tipos_documentos(db: Session = Depends(get_db)):
    return services.listar_tipos_documentos(db)

@router.get("/{tipo_id}", response_model=schemas.TipoDocumento, dependencies=[Depends(get_usuario_actual)])
async def read_tipo_documento(tipo_id: int, db: Session = Depends(get_db)):
    return services.obtener_tipo_documento(db, tipo_id)

@router.post("/", response_model=schemas.TipoDocumento, dependencies=[Depends(requiere_admin)])
async def create_tipo_documento(nombre: str = Form(...), db: Session = Depends(get_db)):
    return services.crear_tipo_documento(db, nombre)

@router.put("/{tipo_id}", response_model=schemas.TipoDocumento, dependencies=[Depends(requiere_admin)])
async def update_tipo_documento(tipo_id: int, nombre: str = Form(...), db: Session = Depends(get_db)):
    return services.actualizar_tipo_documento(db, tipo_id, nombre)

@router.delete("/{tipo_id}", dependencies=[Depends(requiere_admin)])
async def delete_tipo_documento(tipo_id: int, db: Session = Depends(get_db)):
    return services.eliminar_tipo_documento(db, tipo_id)

