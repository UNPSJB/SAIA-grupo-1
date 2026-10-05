from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import get_usuario_actual, requiere_admin, requiere_operador
from src.database import get_db
from src.incidentes import schemas, services
from src.incidentes.constants import EstadoIncidente
from src.personal.models import Personal

router = APIRouter(prefix="/incidentes", tags=["Incidentes"])


@router.post("/", response_model=schemas.Incidente, status_code=status.HTTP_201_CREATED)
async def crear_incidente_endpoint(
    descripcion: str = Form(...),
    foto: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_operador),
):
    return services.crear_incidente(db, usuario, descripcion, foto)


@router.get("/", response_model=List[schemas.Incidente])
async def listar_incidentes_endpoint(
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    estado: Optional[EstadoIncidente] = Query(None),
    reportado_por_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    usuario: Personal = Depends(get_usuario_actual),
):
    return services.listar_incidentes(db, usuario, desde, hasta, estado, reportado_por_id)


@router.get("/{incidente_id}", response_model=schemas.Incidente)
async def obtener_incidente_endpoint(
    incidente_id: int,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(get_usuario_actual),
):
    return services.obtener_incidente(db, usuario, incidente_id)


@router.get("/{incidente_id}/foto", response_class=FileResponse)
async def obtener_foto_endpoint(
    incidente_id: int,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(get_usuario_actual),
):
    return services.obtener_foto(db, usuario, incidente_id)


@router.put(
    "/{incidente_id}",
    response_model=schemas.Incidente,
    dependencies=[Depends(requiere_admin)],
)
async def editar_incidente_endpoint(
    incidente_id: int,
    datos: schemas.IncidenteUpdate,
    db: Session = Depends(get_db),
):
    return services.editar_descripcion(db, incidente_id, datos.descripcion)


@router.patch(
    "/{incidente_id}/estado",
    response_model=schemas.Incidente,
    dependencies=[Depends(requiere_admin)],
)
async def cambiar_estado_endpoint(
    incidente_id: int,
    datos: schemas.IncidenteEstadoUpdate,
    db: Session = Depends(get_db),
):
    return services.cambiar_estado(db, incidente_id, datos.estado)


@router.delete(
    "/{incidente_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(requiere_admin)],
)
async def eliminar_incidente_endpoint(incidente_id: int, db: Session = Depends(get_db)):
    services.eliminar_incidente(db, incidente_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
