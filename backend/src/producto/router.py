import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import get_usuario_actual, requiere_admin
from src.database import get_db
from src.producto import schemas, services
from src.utils.csv import generar_respuesta_csv

router = APIRouter(prefix="/productos", tags=["productos"])

@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_productos_csv(
    activo: Optional[bool] = None,
    busqueda: Optional[str] = None,
    db: Session = Depends(get_db)
):
    datos = services.obtener_productos_para_csv(db, activo=activo, busqueda=busqueda)
    
    columnas = {
        "id": "ID",
        "nombre": "Nombre del Producto",
        "unidadMedida": "Unidad de Medida",
        "receta": "Receta Asociada",
        "descripcion": "Descripción",
        "estado": "Estado"
    }
    
    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo="productos_elaborados.csv"
    )


@router.post("/", response_model=schemas.ProductoResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(requiere_admin)])
async def create_producto(
    producto: schemas.ProductoCreate,
    db: Session = Depends(get_db),
):
    return services.crear_producto(db, producto)


@router.get("/", response_model=List[schemas.ProductoResponse], dependencies=[Depends(get_usuario_actual)])
async def read_productos(db: Session = Depends(get_db)):
    return services.listar_productos(db)


@router.get("/{producto_id}", response_model=schemas.ProductoResponse, dependencies=[Depends(get_usuario_actual)])
async def read_producto(producto_id: int, db: Session = Depends(get_db)):
    return services.obtener_producto(db, producto_id)


@router.put("/{producto_id}", response_model=schemas.ProductoResponse, dependencies=[Depends(requiere_admin)])
async def update_producto(
    producto_id: int,
    producto: schemas.ProductoUpdate,
    db: Session = Depends(get_db),
):
    return services.editar_producto(db, producto_id, producto)


@router.delete("/{producto_id}", response_model=schemas.ProductoResponse, dependencies=[Depends(requiere_admin)])
async def delete_producto(producto_id: int, db: Session = Depends(get_db)):
    return services.eliminar_producto(db, producto_id)


@router.post("/{producto_id}/restaurar", response_model=schemas.ProductoResponse, dependencies=[Depends(requiere_admin)])
async def restore_producto(producto_id: int, db: Session = Depends(get_db)):
    return services.restaurar_producto(db, producto_id)