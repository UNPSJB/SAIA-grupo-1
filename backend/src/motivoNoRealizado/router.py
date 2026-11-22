from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import get_usuario_actual, requiere_admin
from src.database import get_db
from src.motivoNoRealizado import schemas, services
from src.utils.csv import generar_respuesta_csv
from src.utils.pdf import generar_respuesta_pdf 

router = APIRouter(tags=["motivos_no_realizado"])

@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_motivos_csv(
    busqueda: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    ordenar_por: Optional[str] = Query("id"),
    db: Session = Depends(get_db),
):
    datos = services.obtener_motivos_para_exportar(
        db, busqueda=busqueda, estado=estado, ordenar_por=ordenar_por
    )

    columnas = {
        "id": "ID",
        "nombre": "Nombre del Motivo",
        "estado": "Estado",
    }

    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo="motivos_no_realizacion.csv",
    )


@router.get("/exportar-pdf", dependencies=[Depends(get_usuario_actual)])
def exportar_motivos_pdf(
    busqueda: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    ordenar_por: Optional[str] = Query("id"),
    db: Session = Depends(get_db),
):
    datos = services.obtener_motivos_para_exportar(
        db, busqueda=busqueda, estado=estado, ordenar_por=ordenar_por
    )

    columnas = {
        "id": "ID",
        "nombre": "Nombre del Motivo",
        "estado": "Estado",
    }

    return generar_respuesta_pdf(
        db=db,
        datos=datos,
        columnas=columnas,
        titulo_reporte="Listado de Motivos de No Realización",
        nombre_archivo="motivos_no_realizacion.pdf",
    )

@router.get("/", response_model=List[schemas.Motivo], dependencies=[Depends(get_usuario_actual)])
def listar_motivos(
    solo_activos: bool = Query(False),
    db: Session = Depends(get_db),
):
    return services.listar_motivos(db, solo_activos=solo_activos)

@router.get("/{motivo_id}", response_model=schemas.Motivo, dependencies=[Depends(get_usuario_actual)])
def obtener_motivo(motivo_id: int, db: Session = Depends(get_db)):
    return services.obtener_motivo(db, motivo_id)

@router.post("/", response_model=schemas.Motivo, status_code=status.HTTP_201_CREATED, dependencies=[Depends(requiere_admin)])
def crear_motivo(datos: schemas.MotivoCreate, db: Session = Depends(get_db)):
    return services.crear_motivo(db, datos)

@router.patch("/{motivo_id}/estado", response_model=schemas.Motivo, dependencies=[Depends(requiere_admin)])
def cambiar_estado_motivo_patch(
    motivo_id: int, datos: schemas.MotivoCambiarEstado, db: Session = Depends(get_db)
):
    return services.cambiar_estado_motivo(db, motivo_id, datos.activo)

@router.put("/{motivo_id}", response_model=schemas.Motivo, dependencies=[Depends(requiere_admin)])
def cambiar_estado_motivo_put(
    motivo_id: int, datos: schemas.MotivoCambiarEstado, db: Session = Depends(get_db)
):
    return services.cambiar_estado_motivo(db, motivo_id, datos.activo)
