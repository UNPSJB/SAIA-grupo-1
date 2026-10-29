import logging
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, UploadFile, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import get_usuario_actual, requiere_admin
from src.certificado import schemas, services
from src.database import get_db
from src.utils.csv import generar_respuesta_csv 

router = APIRouter(prefix="/certificados", tags=["certificados"])

archivos_router = APIRouter(prefix="/certificados/archivos", tags=["certificados"])

@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
async def exportar_certificados_csv(
    legajo_persona: Optional[int] = Query(None),
    busqueda: Optional[str] = Query(None),
    filtro_estado: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    datos = services.obtener_certificados_para_csv(
        db, legajo_persona=legajo_persona, busqueda=busqueda, filtro_estado=filtro_estado
    )

    columnas = {
        "id": "ID",
        "legajo_persona": "Legajo",
        "nombre_persona": "Personal",
        "tipo": "Tipo de Certificado",
        "fecha_vencimiento": "Fecha de Vencimiento",
        "estado_vencimiento": "Estado",
        "tiene_archivo": "Archivo Adjunto"
    }

    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo=f"certificados_legajo_{legajo_persona}.csv" if legajo_persona else "vencimientos_certificados.csv"
    )

@archivos_router.get("/{nombre_archivo}", response_class=FileResponse)
async def read_archivo(nombre_archivo: str):
  return services.obtener_archivo_certificado(nombre_archivo)


@router.post("/", response_model=schemas.Certificado, dependencies=[Depends(requiere_admin)])
async def create_certificado(id_tipo: int = Form(...), fechaVencimiento: date = Form(...), legajo_persona: int = Form(...), archivo: Optional[UploadFile] = File(None), db: Session = Depends(get_db)):
  return services.crear_certificado(db, id_tipo, fechaVencimiento, legajo_persona, archivo)


@router.get("/", response_model=list[schemas.Certificado], dependencies=[Depends(get_usuario_actual)])
async def read_certificados(legajo_persona: Optional[int] = None, db: Session = Depends(get_db)):
  return services.listar_certificados(db, legajo_persona)


@router.get("/{certificado_id}", response_model=schemas.Certificado, dependencies=[Depends(get_usuario_actual)])
async def read_certificado(certificado_id: int, db: Session = Depends(get_db)):
  return services.obtener_certificado(db, certificado_id)


@router.put("/{certificado_id}", response_model=schemas.Certificado, dependencies=[Depends(requiere_admin)])
async def update_certificado(certificado_id: int, id_tipo: int = Form(...), fechaVencimiento: date = Form(...), archivo: Optional[UploadFile] = File(None), db: Session = Depends(get_db)):
  return services.editar_certificado(db, certificado_id, id_tipo, fechaVencimiento, archivo)


@router.delete("/{certificado_id}", dependencies=[Depends(requiere_admin)])
async def delete_certificado(certificado_id: int, db: Session = Depends(get_db)):
  return services.eliminar_certificado(db, certificado_id)