import logging
from typing import List
from fastapi import APIRouter, Depends, Form
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import get_usuario_actual, requiere_admin
from src.certificado import schemas  # o desde donde tengas schemas y services de tipo
from src.certificado import services_tipo as services  # ajustá la ruta a tu service de tipos
from src.database import get_db

router = APIRouter(prefix="/certificados/tipos", tags=["tipos_certificados"])


@router.get("/", response_model=List[schemas.TipoCertificado], dependencies=[Depends(get_usuario_actual)])
async def read_tipos_certificados(db: Session = Depends(get_db)):
  return services.listar_tipos_certificados(db)


@router.get("/{tipo_id}", response_model=schemas.TipoCertificado, dependencies=[Depends(get_usuario_actual)])
async def read_tipo_certificado(tipo_id: int, db: Session = Depends(get_db)):
  return services.obtener_tipo_certificado(db, tipo_id)


@router.post("/", response_model=schemas.TipoCertificado, dependencies=[Depends(requiere_admin)])
async def create_tipo_certificado(nombre: str = Form(...), db: Session = Depends(get_db)):
  return services.crear_tipo_certificado(db, nombre)


@router.delete("/{tipo_id}", dependencies=[Depends(requiere_admin)])
async def delete_tipo_certificado(tipo_id: int, db: Session = Depends(get_db)):
  return services.eliminar_tipo_certificado(db, tipo_id)