from typing import List, Optional
from sqlalchemy import select, update, delete
from sqlalchemy.orm import Session

from src.personal.models import Personal
from src.personal import schemas

def crear_personal(db: Session, personal_in: schemas.PersonalCreate) -> Personal:
    _personal = Personal(**personal_in.model_dump())
    db.add(_personal)
    db.commit()
    db.refresh(_personal)
    return _personal

def listar_personal(db: Session) -> List[Personal]:
    return list(db.scalars(select(Personal)).all())

def leer_personal(db: Session, personal_legajo: int) -> Optional[Personal]:
    return db.scalar(select(Personal).where(Personal.legajo == personal_legajo))

def modificar_personal(
    db: Session,
    personal_legajo: int,
    personal_in: schemas.PersonalUpdate
) -> Optional[Personal]:
    db_personal = leer_personal(db, personal_legajo)
    if not db_personal:
        return None

    update_data = personal_in.model_dump(exclude_unset=True)
    if update_data:
        db.execute(
            update(Personal)
            .where(Personal.legajo == personal_legajo)
            .values(**update_data)
        )
        db.commit()
        db.refresh(db_personal)

    return db_personal

def eliminar_persona(db: Session, personal_legajo: int) -> Optional[Personal]:
    db_personal = leer_personal(db, personal_legajo)
    if not db_personal:
        return None

    db.execute(delete(Personal).where(Personal.legajo == personal_legajo))
    db.commit()
    return db_personal