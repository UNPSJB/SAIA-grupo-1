from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import get_usuario_actual, requiere_admin
from src.database import get_db
from src.proveedores import schemas, services
from src.utils.csv import generar_respuesta_csv

router = APIRouter(prefix="/proveedores", tags=["proveedores"])


@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_proveedores_csv(
    busqueda: Optional[str] = Query(None),
    solo_activos: bool = Query(False),
    db: Session = Depends(get_db),
):
    datos = services.obtener_proveedores_para_csv(
        db, busqueda=busqueda, solo_activos=solo_activos
    )
    columnas = {
        "id": "ID",
        "nombre": "Nombre del Proveedor",
        "cuit": "CUIT",
        "contacto": "Contacto",
        "telefono": "Teléfono",
        "email": "Email",
        "direccion": "Dirección",
        "totalInsumos": "Total Insumos",
        "estado": "Estado",
    }
    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo="proveedores.csv",
    )


@router.get(
    "/",
    response_model=List[schemas.Proveedor],
    dependencies=[Depends(get_usuario_actual)],
)
async def listar_proveedores_endpoint(
    solo_activos: bool = Query(False),
    busqueda: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return services.listar_proveedores(
        db, solo_activos=solo_activos, busqueda=busqueda
    )


@router.get(
    "/{proveedor_id}",
    response_model=schemas.Proveedor,
    dependencies=[Depends(get_usuario_actual)],
)
async def obtener_proveedor_endpoint(proveedor_id: int, db: Session = Depends(get_db)):
    p = services.obtener_proveedor(db, proveedor_id)
    return schemas.Proveedor(
        id=p.id,
        nombre=p.nombre,
        cuit=p.cuit,
        contacto=p.contacto,
        telefono=p.telefono,
        email=p.email,
        direccion=p.direccion,
        activo=p.activo,
        total_insumos=len(p.insumos) if p.insumos else 0,
    )


@router.post(
    "/",
    response_model=schemas.Proveedor,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requiere_admin)],
)
async def crear_proveedor_endpoint(
    datos: schemas.ProveedorCreate, db: Session = Depends(get_db)
):
    p = services.crear_proveedor(db, datos)
    return schemas.Proveedor(
        id=p.id,
        nombre=p.nombre,
        cuit=p.cuit,
        contacto=p.contacto,
        telefono=p.telefono,
        email=p.email,
        direccion=p.direccion,
        activo=p.activo,
        total_insumos=0,
    )


@router.put(
    "/{proveedor_id}",
    response_model=schemas.Proveedor,
    dependencies=[Depends(requiere_admin)],
)
async def actualizar_proveedor_endpoint(
    proveedor_id: int,
    datos: schemas.ProveedorUpdate,
    db: Session = Depends(get_db),
):
    p = services.actualizar_proveedor(db, proveedor_id, datos)
    return schemas.Proveedor(
        id=p.id,
        nombre=p.nombre,
        cuit=p.cuit,
        contacto=p.contacto,
        telefono=p.telefono,
        email=p.email,
        direccion=p.direccion,
        activo=p.activo,
        total_insumos=len(p.insumos) if p.insumos else 0,
    )


@router.delete(
    "/{proveedor_id}",
    response_model=schemas.Proveedor,
    dependencies=[Depends(requiere_admin)],
)
async def eliminar_proveedor_endpoint(
    proveedor_id: int,
    fisico: bool = Query(False),
    db: Session = Depends(get_db),
):
    p = services.eliminar_proveedor(db, proveedor_id, baja_logica=not fisico)
    return schemas.Proveedor(
        id=p.id,
        nombre=p.nombre,
        cuit=p.cuit,
        contacto=p.contacto,
        telefono=p.telefono,
        email=p.email,
        direccion=p.direccion,
        activo=p.activo,
        total_insumos=len(p.insumos) if p.insumos else 0,
    )
