from sqlalchemy.orm import Session
from .models import InsumoQuimico
from .schemas import InsumoQuimicoCreate, InsumoQuimicoUpdate
from .exceptions import InsumoQuimicoNotFoundException, InsumoQuimicoDuplicateNameException
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional, Any, Dict, List

def obtener_para_csv(
    db: Session,
    busqueda: Optional[str] = None,
    tipo: Optional[str] = None,
    estado: Optional[str] = None
) -> List[Dict[str, Any]]:
    query = db.query(InsumoQuimico)

    if estado and estado != "TODOS":
        if estado.upper() == "ACTIVO":
            query = query.filter(InsumoQuimico.activo == True)
        elif estado.upper() == "INACTIVO":
            query = query.filter(InsumoQuimico.activo == False)

    if tipo and tipo != "TODOS":
        query = query.filter(InsumoQuimico.tipo == tipo)

    insumos = query.all()
    filas = []
    term = busqueda.lower().strip() if busqueda else None

    for item in insumos:
        nombre = getattr(item, "nombre", "") or ""
            
        if term and term not in nombre.lower():
            continue

        tipo_val = item.tipo.value if hasattr(item.tipo, "value") else str(item.tipo or "")
        unidad_val = item.unidad_medida.value if hasattr(item.unidad_medida, "value") else str(item.unidad_medida or "")

        filas.append({
            "id": item.id,
            "nombre": nombre,
            "tipo": tipo_val,
            "stock_actual": getattr(item, "stock_actual", 0),
            "unidad_medida": unidad_val,
            "estado": "Activo" if item.activo else "Inactivo",
        })

    return filas

def get_all(db: Session, skip: int = 0, limit: int = 100, solo_activos: bool = False):
    query = db.query(InsumoQuimico)
    if solo_activos:
        query = query.filter(InsumoQuimico.activo == True)
    return query.offset(skip).limit(limit).all()

def get_by_id(db: Session, insumo_id: int):
    insumo = db.query(InsumoQuimico).filter(InsumoQuimico.id == insumo_id).first()
    if not insumo:
        raise InsumoQuimicoNotFoundException(insumo_id)
    return insumo

   
def create(db: Session, data: InsumoQuimicoCreate):
    existente = db.query(InsumoQuimico).filter(
        InsumoQuimico.nombre.ilike(data.nombre), 
        InsumoQuimico.activo == True
    ).first()
    if existente:
        raise InsumoQuimicoDuplicateNameException(data.nombre)

    nuevo = InsumoQuimico(**data.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def update(db: Session, insumo_id: int, data: InsumoQuimicoUpdate):
    insumo = get_by_id(db, insumo_id)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(insumo, key, value)
    db.commit()
    db.refresh(insumo)
    return insumo


def toggle_estado(db: Session, insumo_id: int):
    insumo = get_by_id(db, insumo_id)
    insumo.activo = not insumo.activo  # type: ignore
    db.commit()
        
    return insumo