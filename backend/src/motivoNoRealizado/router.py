from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import get_usuario_actual, requiere_admin
from src.database import get_db
from src.motivoNoRealizado import schemas, services

router = APIRouter(tags=["motivos_no_realizado"])

@router.get("/", response_model=List[schemas.Motivo], dependencies=[Depends(get_usuario_actual)])
def listar_motivos(
    solo_activos: bool = Query(False),
    db: Session = Depends(get_db),
):
    return services.listar_motivos(db, solo_activos=solo_activos)

@router.get("/{motivo_id}", response_model=schemas.Motivo, dependencies=[Depends(get_usuario_actual)])
def obtener_motivo(motivo_id: int, db: Session = Depends(get_db)):
    return services.obtener_motivo(db, motivo_id)

@router.post("/", response_model=schemas.Motivo, status_code=status.HTTP_201_CREATED, dependencies=[Depends(requiere_admin)])
def crear_motivo(datos: schemas.MotivoCreate, db: Session = Depends(get_db)):
    return services.crear_motivo(db, datos)

@router.patch("/{motivo_id}/estado", response_model=schemas.Motivo, dependencies=[Depends(requiere_admin)])
def cambiar_estado_motivo_patch(
    motivo_id: int, datos: schemas.MotivoCambiarEstado, db: Session = Depends(get_db)
):
    return services.cambiar_estado_motivo(db, motivo_id, datos.activo)

@router.put("/{motivo_id}", response_model=schemas.Motivo, dependencies=[Depends(requiere_admin)])
def cambiar_estado_motivo_put(
    motivo_id: int, datos: schemas.MotivoCambiarEstado, db: Session = Depends(get_db)
):
    return services.cambiar_estado_motivo(db, motivo_id, datos.activo)
