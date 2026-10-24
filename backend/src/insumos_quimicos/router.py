from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import requiere_admin
from src.database import get_db
from .schemas import (
    InsumoQuimicoCreate,
    InsumoQuimicoUpdate,
    InsumoQuimicoResponse,
    ConsumoHistoricoResponse,
    AgrupacionTiempo,
)
from .services import InsumoQuimicoService, obtener_historico_consumo
from .exceptions import InsumoQuimicoException, RangoFechasInvalidoException

router = APIRouter(prefix="/api/insumos-quimicos", tags=["Insumos Químicos"])

# Listar lo puede hacer cualquier usuario logueado: los operadores necesitan ver los
# productos para registrar el consumo. Crear, editar y dar de baja es solo del administrador.
@router.get("", response_model=List[InsumoQuimicoResponse])
def listar(db: Session = Depends(get_db)):
    return InsumoQuimicoService.get_all(db)

@router.get(
    "/historico-consumo",
    response_model=ConsumoHistoricoResponse,
    dependencies=[Depends(requiere_admin)],
)
def historico_consumo(
    desde: Optional[date] = Query(None, description="Fecha de inicio del rango (YYYY-MM-DD)"),
    hasta: Optional[date] = Query(None, description="Fecha de fin del rango (YYYY-MM-DD)"),
    insumo_id: Optional[int] = Query(None, description="Filtrar por ID de insumo químico específico"),
    agrupacion_tiempo: AgrupacionTiempo = Query("dia", description="Agrupación temporal: dia, semana o mes"),
    unidad: Optional[str] = Query(None, description="Unidad de medida a filtrar (L, ML, KG, G, UN)"),
    db: Session = Depends(get_db),
):
    try:
        return obtener_historico_consumo(
            db=db,
            desde=desde,
            hasta=hasta,
            insumo_id=insumo_id,
            agrupacion_tiempo=agrupacion_tiempo,
            unidad=unidad,
        )
    except RangoFechasInvalidoException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except InsumoQuimicoException as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("", response_model=InsumoQuimicoResponse, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(requiere_admin)])
def crear(insumo: InsumoQuimicoCreate, db: Session = Depends(get_db)):
    try:
        return InsumoQuimicoService.create(db, insumo)
    except InsumoQuimicoException as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{insumo_id}", response_model=InsumoQuimicoResponse, dependencies=[Depends(requiere_admin)])
def actualizar(insumo_id: int, insumo: InsumoQuimicoUpdate, db: Session = Depends(get_db)):
    try:
        return InsumoQuimicoService.update(db, insumo_id, insumo)
    except InsumoQuimicoException as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{insumo_id}/toggle", response_model=InsumoQuimicoResponse, dependencies=[Depends(requiere_admin)])
def toggle_estado(insumo_id: int, db: Session = Depends(get_db)):
    try:
        return InsumoQuimicoService.toggle_estado(db, insumo_id)
    except InsumoQuimicoException as e:
        raise HTTPException(status_code=404, detail=str(e))
