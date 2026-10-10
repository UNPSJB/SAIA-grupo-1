import mimetypes
import os
import shutil

from fastapi import APIRouter,Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from src.database import get_db
from src.calibracion_realizada import schemas, services

router = APIRouter(prefix="/calibracion_realizada", tags=["calibracion_realizada"])


@router.post("/", response_model=schemas.CalibracionRealizada)
async def create_calibracion_realizada(CaliR: schemas.CalibracionRealizadaCreate, db:Session=Depends(get_db)):
    return services.calibracion_realizada(db,CaliR)

@router.get("/", response_model=list[schemas.CalibracionRealizada])
async def read_calibraciones_realizadas(db:Session=Depends(get_db)):
    return services.listar_calibraciones_realizadas(db)


@router.get("/{calibracion_id}",response_model=schemas.CalibracionRealizada)
async def read_calibracion_realizada(calibracion_id:int,db:Session=Depends(get_db)):
    return services.Obtener_CalibracionRealizada(db,calibracion_id)


@router.post("/upload-certificado")
async def upload_certificado(formato_archivo: UploadFile = File(...)):
    upload_dir = "uploads/certificados"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, formato_archivo.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(formato_archivo.file, buffer)
        
    return {"ruta": file_path}


@router.get("/archivos/{nombre_archivo:path}")
async def obtener_archivo_certificado(nombre_archivo: str):
    nombre_limpio = nombre_archivo.split("/")[-1]
    ruta_completa = os.path.join("uploads", "certificados", nombre_limpio)
    
    if not os.path.exists(ruta_completa):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
        
    # Añadir filename le dice al navegador que descargue el archivo directamente
    return FileResponse(ruta_completa, filename=nombre_limpio)


@router.get("/archivos/{nombre_archivo:path}", response_class=FileResponse)
def descargar_archivo_calibracion(
    nombre_archivo: str,
    inline: bool = Query(False),
):
    # Limpiamos el nombre de cualquier ruta redundante
    nombre_limpio = nombre_archivo.replace("\\", "/").split("/")[-1]
    ruta_completa = os.path.join("uploads", "certificados", nombre_limpio)
    
    if not os.path.exists(ruta_completa):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
        
    # Detectamos el tipo MIME automáticamente (igual que tu compañero)
    tipo_media, _ = mimetypes.guess_type(ruta_completa)
    if not tipo_media:
        tipo_media = "application/pdf" if ruta_completa.lower().endswith(".pdf") else "application/octet-stream"
        
    # Si inline es True, el navegador lo previsualiza; si es False, fuerza la descarga
    if inline:
        headers = {"Content-Disposition": f'inline; filename="{nombre_limpio}"'}
        return FileResponse(
            path=ruta_completa,
            media_type=tipo_media,
            headers=headers,
        )
        
    return FileResponse(
        path=ruta_completa,
        media_type=tipo_media,
        filename=nombre_limpio,
    )