from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import get_usuario_actual, requiere_admin
from src.database import get_db
from src.unidadesMedida import schemas, services
from src.utils.csv import generar_respuesta_csv

router = APIRouter(prefix="/unidades-medida", tags=["unidades-medida"])


@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_unidades_medida_csv(
    busqueda: Optional[str] = Query(None),
    solo_activos: bool = Query(False),
    db: Session = Depends(get_db),
):
    datos = services.obtener_unidades_para_csv(
        db, busqueda=busqueda, solo_activos=solo_activos
    )
    columnas = {
        "id": "ID",
        "nombre": "Nombre",
        "abreviatura": "Abreviatura",
        "totalReferencias": "Total Asociados",
        "estado": "Estado",
    }
    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo="unidades_medida.csv",
    )


@router.get(
    "/",
    response_model=List[schemas.UnidadMedidaResponse],
    dependencies=[Depends(get_usuario_actual)],
)
async def listar_unidades_medida_endpoint(
    solo_activos: bool = Query(False),
    busqueda: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return services.listar_unidades_medida(
        db, solo_activos=solo_activos, busqueda=busqueda
    )


@router.get(
    "/{unidad_id}",
    response_model=schemas.UnidadMedidaResponse,
    dependencies=[Depends(get_usuario_actual)],
)
async def obtener_unidad_medida_endpoint(unidad_id: int, db: Session = Depends(get_db)):
    unidad = services.obtener_unidad_medida(db, unidad_id)
    return services.construir_respuesta_unidad(db, unidad)


@router.post(
    "/",
    response_model=schemas.UnidadMedidaResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requiere_admin)],
)
async def crear_unidad_medida_endpoint(
    datos: schemas.UnidadMedidaCreate, db: Session = Depends(get_db)
):
    return services.crear_unidad_medida(db, datos)


@router.put(
    "/{unidad_id}",
    response_model=schemas.UnidadMedidaResponse,
    dependencies=[Depends(requiere_admin)],
)
async def actualizar_unidad_medida_endpoint(
    unidad_id: int,
    datos: schemas.UnidadMedidaUpdate,
    db: Session = Depends(get_db),
):
    return services.actualizar_unidad_medida(db, unidad_id, datos)


@router.delete(
    "/{unidad_id}",
    response_model=schemas.UnidadMedidaResponse,
    dependencies=[Depends(requiere_admin)],
)
async def eliminar_unidad_medida_endpoint(
    unidad_id: int,
    fisico: bool = Query(False),
    db: Session = Depends(get_db),
):
    return services.eliminar_unidad_medida(db, unidad_id, baja_logica=not fisico)


@router.post(
    "/{unidad_id}/restaurar",
    response_model=schemas.UnidadMedidaResponse,
    dependencies=[Depends(requiere_admin)],
)
@router.patch(
    "/{unidad_id}/reactivar",
    response_model=schemas.UnidadMedidaResponse,
    dependencies=[Depends(requiere_admin)],
)
async def restaurar_unidad_medida_endpoint(
    unidad_id: int,
    db: Session = Depends(get_db),
):
    return services.restaurar_unidad_medida(db, unidad_id)
