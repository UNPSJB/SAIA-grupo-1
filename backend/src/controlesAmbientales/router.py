import mimetypes
from pathlib import Path
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from src.database import get_db
from src.autenticacion.dependencies import requiere_admin, get_usuario_actual
from src.controlesAmbientales import schemas, services, exceptions
from src.controlesAmbientales.models import TipoControlAmbiental
from src.utils.csv import generar_respuesta_csv

router = APIRouter(prefix="/controles-ambientales", tags=["Controles Ambientales"])


@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_controles_csv(
    busqueda: Optional[str] = Query(None),
    filtro_estado: Optional[str] = Query(None),
    filtro_activo: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    datos = services.obtener_controles_para_csv(
        db, busqueda=busqueda, filtro_estado=filtro_estado, filtro_activo=filtro_activo
    )

    columnas = {
        "id": "ID",
        "tipo": "Tipo de Control",
        "estado_registro": "Estado del Registro",
        "periodicidad": "Periodicidad",
        "ultima_realizacion": "Última Realización",
        "proximo_vencimiento": "Próximo Vencimiento",
        "urgencia": "Control de Vencimiento",
        "total_visitas": "Total de Visitas",
        "observaciones": "Observaciones"
    }

    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo="controles_ambientales.csv"
    )


@router.get("/certificados/{nombre_archivo}", response_class=FileResponse)
def servir_certificado(nombre_archivo: str):
    ruta = services.STORAGE_DIR / nombre_archivo
    if not ruta.is_file():
        raise exceptions.ArchivoVacio()
    tipo_media, _ = mimetypes.guess_type(nombre_archivo)
    return FileResponse(path=ruta, media_type=tipo_media or "application/pdf", filename=nombre_archivo)


@router.get("", response_model=List[schemas.ControlAmbiental], dependencies=[Depends(get_usuario_actual)])
def listar_controles_endpoint(
    busqueda: Optional[str] = Query(None),
    filtro_activo: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return services.listar_controles(db, busqueda=busqueda, filtro_activo=filtro_activo)


@router.post("", response_model=schemas.ControlAmbiental, status_code=status.HTTP_201_CREATED, dependencies=[Depends(requiere_admin)])
def crear_control_endpoint(
    tipo: TipoControlAmbiental = Form(...),
    periodicidad_dias: int = Form(...),
    observaciones: Optional[str] = Form(None),
    fecha_realizacion_inicial: Optional[date] = Form(None),
    archivo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    return services.crear_control_ambiental(
        db=db,
        tipo=tipo,
        periodicidad_dias=periodicidad_dias,
        observaciones=observaciones,
        fecha_realizacion_inicial=fecha_realizacion_inicial,
        file=archivo
    )


@router.get("/{control_id}", response_model=schemas.ControlAmbientalConHistorial, dependencies=[Depends(get_usuario_actual)])
def obtener_control_endpoint(control_id: int, db: Session = Depends(get_db)):
    return services.obtener_control(db, control_id)


@router.post("/{control_id}/visitas", response_model=schemas.VisitaControl, status_code=status.HTTP_201_CREATED, dependencies=[Depends(requiere_admin)])
def registrar_visita_endpoint(
    control_id: int,
    fecha_realizacion: date = Form(...),
    observaciones: Optional[str] = Form(None),
    archivo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    return services.registrar_visita_control(
        db=db,
        control_id=control_id,
        fecha_realizacion=fecha_realizacion,
        file=archivo,
        observaciones=observaciones
    )


@router.put("/{control_id}", response_model=schemas.ControlAmbiental, dependencies=[Depends(requiere_admin)])
def actualizar_control_endpoint(
    control_id: int,
    datos: schemas.ControlAmbientalUpdate,
    db: Session = Depends(get_db),
):
    return services.actualizar_control_ambiental(
        db=db,
        control_id=control_id,
        tipo=datos.tipo,
        periodicidad_dias=datos.periodicidad_dias,
        observaciones=datos.observaciones
    )


@router.delete("/{control_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(requiere_admin)])
def eliminar_control_endpoint(control_id: int, db: Session = Depends(get_db)):
    services.eliminar_control_ambiental(db, control_id)

@router.patch("/{control_id}/reactivar", response_model=schemas.ControlAmbiental, dependencies=[Depends(requiere_admin)])
def reactivar_control_endpoint(control_id: int, db: Session = Depends(get_db)):
    return services.reactivar_control_ambiental(db, control_id)