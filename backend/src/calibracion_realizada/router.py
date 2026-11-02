from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from src.database import get_db
from src.calibracion_realizada import schemas, services

router = APIRouter(prefix="/calibracion_realizada", tags=["calibracion_realizada"])


@router.post("/", response_model=schemas.CalibracionRealizada)
async def create_calibracion_realizada(CaliR: schemas.CalibracionRealizadaCreate, db: Session = Depends(get_db)):
    return services.calibracion_realizada(db, CaliR)


@router.get("/", response_model=list[schemas.CalibracionRealizada])
async def read_calibraciones_realizadas(db: Session = Depends(get_db)):
    return services.listar_calibraciones_realizadas(db)


@router.get("/{calibracion_id}", response_model=schemas.CalibracionRealizada)
async def read_calibracion_realizada(calibracion_id: int, db: Session = Depends(get_db)):
    return services.Obtener_CalibracionRealizada(db, calibracion_id)


@router.post("/upload-certificado")
async def upload_certificado(formato_archivo: UploadFile = File(...)):
    return {"ruta": services.guardar_archivo_calibracion(formato_archivo)}


@router.get("/archivos/{nombre_archivo:path}", response_class=FileResponse)
def descargar_archivo_calibracion(
    nombre_archivo: str,
    inline: bool = Query(False),
):
    return services.obtener_archivo_calibracion(nombre_archivo, inline=inline)
