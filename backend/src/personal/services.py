from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from src.personal import schemas, models

def listar_personal(db: Session) -> List[models.Personal]:
    return db.query(models.Personal).all()

def leer_personal(db: Session, legajo: int) -> Optional[models.Personal]:
    return db.query(models.Personal).filter(models.Personal.legajo == legajo).first()

def crear_personal(db: Session, persona: schemas.PersonalCreate) -> models.Personal:
    # valida que el email no esté duplicado
    if db.query(models.Personal).filter(models.Personal.email == persona.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una persona registrada con ese correo electrónico."
        )

    #valida que el documento no esté duplicado
    doc_num = int(persona.documento)
    if db.query(models.Personal).filter(models.Personal.documento == doc_num).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una persona registrada con ese número de documento."
        )

    nueva_persona = models.Personal(
        documento=doc_num,
        nombre=persona.nombre,
        apellido=persona.apellido,
        email=persona.email,
        capacidad=persona.capacidad
    )
    db.add(nueva_persona)
    db.commit()
    db.refresh(nueva_persona)
    return nueva_persona

def modificar_personal(
    db: Session, legajo: int, persona_update: schemas.PersonalUpdate
) -> Optional[models.Personal]:
    persona_db = leer_personal(db, legajo)
    if not persona_db:
        return None

    datos = persona_update.model_dump(exclude_unset=True)

    if "email" in datos and datos["email"] != persona_db.email:
        if db.query(models.Personal).filter(models.Personal.email == datos["email"]).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una persona registrada con ese correo electrónico."
            )

    if "documento" in datos and datos["documento"] is not None:
        doc_num = int(datos["documento"])
        if doc_num != persona_db.documento:
            if db.query(models.Personal).filter(models.Personal.documento == doc_num).first():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ya existe una persona registrada con ese número de documento."
                )
        datos["documento"] = doc_num

    for campo, valor in datos.items():
        setattr(persona_db, campo, valor)

    db.commit()
    db.refresh(persona_db)
    return persona_db

def eliminar_persona(db: Session, legajo: int) -> Optional[models.Personal]:
    persona_db = leer_personal(db, legajo)
    if not persona_db:
        return None
    #db.delete(persona_db)
    persona_db.activo = False
    db.commit()
    return persona_db