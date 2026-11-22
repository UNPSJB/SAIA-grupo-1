import os
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session
from src.utils import exceptions
from src.autenticacion.dependencies import get_usuario_actual, requiere_admin
from src.database import get_db
from src.utils import schemas, pdf
from fastapi.responses import FileResponse


router=APIRouter(prefix="/pdfs",tags=["pdfs"])




@router.get("/logos/{nombre_archivo}")
def obtener_logo_pdf(nombre_archivo: str):
    nombre_seguro = os.path.basename(nombre_archivo)
    ruta = pdf.LOGOS_DIR / nombre_seguro
    if not ruta.is_file():
        raise exceptions.LogoNoEncontrado()
    return FileResponse(path=str(ruta))

@router.post("/upload-logo", response_model=schemas.PdfResponse)
async def upload_logo_pdf(
    archivo_logo: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin=Depends(requiere_admin),
):
    return pdf.guardar_logo_pdf(db, archivo_logo)

@router.get("/", response_model=schemas.PdfResponse)
def obtener_config_pdf(db: Session = Depends(get_db)):
    return pdf._obtener_o_crear_config_pdf(db)


@router.put("/", response_model=schemas.PdfResponse)
def guardar_config_pdf(
    datos: schemas.PdfUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(requiere_admin),
):
    config = pdf._obtener_o_crear_config_pdf(db)
    payload = datos.model_dump(exclude_unset=True)
    for campo, valor in payload.items():
        setattr(config, campo, valor)
    db.commit()
    db.refresh(config)
    return config
