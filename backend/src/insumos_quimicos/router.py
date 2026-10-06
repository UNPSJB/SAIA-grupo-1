from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from src.autenticacion.dependencies import requiere_admin
from src.database import get_db
from .schemas import InsumoQuimicoCreate, InsumoQuimicoUpdate, InsumoQuimicoResponse
from .services import InsumoQuimicoService
from .exceptions import InsumoQuimicoException

router = APIRouter(prefix="/api/insumos-quimicos", tags=["Insumos Químicos"])

# Listar lo puede hacer cualquier usuario logueado: los operadores necesitan ver los
# productos para registrar el consumo. Crear, editar y dar de baja es solo del administrador.
@router.get("", response_model=List[InsumoQuimicoResponse])
def listar(db: Session = Depends(get_db)):
    return InsumoQuimicoService.get_all(db)

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