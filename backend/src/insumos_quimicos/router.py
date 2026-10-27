from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from src.autenticacion.dependencies import requiere_admin, get_usuario_actual
from src.database import get_db
from .schemas import InsumoQuimicoCreate, InsumoQuimicoUpdate, InsumoQuimicoResponse
from src.insumos_quimicos import services
from .exceptions import InsumoQuimicoException
from src.utils.csv import generar_respuesta_csv 

router = APIRouter(prefix="/api/insumos-quimicos", tags=["Insumos Químicos"])

@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_csv(
    busqueda: Optional[str] = None,
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Exporta la lista de insumos químicos a formato CSV respetando los filtros activos.
    """
    datos = services.obtener_para_csv(
        db, busqueda=busqueda, tipo=tipo, estado=estado
    )

    columnas = {
        "id": "ID",
        "nombre": "Nombre del Insumo",
        "tipo": "Tipo de Insumo",
        "stock_actual": "Stock Actual",
        "unidad_medida": "Unidad de Medida",
        "estado": "Estado",
    }

    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo="insumos_quimicos.csv"
    )

# Listar lo puede hacer cualquier usuario logueado: los operadores necesitan ver los
# productos para registrar el consumo. Crear, editar y dar de baja es solo del administrador.
@router.get("", response_model=List[InsumoQuimicoResponse])
def listar(db: Session = Depends(get_db)):
    return services.get_all(db)

@router.post("", response_model=InsumoQuimicoResponse, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(requiere_admin)])
def crear(insumo: InsumoQuimicoCreate, db: Session = Depends(get_db)):
    try:
        return services.create(db, insumo)
    except InsumoQuimicoException as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{insumo_id}", response_model=InsumoQuimicoResponse, dependencies=[Depends(requiere_admin)])
def actualizar(insumo_id: int, insumo: InsumoQuimicoUpdate, db: Session = Depends(get_db)):
    try:
        return services.update(db, insumo_id, insumo)
    except InsumoQuimicoException as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{insumo_id}/toggle", response_model=InsumoQuimicoResponse, dependencies=[Depends(requiere_admin)])
def toggle_estado(insumo_id: int, db: Session = Depends(get_db)):
    try:
        return services.toggle_estado(db, insumo_id)
    except InsumoQuimicoException as e:
        raise HTTPException(status_code=404, detail=str(e))