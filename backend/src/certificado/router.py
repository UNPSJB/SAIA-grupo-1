import logging
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.certificado import schemas, services
from src.database import get_db

router = APIRouter(prefix="/certificados", tags=["certificados"])


@router.post("/", response_model=schemas.Certificado)
async def create_certificado(certificado: schemas.CertificadoCreate, db: Session = Depends(get_db)):
  return services.crear_certificado(db, certificado)


@router.get("/", response_model=list[schemas.Certificado])
async def read_certificados(legajo_persona: Optional[int] = None, db: Session = Depends(get_db)):
  return services.listar_certificados(db, legajo_persona)


@router.get("/{certificado_id}", response_model=schemas.Certificado)
async def read_certificado(certificado_id: int, db: Session = Depends(get_db)):
  return services.obtener_certificado(db, certificado_id)


@router.put("/{certificado_id}", response_model=schemas.Certificado)
async def update_certificado(certificado_id: int, certificado: schemas.CertificadoUpdate, db: Session = Depends(get_db),):
  return services.editar_certificado(db, certificado_id, certificado)


@router.delete("/{certificado_id}")
async def delete_certificado(certificado_id: int, db: Session = Depends(get_db)):
  return services.eliminar_certificado(db, certificado_id)