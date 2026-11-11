from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import get_usuario_actual, requiere_admin
from src.database import get_db
from src.tipoInsumo import schemas, services
from src.utils.csv import generar_respuesta_csv

router = APIRouter(prefix="/insumos/tipos", tags=["tipos_insumos"])


@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_tipos_insumos_csv(
    busqueda: Optional[str] = Query(None),
    solo_activos: bool = Query(False),
    db: Session = Depends(get_db),
):
    datos = services.obtener_tipos_insumos_para_csv(
        db, busqueda=busqueda, solo_activos=solo_activos
    )
    columnas = {
        "id": "ID",
        "nombre": "Nombre del Tipo de Insumo",
        "descripcion": "Descripción",
        "unidadMedida": "Unidad de Medida",
        "stockTotal": "Stock Total",
        "totalLotes": "Total de Lotes",
        "estado": "Estado",
    }
    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo="tipos_insumos.csv",
    )


@router.get(
    "/",
    response_model=List[schemas.TipoInsumo],
    dependencies=[Depends(get_usuario_actual)],
)
async def listar_tipos_insumos_endpoint(
    solo_activos: bool = Query(False),
    busqueda: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return services.listar_tipos_insumos(
        db, solo_activos=solo_activos, busqueda=busqueda
    )


@router.get(
    "/{tipo_id}",
    response_model=schemas.TipoInsumo,
    dependencies=[Depends(get_usuario_actual)],
)
async def obtener_tipo_insumo_endpoint(tipo_id: int, db: Session = Depends(get_db)):
    tipo = services.obtener_tipo_insumo(db, tipo_id)
    return services.serializar_tipo_insumo(tipo)


@router.get(
    "/{tipo_id}/detalle",
    response_model=schemas.TipoInsumoDetalle,
    dependencies=[Depends(get_usuario_actual)],
)
async def obtener_tipo_insumo_detalle_endpoint(tipo_id: int, db: Session = Depends(get_db)):
    return services.obtener_tipo_insumo_detalle(db, tipo_id)


@router.post(
    "/",
    response_model=schemas.TipoInsumo,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requiere_admin)],
)
async def crear_tipo_insumo_endpoint(
    datos: schemas.TipoInsumoCreate, db: Session = Depends(get_db)
):
    tipo = services.crear_tipo_insumo(db, datos)
    return services.serializar_tipo_insumo(tipo)


@router.put(
    "/{tipo_id}",
    response_model=schemas.TipoInsumo,
    dependencies=[Depends(requiere_admin)],
)
async def actualizar_tipo_insumo_endpoint(
    tipo_id: int,
    datos: schemas.TipoInsumoUpdate,
    db: Session = Depends(get_db),
):
    tipo = services.actualizar_tipo_insumo(db, tipo_id, datos)
    return services.serializar_tipo_insumo(tipo)


@router.delete(
    "/{tipo_id}",
    response_model=schemas.TipoInsumo,
    dependencies=[Depends(requiere_admin)],
)
async def eliminar_tipo_insumo_endpoint(
    tipo_id: int,
    fisico: bool = Query(False),
    db: Session = Depends(get_db),
):
    tipo = services.eliminar_tipo_insumo(db, tipo_id, baja_logica=not fisico)
    return services.serializar_tipo_insumo(tipo)


@router.post(
    "/{tipo_id}/restaurar",
    response_model=schemas.TipoInsumo,
    dependencies=[Depends(requiere_admin)],
)
@router.patch(
    "/{tipo_id}/reactivar",
    response_model=schemas.TipoInsumo,
    dependencies=[Depends(requiere_admin)],
)
async def restaurar_tipo_insumo_endpoint(
    tipo_id: int,
    db: Session = Depends(get_db),
):
    tipo = services.restaurar_tipo_insumo(db, tipo_id)
    return services.serializar_tipo_insumo(tipo)
