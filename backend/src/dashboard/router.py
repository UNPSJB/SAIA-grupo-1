from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.dashboard import schemas, services
from src.database import get_db

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/resumen", response_model=schemas.DashboardResumen)
def obtener_resumen(
    periodo: schemas.Periodo = "semana",
    periodo_cumplimiento: Optional[schemas.Periodo] = None,
    periodo_insumos: Optional[schemas.Periodo] = None,
    unidad: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return services.obtener_resumen(
        db,
        periodo=periodo,
        periodo_cumplimiento=periodo_cumplimiento,
        periodo_insumos=periodo_insumos,
        unidad=unidad,
    )


@router.get("/cumplimiento", response_model=schemas.CumplimientoResumen)
def obtener_cumplimiento(
    periodo: schemas.Periodo = "semana",
    db: Session = Depends(get_db),
):
    return services.obtener_cumplimiento_actual(db, periodo)


@router.get("/consumo-insumos", response_model=schemas.ConsumoResumen)
def obtener_consumo_insumos(
    periodo: schemas.Periodo = "semana",
    unidad: Optional[str] = None,
    db: Session = Depends(get_db),
):
    unidades_disp = services.obtener_unidades_insumos(db, periodo)
    unidad_efectiva = unidad.strip().upper() if unidad else (unidades_disp[0] if unidades_disp else "L")
    consumo = services.obtener_consumo_insumos(db, periodo, unidad=unidad_efectiva)
    return schemas.ConsumoResumen(
        consumo=consumo,
        unidades_disponibles=unidades_disp,
        unidad_actual=unidad_efectiva,
    )
