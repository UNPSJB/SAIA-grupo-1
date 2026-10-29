from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.auditoria import schemas, services
from src.autenticacion.dependencies import get_usuario_actual
from src.utils.csv import generar_respuesta_csv

router = APIRouter(prefix="/auditoria", tags=["auditoria"])


# No hay POST: los registros de auditoria se generan internamente
# (services.registrar_auditoria) como efecto secundario de otras acciones
# del sistema, no por un request directo de un cliente.


@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_auditoria_csv(
    busqueda: Optional[str] = None,
    accion: Optional[str] = None,
    tabla: Optional[str] = None,
    db: Session = Depends(get_db)
):
    
    datos = services.obtener_auditorias_para_csv(
        db, busqueda=busqueda, accion=accion, tabla=tabla
    )

    columnas = {
        "id": "ID",
        "tabla": "Tabla",
        "registro_id": "ID de Registro",
        "accion": "Acción",
        "campo": "Campo Modificado",
        "valor_previo": "Valor Previo",
        "valor_posterior": "Valor Posterior",
        "creado_el": "Fecha y Hora"
    }

    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo="auditoria.csv"
    )

@router.get("/", response_model=list[schemas.Auditoria])
def read_auditorias(
    tabla: Optional[str] = None,
    registro_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    return services.listar_auditorias(db, tabla, registro_id)


@router.get("/{auditoria_id}", response_model=schemas.Auditoria)
def read_auditoria(auditoria_id: int, db: Session = Depends(get_db)):
    return services.leer_auditoria(db, auditoria_id)
