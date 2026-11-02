import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Form
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import get_usuario_actual, requiere_admin
from src.tipoCertificado import schemas, services
from src.database import get_db
from src.utils.csv import generar_respuesta_csv

router = APIRouter(prefix="/certificados/tipos", tags=["tipos_certificados"])

@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
async def exportar_tipos_certificados_csv(
    busqueda: Optional[str] = None,
    ordenar_por: Optional[str] = "id",
    db: Session = Depends(get_db)
):
  """Exporta la lista de tipos de certificados a CSV aplicando búsqueda y orden activo."""
  datos = services.obtener_tipos_certificados_para_csv(
      db, busqueda=busqueda, ordenar_por=ordenar_por
  )

  columnas = {
      "id": "ID",
      "nombre": "Nombre del Tipo de Certificado",
  }

  return generar_respuesta_csv(
      datos=datos,
      columnas=columnas,
      nombre_archivo="tipos_de_certificados.csv",
  )


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