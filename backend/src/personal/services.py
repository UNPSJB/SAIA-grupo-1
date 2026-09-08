from typing import List, Optional
from sqlalchemy import select, update, delete
from sqlalchemy.orm import Session

from src.personal.models import Personal
from src.personal import schemas
from src.personal.schemas import Capacidades

def crear_personal(db: Session, personal_in: schemas.PersonalCreate) -> Personal:
    datos = personal_in.model_dump()
    lista_capacidades = datos.pop("capacidades", [])

    if lista_capacidades:
        primera = str(lista_capacidades[0]).lower()
        cap_enum = Capacidades.ADMINISTRAR if "admin" in primera else Capacidades.OPERAR
    else:
        cap_enum = Capacidades.OPERAR

    _personal = Personal(
        **datos,
        capacidad=cap_enum
    )
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
    
    if "capacidades" in update_data:
        lista_caps = update_data.pop("capacidades")
        if lista_caps:
            primera = str(lista_caps[0]).lower()
            update_data["capacidad"] = Capacidades.ADMINISTRAR if "admin" in primera else Capacidades.OPERAR

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

    db.execute(
        delete(Personal).where(Personal.legajo == personal_legajo)
    )
    db.commit()
    return db_personal