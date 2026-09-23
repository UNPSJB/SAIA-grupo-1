from sqlalchemy.orm import Session
from .models import InsumoQuimico
from .schemas import InsumoQuimicoCreate, InsumoQuimicoUpdate
from .exceptions import InsumoQuimicoNotFoundException, InsumoQuimicoDuplicateNameException
from sqlalchemy.orm import Mapped, mapped_column

class InsumoQuimicoService:
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100, solo_activos: bool = False):
        query = db.query(InsumoQuimico)
        if solo_activos:
            query = query.filter(InsumoQuimico.activo == True)
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_by_id(db: Session, insumo_id: int):
        insumo = db.query(InsumoQuimico).filter(InsumoQuimico.id == insumo_id).first()
        if not insumo:
            raise InsumoQuimicoNotFoundException(insumo_id)
        return insumo

    @staticmethod
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

    @staticmethod
    def update(db: Session, insumo_id: int, data: InsumoQuimicoUpdate):
        insumo = InsumoQuimicoService.get_by_id(db, insumo_id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(insumo, key, value)
        db.commit()
        db.refresh(insumo)
        return insumo

    @staticmethod
    def toggle_estado(db: Session, insumo_id: int):
        insumo = InsumoQuimicoService.get_by_id(db, insumo_id)
        insumo.activo = not insumo.activo  # type: ignore
        db.commit()
        
        return insumo