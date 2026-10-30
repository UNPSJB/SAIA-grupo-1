from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.dashboard import schemas, services
from src.dashboard.exceptions import RangoFechasInvalidoException
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

@router.get("/grafico-cumplimiento", response_model=schemas.GraficoCumplimientoResponse)
def obtener_grafico_cumplimiento(
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    agrupacion: schemas.AgrupacionGrafico = "dia",
    db: Session = Depends(get_db),
):
    return services.obtener_grafico_cumplimiento(
        db, desde=desde, hasta=hasta, agrupacion=agrupacion
    )

@router.get("/historico-consumo", response_model=schemas.ConsumoHistoricoResponse)
def obtener_historico_consumo(
    desde: Optional[date] = Query(None, description="Fecha de inicio del rango (YYYY-MM-DD)"),
    hasta: Optional[date] = Query(None, description="Fecha de fin del rango (YYYY-MM-DD)"),
    insumo_id: Optional[int] = Query(None, description="Filtrar por ID de insumo químico específico"),
    agrupacion_tiempo: schemas.AgrupacionTiempo = Query("dia", description="Agrupación temporal: dia, semana o mes"),
    unidad: Optional[str] = Query(None, description="Unidad de medida a filtrar (L, ML, KG, G, UN)"),
    db: Session = Depends(get_db),
):
    try:
        return services.obtener_historico_consumo(
            db=db,
            desde=desde,
            hasta=hasta,
            insumo_id=insumo_id,
            agrupacion_tiempo=agrupacion_tiempo,
            unidad=unidad,
        )
    except RangoFechasInvalidoException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/cumplimiento-detallado", response_model=schemas.CumplimientoDetalladoResponse)
def obtener_cumplimiento_detallado(
    desde: Optional[date] = Query(None, description="Fecha de inicio del rango (YYYY-MM-DD)"),
    hasta: Optional[date] = Query(None, description="Fecha de fin del rango (YYYY-MM-DD)"),
    sector_id: Optional[int] = Query(None, description="Filtrar por sector"),
    turno: Optional[str] = Query(None, description="Filtrar por turno (MAÑANA, TARDE, NOCHE)"),
    db: Session = Depends(get_db),
):
    try:
        return services.obtener_cumplimiento_detallado(
            db=db,
            desde=desde,
            hasta=hasta,
            sector_id=sector_id,
            turno=turno,
        )
    except RangoFechasInvalidoException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/produccion", response_model=schemas.ProduccionDashboardResponse)
def obtener_produccion(
    periodo: schemas.Periodo = "dia",
    producto_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    return services.obtener_estadisticas_produccion(
        db, periodo=periodo, producto_id=producto_id
    )
