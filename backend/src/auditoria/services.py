from typing import List, Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.orm import Session
from src.auditoria.models import Auditoria
from src.auditoria import schemas, exceptions 

# operaciones para Auditoria (registro de solo lectura/escritura, sin update/delete: es inmutable)

def obtener_auditorias_para_csv(
    db: Session,
    busqueda: Optional[str] = None,
    accion: Optional[str] = None,
    tabla: Optional[str] = None
) -> List[Dict[str, Any]]:
    
    query = select(Auditoria)
    auditorias = db.scalars(query).all()
    filas = []
    term = busqueda.lower().strip() if busqueda else None

    for a in auditorias:
        tabla_str = getattr(a, "tabla", "") or ""
        accion_upper = (getattr(a, "accion", "") or "").upper()
        if hasattr(a.accion, "value"):
            accion_upper = str(a.accion.value).upper()

        campo_str = getattr(a, "campo", "") or ""
        v_previo = getattr(a, "valor_previo", "") or ""
        v_posterior = getattr(a, "valor_posterior", "") or ""
        reg_id = str(getattr(a, "registro_id", "") or "")

        # Filtro por término de búsqueda
        if term:
            coincide = (
                term in tabla_str.lower()
                or term in accion_upper.lower()
                or term in campo_str.lower()
                or term in v_previo.lower()
                or term in v_posterior.lower()
                or term in reg_id
            )
            if not coincide:
                continue

        # Filtro por acción
        if accion and accion != "TODAS":
            if accion_upper != accion.upper():
                continue

        # Filtro por tabla
        if tabla and tabla != "TODAS":
            if tabla_str.lower() != tabla.lower():
                continue

        # Formateo de fecha
        f_creado = getattr(a, "creado_el", None)
        str_creado = f_creado.strftime("%Y-%m-%d %H:%M:%S") if hasattr(f_creado, "strftime") and f_creado else "-"

        filas.append({
            "id": a.id,
            "tabla": tabla_str,
            "registro_id": reg_id,
            "accion": accion_upper,
            "campo": campo_str or "No aplica",
            "valor_previo": v_previo or "No aplica",
            "valor_posterior": v_posterior or "No aplica",
            "creado_el": str_creado,
        })

    return filas

def registrar_auditoria(
    db: Session, auditoria: schemas.AuditoriaCreate, commit: bool = True
) -> Auditoria:
    # commit=False permite que el llamador incluya el registro en su propia
    # transaccion (se guarda junto con el cambio auditado, o no se guarda).
    _auditoria = Auditoria(**auditoria.model_dump())
    db.add(_auditoria)
    if commit:
        db.commit()
        db.refresh(_auditoria)
    return _auditoria


def listar_auditorias(
    db: Session, tabla: Optional[str] = None, registro_id: Optional[int] = None
) -> List[Auditoria]:
    query = select(Auditoria)
    if tabla is not None:
        query = query.where(Auditoria.tabla == tabla)
    if registro_id is not None:
        query = query.where(Auditoria.registro_id == registro_id)
    return list(db.scalars(query).all())


def leer_auditoria(db: Session, auditoria_id: int) -> Auditoria:
    db_auditoria = db.scalar(select(Auditoria).where(Auditoria.id == auditoria_id))
    if db_auditoria is None:
        raise exceptions.AuditoriaNoEncontrada()
    return db_auditoria
