from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from . import models, schemas

def listar_personal(db: Session):
    return db.query(models.Personal).all()

def obtener_personal_por_legajo(db: Session, legajo: int):
    persona = db.query(models.Personal).filter(models.Personal.legajo == legajo).first()
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Persona no encontrada."
        )
    return persona

def crear_personal(db: Session, persona: schemas.PersonalCreate):
    existe_doc = db.query(models.Personal).filter(models.Personal.documento == persona.documento).first()
    if existe_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe una persona registrada con el DNI {persona.documento}."
        )

    existe_email = db.query(models.Personal).filter(models.Personal.email == persona.email).first()
    if existe_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El correo electrónico {persona.email} ya está registrado."
        )

    try:
        nuevo = models.Personal(
            nombre=persona.nombre,
            apellido=persona.apellido,
            documento=persona.documento,
            email=persona.email,
            activo=persona.activo,
            capacidad=persona.capacidad,
        )
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)
        return nuevo
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de duplicidad: el DNI o el correo electrónico ya existen en la base de datos."
        )

def actualizar_personal(db: Session, legajo: int, datos: schemas.PersonalUpdate):
    persona = db.query(models.Personal).filter(models.Personal.legajo == legajo).first()
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Persona no encontrada."
        )

    datos_dict = datos.model_dump(exclude_unset=True)
    datos_dict.pop("telefono", None)

    if "documento" in datos_dict and datos_dict["documento"] is not None:
        doc_duplicado = db.query(models.Personal).filter(
            models.Personal.documento == datos_dict["documento"],
            models.Personal.legajo != legajo
        ).first()
        if doc_duplicado:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe otra persona registrada con el DNI {datos_dict['documento']}."
            )

    if "email" in datos_dict and datos_dict["email"] is not None:
        email_duplicado = db.query(models.Personal).filter(
            models.Personal.email == datos_dict["email"],
            models.Personal.legajo != legajo
        ).first()
        if email_duplicado:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El correo electrónico {datos_dict['email']} ya está en uso."
            )

    try:
        for clave, valor in datos_dict.items():
            setattr(persona, clave, valor)
        db.commit()
        db.refresh(persona)
        return persona
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conflicto de datos: DNI o correo duplicado."
        )