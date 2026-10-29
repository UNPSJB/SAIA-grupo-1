from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.autenticacion.dependencies import get_usuario_actual
from src.database import get_db
from src.notificaciones import schemas, services
from src.personal.models import Personal

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])


@router.get("/", response_model=schemas.NotificacionesListadoResponse)
def listar_notificaciones(
    solo_no_leidas: bool = Query(False),
    limite: int = Query(50, ge=1, le=200),
    auto_revisar: bool = Query(True),
    db: Session = Depends(get_db),
    usuario_actual: Personal = Depends(get_usuario_actual),
):
    if auto_revisar:
        services.revisar_y_generar_vencimientos(db)

    items, total_no_leidas, total_registros = services.listar_notificaciones(
        db,
        usuario_legajo=usuario_actual.legajo,
        solo_no_leidas=solo_no_leidas,
        limite=limite,
    )
    return schemas.NotificacionesListadoResponse(
        items=items,
        total_no_leidas=total_no_leidas,
        total_registros=total_registros,
    )


@router.put("/leer-todas", response_model=schemas.MarcarTodasLeidasResponse)
def marcar_todas_como_leidas(
    db: Session = Depends(get_db),
    usuario_actual: Personal = Depends(get_usuario_actual),
):
    afectadas = services.marcar_todas_leidas(db, usuario_actual.legajo)
    return schemas.MarcarTodasLeidasResponse(marcadas=afectadas)


@router.put("/{notificacion_id}/leer", response_model=schemas.NotificacionOut)
def marcar_como_leida(
    notificacion_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Personal = Depends(get_usuario_actual),
):
    return services.marcar_leida(db, notificacion_id, usuario_actual.legajo)


@router.post("/revisar-vencimientos")
def ejecutar_revision_vencimientos(
    db: Session = Depends(get_db),
    usuario_actual: Personal = Depends(get_usuario_actual),
):
    generadas = services.revisar_y_generar_vencimientos(db)
    return {"generadas": generadas}

