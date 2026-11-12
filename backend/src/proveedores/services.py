from typing import Any, Dict, List, Optional
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session
from src.proveedores import exceptions, models, schemas


def normalizar_nombre(nombre: str) -> str:
    return " ".join(nombre.strip().split())


def clave_comparacion(nombre: str) -> str:
    return normalizar_nombre(nombre).replace(" ", "").lower()


def validar_nombre_unico(db: Session, nombre: str, excluir_id: Optional[int] = None) -> None:
    clave = clave_comparacion(nombre)
    consulta = select(models.Proveedor).where(
        func.lower(func.replace(models.Proveedor.nombre, " ", "")) == clave
    )
    if excluir_id is not None:
        consulta = consulta.where(models.Proveedor.id != excluir_id)
    existente = db.scalar(consulta)
    if existente:
        raise exceptions.NombreDuplicado()


def crear_proveedor(db: Session, datos: schemas.ProveedorCreate) -> models.Proveedor:
    nombre_normalizado = normalizar_nombre(datos.nombre)
    validar_nombre_unico(db, nombre_normalizado)
    proveedor = models.Proveedor(
        nombre=nombre_normalizado,
        cuit=datos.cuit,
        contacto=datos.contacto,
        telefono=datos.telefono,
        email=datos.email,
        direccion=datos.direccion,
        activo=True,
    )
    db.add(proveedor)
    db.commit()
    db.refresh(proveedor)
    return proveedor


def listar_proveedores(
    db: Session, solo_activos: bool = False, busqueda: Optional[str] = None
) -> List[schemas.Proveedor]:
    from src.insumos.models import Insumo
    consulta = select(models.Proveedor).order_by(models.Proveedor.nombre.asc())
    if solo_activos:
        consulta = consulta.where(models.Proveedor.activo == True)
    if busqueda and busqueda.strip():
        termino = f"%{busqueda.strip()}%"
        consulta = consulta.where(
            models.Proveedor.nombre.ilike(termino)
            | models.Proveedor.contacto.ilike(termino)
            | models.Proveedor.email.ilike(termino)
        )
    proveedores = list(db.scalars(consulta).all())
    resultado: List[schemas.Proveedor] = []
    for p in proveedores:
        total = db.scalar(
            select(func.count(Insumo.id)).where(Insumo.proveedor_id == p.id)
        ) or 0
        resultado.append(
            schemas.Proveedor(
                id=p.id,
                nombre=p.nombre,
                cuit=p.cuit,
                contacto=p.contacto,
                telefono=p.telefono,
                email=p.email,
                direccion=p.direccion,
                activo=p.activo,
                total_insumos=total,
            )
        )
    return resultado


def obtener_proveedor(db: Session, proveedor_id: int) -> models.Proveedor:
    proveedor = db.get(models.Proveedor, proveedor_id)
    if not proveedor:
        raise exceptions.ProveedorNoEncontrado()
    return proveedor


def actualizar_proveedor(
    db: Session, proveedor_id: int, datos: schemas.ProveedorUpdate
) -> models.Proveedor:
    proveedor = obtener_proveedor(db, proveedor_id)
    datos_dict = datos.model_dump(exclude_unset=True)
    if "nombre" in datos_dict and datos_dict["nombre"] is not None:
        nombre_normalizado = normalizar_nombre(datos_dict["nombre"])
        validar_nombre_unico(db, nombre_normalizado, excluir_id=proveedor_id)
        proveedor.nombre = nombre_normalizado
    for campo in ("cuit", "contacto", "telefono", "email", "direccion"):
        if campo in datos_dict:
            setattr(proveedor, campo, datos_dict[campo])
    if "activo" in datos_dict and datos_dict["activo"] is not None:
        proveedor.activo = datos_dict["activo"]
    db.commit()
    db.refresh(proveedor)
    return proveedor


def eliminar_proveedor(db: Session, proveedor_id: int, baja_logica: bool = True) -> models.Proveedor:
    from src.insumos.models import Insumo
    proveedor = obtener_proveedor(db, proveedor_id)
    cant_insumos = db.scalar(
        select(func.count(Insumo.id)).where(Insumo.proveedor_id == proveedor_id)
    )
    if cant_insumos and cant_insumos > 0:
        raise exceptions.ProveedorEnUso()
    if baja_logica:
        proveedor.activo = False
        db.commit()
        db.refresh(proveedor)
        return proveedor
    db.execute(delete(models.Proveedor).where(models.Proveedor.id == proveedor_id))
    db.commit()
    return proveedor


def restaurar_proveedor(db: Session, proveedor_id: int) -> models.Proveedor:
    proveedor = obtener_proveedor(db, proveedor_id)
    validar_nombre_unico(db, proveedor.nombre, excluir_id=proveedor_id)
    proveedor.activo = True
    db.commit()
    db.refresh(proveedor)
    return proveedor


def obtener_proveedores_para_csv(
    db: Session, busqueda: Optional[str] = None, solo_activos: bool = False
) -> List[Dict[str, Any]]:
    proveedores = listar_proveedores(db, solo_activos=solo_activos, busqueda=busqueda)
    return [
        {
            "id": p.id,
            "nombre": p.nombre,
            "cuit": p.cuit or "-",
            "contacto": p.contacto or "-",
            "telefono": p.telefono or "-",
            "email": p.email or "-",
            "direccion": p.direccion or "-",
            "totalInsumos": p.total_insumos,
            "estado": "Activo" if p.activo else "Inactivo",
        }
        for p in proveedores
    ]
