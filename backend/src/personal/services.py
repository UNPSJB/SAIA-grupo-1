import logging
from typing import List
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.personal.models import Personal
from src.personal import schemas, exceptions


logger = logging.getLogger(__name__)

# operaciones CRUD para Personal

def crear_personal(db: Session, personal: schemas.PersonalCreate) -> schemas.Personal:
    _personal = Personal(**personal.model_dump())
    db.add(_personal)
    db.commit()
    db.refresh(_personal)
    return _personal


def listar_personal(db: Session) -> List[schemas.Personal]:
    logger.info("Listando personal desde services")  # <- este mensaje se verá por la terminal
    return db.scalars(select(Personal)).all()


def leer_personal(db: Session, personal_legajo: int) -> schemas.Personal:
    db_personal = db.scalar(select(Personal).where(Personal.legajo == personal_legajo))
    if db_personal is None:
        raise exceptions.PersonalNoEncontrado()
    return db_personal


def modificar_personal(
    db: Session, personal_legajo: int, personal: schemas.PersonalUpdate
) -> Personal:
    db_personal = leer_personal(db, personal_legajo)
    db.execute(
        update(Personal).where(Personal.legajo == personal_legajo).values(**personal.model_dump())
    )
    db.commit()
    db.refresh(db_personal)
    return db_personal


def eliminar_persona(db: Session, personal_legajo: int) -> schemas.Personal:
    db_personal = leer_personal(db, personal_legajo)
    db.execute(delete(Personal).where(Personal.legajo == personal_legajo))
    db.commit()
    return db_personal
