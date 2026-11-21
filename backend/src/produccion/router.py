from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from src.database import get_db
from src.personal.models import Personal
from src.produccion import schemas, services
from src.autenticacion.dependencies import get_usuario_actual, requiere_operador
from src.utils.csv import generar_respuesta_csv
from src.utils.pdf import generar_respuesta_pdf

lotes_router = APIRouter(prefix="/lotes", tags=["Producción"])

@lotes_router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_lotes_csv(
    producto_id: Optional[int] = Query(None),
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    busqueda: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    datos = services.obtener_lotes_para_exportar(
        db, producto_id=producto_id, desde=desde, hasta=hasta, busqueda=busqueda
    )

    columnas = {
        "codigo": "Código",
        "fecha": "Fecha",
        "producto": "Producto",
        "cantidad": "Cantidad",
        "responsable": "Responsable",
        "insumos": "Insumos",
        "estado": "Estado",
    }

    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo="historial_lotes.csv",
    )


@lotes_router.get("/exportar-pdf", dependencies=[Depends(get_usuario_actual)])
def exportar_lotes_pdf(
    producto_id: Optional[int] = Query(None),
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    busqueda: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    datos = services.obtener_lotes_para_exportar(
        db, producto_id=producto_id, desde=desde, hasta=hasta, busqueda=busqueda
    )

    columnas = {
        "codigo": "Código",
        "fecha": "Fecha",
        "producto": "Producto",
        "cantidad": "Cantidad",
        "responsable": "Responsable",
        "insumos": "Insumos",
        "estado": "Estado",
    }

    return generar_respuesta_pdf(
        db=db,
        datos=datos,
        columnas=columnas,
        titulo_reporte="Historial de Lotes de Producción",
        nombre_archivo="historial_lotes.pdf",
    )

@lotes_router.post("/", response_model=schemas.LoteProduccion, status_code=status.HTTP_201_CREATED)
def registrar_lote_endpoint(
    datos: schemas.LoteProduccionCreate,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_operador),
):
    return services.registrar_lote(db, usuario.legajo, datos)


@lotes_router.get("/", response_model=List[schemas.LoteProduccion])
def listar_lotes_endpoint(
    producto_id: Optional[int] = Query(None),
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    version_receta_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    return services.listar_lotes(db, producto_id, desde, hasta, version_receta_id=version_receta_id)


# va antes de /{lote_id} para que "insumos-disponibles" no se tome como un id.
# /insumos es solo de administradores; el operador necesita ver el maestro para elegir qué usó.
@lotes_router.get("/insumos-disponibles", response_model=List[schemas.InsumoDisponible])
def listar_insumos_disponibles_endpoint(
    tipo_id: Optional[int] = Query(None), db: Session = Depends(get_db)
):
    return services.listar_insumos_disponibles(db, tipo_id=tipo_id)


@lotes_router.get("/{lote_id}", response_model=schemas.LoteProduccion)
def leer_lote_endpoint(lote_id: int, db: Session = Depends(get_db)):
    return services.leer_lote(db, lote_id)


@lotes_router.post(
    "/{lote_id}/insumos", response_model=schemas.LoteProduccion, status_code=status.HTTP_201_CREATED
)
def asociar_insumos_endpoint(
    lote_id: int,
    datos: schemas.AsociarInsumos,
    db: Session = Depends(get_db),
    _: Personal = Depends(requiere_operador),
):
    return services.asociar_insumos(db, lote_id, datos)


@lotes_router.delete("/{lote_id}/insumos/{insumo_id}", response_model=schemas.LoteProduccion)
def quitar_insumo_endpoint(
    lote_id: int,
    insumo_id: int,
    db: Session = Depends(get_db),
    _: Personal = Depends(requiere_operador),
):
    return services.quitar_insumo(db, lote_id, insumo_id)
