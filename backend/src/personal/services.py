from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from . import models, schemas
import re
import unicodedata 
from src.autenticacion.services import hashear_contrasenia
from typing import Optional, Dict, Any, List

def obtener_personal_para_csv(
    db: Session,
    busqueda: Optional[str] = None,
    capacidad: Optional[str] = None,
    estado: Optional[str] = None
) -> List[Dict[str, Any]]:
    
    personas = db.query(models.Personal).all()
    filas = []
    term = busqueda.lower().strip() if busqueda else None

    for p in personas:
        doc_str = str(getattr(p, "documento", "") or getattr(p, "dni", "") or "")
        nombre_str = getattr(p, "nombre", "") or ""
        apellido_str = getattr(p, "apellido", "") or ""
        nombre_completo = f"{nombre_str} {apellido_str}".strip()
        usr = getattr(p, "usuario", "") or ""
        mail = getattr(p, "email", "") or ""

        # Filtro por búsqueda
        if term:
            coincide = (
                term in nombre_completo.lower()
                or term in doc_str
                or term in usr.lower()
                or term in mail.lower()
            )
            if not coincide:
                continue

        # Filtro por capacidad
        cap = getattr(p, "capacidad", "") or ""
        cap_val = cap.value if hasattr(cap, "value") else str(cap)
        if capacidad and capacidad != "TODOS":
            if cap_val.upper() != capacidad.upper():
                continue

        # Filtro por estado
        es_activo = bool(getattr(p, "activo", True))
        if estado and estado != "TODOS":
            if estado.upper() == "ACTIVO" and not es_activo:
                continue
            elif estado.upper() == "INACTIVO" and es_activo:
                continue

        # Formateo legible de la capacidad
        cap_map = {
            "OPERAR": "Operar",
            "ADMINISTRAR": "Administrar",
            "AMBAS": "Operar y Administrar",
        }
        cap_texto = cap_map.get(cap_val.upper(), cap_val or "-")

        filas.append({
            "legajo": getattr(p, "legajo", p.id if hasattr(p, "id") else ""),
            "documento": doc_str,
            "nombre_completo": nombre_completo,
            "usuario": usr,
            "email": mail,
            "capacidad": cap_texto,
            "estado": "Activo" if es_activo else "Inactivo",
        })

    return filas

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

def _normalizar(texto: str) -> str:  #Esta funcion convierte el texto a minuscula, elimina tildes y solo deja letras y numeros
    sin_tildes = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", sin_tildes.lower())

def generar_usuario(db: Session, nombre: str, apellido: str) -> str:
    # Inicial del primer nombre + apellido completo (sin espacios ni tildes)
    primer_nombre = _normalizar(nombre.split()[0]) #Normalizo el nombre y luego el apellido
    base = f"{primer_nombre}.{_normalizar(apellido)}"

    candidato = base
    contador = 2
    while db.query(models.Personal).filter(models.Personal.usuario == candidato).first():
        candidato = f"{base}{contador}"
        contador += 1
    return candidato

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
    usuario = generar_usuario(db, persona.nombre, persona.apellido)

    try:
        nuevo = models.Personal(
            usuario=usuario,
            nombre=persona.nombre,
            apellido=persona.apellido,
            documento=persona.documento,
            email=persona.email,
            activo=persona.activo,
            capacidad=persona.capacidad,
            contrasenia_hash=hashear_contrasenia(persona.contrasenia),
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
    contrasenia = datos_dict.pop("contrasenia", None)
    if contrasenia:
        datos_dict["contrasenia_hash"] = hashear_contrasenia(contrasenia)

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