from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.insumos import schemas, services
from typing import Optional
from src.utils.csv import generar_respuesta_csv
from src.autenticacion.dependencies import get_usuario_actual

router = APIRouter()

@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_insumos_csv(
    busqueda: Optional[str] = None,
    unidad: Optional[str] = None,
    vencimiento: Optional[str] = None,
    db: Session = Depends(get_db)
):
   
    datos = services.obtener_insumos_para_csv(
        db, busqueda=busqueda, unidad=unidad, vencimiento=vencimiento
    )

    columnas = {
        "id": "ID",
        "nombre": "Nombre del Ingrediente",
        "lote": "Lote",
        "stock": "Stock Actual",
        "cantRecibida": "Cantidad Recibida",
        "medida": "Unidad de Medida",
        "fechaRecepcion": "Fecha de Recepción",
        "fechaVencimiento": "Fecha de Vencimiento",
        "estadoVencimiento": "Estado de Vencimiento",
    }

    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo="ingredientes.csv",
    )

@router.post("/", response_model=schemas.Insumo)
def create_insumo(insumo: schemas.InsumoCreate, db: Session = Depends(get_db)):
    return services.crear_insumo(db, insumo)

@router.get("/", response_model=list[schemas.Insumo])
def read_insumos(db: Session = Depends(get_db)):
    return services.listar_insumos(db)

@router.get("/{insumo_id}", response_model=schemas.Insumo)
def read_insumo(insumo_id: int, db: Session = Depends(get_db)):
    return services.leer_insumo(db, insumo_id)

@router.patch("/{insumo_id}", response_model=schemas.Insumo)
def update_insumo(
    insumo_id: int, insumo: schemas.InsumoUpdate, db: Session = Depends(get_db)
):
    return services.modificar_insumo(db, insumo_id, insumo)

@router.delete("/{insumo_id}", response_model=schemas.InsumoDelete)
def delete_insumo(insumo_id: int, db: Session = Depends(get_db)):
    return services.eliminar_insumo(db, insumo_id)

@router.patch("/{insumo_id}/stock", response_model=schemas.Insumo)
def update_insumo_stock(
    insumo_id: int, insumo: schemas.InsumoUpdateStock, db: Session = Depends(get_db)
):
    return services.modificar_stock(db, insumo_id, insumo)