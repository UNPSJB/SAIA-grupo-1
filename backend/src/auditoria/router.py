from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.auditoria import schemas, services

router = APIRouter(prefix="/auditoria", tags=["auditoria"])


# No hay POST: los registros de auditoria se generan internamente
# (services.registrar_auditoria) como efecto secundario de otras acciones
# del sistema, no por un request directo de un cliente.


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
