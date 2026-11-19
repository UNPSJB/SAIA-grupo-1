import logging
from typing import List, Optional, Dict, Any
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session
from src.producto import exceptions, schemas
from src.producto.models import Producto
from src.documentos.models import Documento
from src.recetas.models import Receta
from src.unidadesMedida.services import resolver_unidad_medida
from src.indentificadorDeQR.snapshot import regenerar_snapshot_seguro


def _obtener_nombre_receta(receta_obj: Any) -> Optional[str]:
    if not receta_obj:
        return None
    if isinstance(receta_obj, list):
        return getattr(receta_obj[0], "nombre", None) if receta_obj else None
    return getattr(receta_obj, "nombre", None)


def _resolver_nombre_receta_producto(db: Session, prod: Producto) -> Optional[str]:
    if prod.receta:
        return _obtener_nombre_receta(prod.receta)
    rec = db.scalar(select(Receta).where(Receta.id_producto == prod.id, Receta.activo == True))
    if rec:
        return rec.nombre
    return None


def _validar_id_receta(db: Session, id_receta: Optional[int]) -> Optional[Receta]:
    if id_receta is None:
        return None
    rec = db.scalar(select(Receta).where(Receta.id == id_receta, Receta.activo == True))
    if rec is None:
        raise exceptions.RecetaNoEncontrada()
    return rec


def obtener_productos_para_exportar(
    db: Session,
    activo: Optional[bool] = None,
    busqueda: Optional[str] = None
) -> List[Dict[str, Any]]:
    query = db.query(Producto)
    
    if activo is not None:
        query = query.filter(Producto.activo == activo)
        
    productos = query.all()
    filas = []
    term = busqueda.lower().strip() if busqueda else None
    
    for p in productos:
        nombre = p.nombre or ""
        descripcion = p.descripcion or ""
        nombre_receta = _resolver_nombre_receta_producto(db, p) or ""

        if term:
            coincide = (
                term in nombre.lower()
                or term in descripcion.lower()
                or term in nombre_receta.lower()
            )
            if not coincide:
                continue

        unidad = str(p.unidadMedida or "")
        
        filas.append({
            "id": p.id,
            "nombre": nombre,
            "unidadMedida": unidad,
            "receta": nombre_receta or "Sin receta",
            "descripcion": descripcion,
            "estado": "Activo" if p.activo else "Inactivo"
        })
        
    return filas

obtener_productos_para_csv = obtener_productos_para_exportar

def validar_nombre_unico(db: Session, nombre: str, producto_id_actual: Optional[int] = None) -> None:
    nombre_sin_espacios = nombre.replace(" ", "").lower()
    stmt = select(Producto).where(
        func.lower(func.replace(Producto.nombre, " ", "")) == nombre_sin_espacios
    )

    if producto_id_actual is not None:
        stmt = stmt.where(Producto.id != producto_id_actual)

    existente = db.scalar(stmt)
    if existente is not None:
        raise exceptions.NombreProductoDuplicado()

def crear_producto(db: Session, producto: schemas.ProductoCreate) -> Producto:
    validar_nombre_unico(db, producto.nombre)
    receta_obj = _validar_id_receta(db, producto.id_receta)

    unidad = resolver_unidad_medida(
        db,
        unidad_medida_id=producto.unidad_medida_id,
        valor_texto=producto.unidadMedida,
    )

    peso_val = producto.peso_unidad_g if producto.peso_unidad_g and producto.peso_unidad_g > 0 else None
    porcion_val = producto.tamano_porcion_g if producto.tamano_porcion_g and producto.tamano_porcion_g > 0 else None
    porciones_calc = (
        round(float(peso_val) / float(porcion_val), 2)
        if peso_val and porcion_val
        else producto.porciones_por_envase
    )

    _producto = Producto(
        nombre=producto.nombre,
        descripcion=producto.descripcion,
        unidad_medida_id=unidad.id,
        tamano_porcion_g=porcion_val,
        porciones_por_envase=porciones_calc,
        descripcion_porcion=producto.descripcion_porcion,
        peso_unidad_g=peso_val,
        aplica_rotulado=producto.aplica_rotulado if producto.aplica_rotulado is not None else True,
        documento_receta_id=None,
        activo=True,
    )
    db.add(_producto)
    db.flush()

    if receta_obj is not None:
        receta_obj.id_producto = _producto.id

    db.commit()
    db.refresh(_producto)

    if receta_obj is not None and _producto.aplica_rotulado:
        from src.rotulado.services import sincronizar_rotulo_desde_receta
        sincronizar_rotulo_desde_receta(db, producto_id=_producto.id, receta_id=receta_obj.id)

    _producto.nombre_receta = _resolver_nombre_receta_producto(db, _producto)
    return _producto

def listar_productos(db: Session) -> List[Producto]:
    productos = list(db.scalars(select(Producto).order_by(Producto.id.desc())).all())

    for prod in productos:
        prod.nombre_receta = _resolver_nombre_receta_producto(db, prod)

    return productos

def obtener_producto(db: Session, producto_id: int) -> Producto:
    db_producto = db.scalar(select(Producto).where(Producto.id == producto_id))
    if db_producto is None:
        raise exceptions.ProductoNoEncontrado()

    db_producto.nombre_receta = _resolver_nombre_receta_producto(db, db_producto)

    return db_producto

def editar_producto(
    db: Session,
    producto_id: int,
    producto: schemas.ProductoUpdate,
) -> Producto:
    db_producto = obtener_producto(db, producto_id)

    datos_actualizar = producto.model_dump(exclude_unset=True)

    unidad_texto = datos_actualizar.pop("unidadMedida", None)
    unidad_id_val = datos_actualizar.pop("unidad_medida_id", None)
    if unidad_id_val is not None or unidad_texto is not None:
        unidad = resolver_unidad_medida(
            db,
            unidad_medida_id=unidad_id_val,
            valor_texto=unidad_texto,
        )
        datos_actualizar["unidad_medida_id"] = unidad.id

    if "nombre" in datos_actualizar and datos_actualizar["nombre"]:
        validar_nombre_unico(db, datos_actualizar["nombre"], producto_id_actual=producto_id)

    if "id_receta" in datos_actualizar:
        id_rec = datos_actualizar.pop("id_receta")
        receta_obj = _validar_id_receta(db, id_rec)
        datos_actualizar["documento_receta_id"] = None
        if receta_obj is not None:
            receta_obj.id_producto = producto_id

    datos_actualizar.pop("porciones_por_envase", None)
    nuevo_peso = datos_actualizar.get("peso_unidad_g", db_producto.peso_unidad_g)
    nueva_porcion = datos_actualizar.get("tamano_porcion_g", db_producto.tamano_porcion_g)
    if nuevo_peso and nuevo_peso > 0 and nueva_porcion and nueva_porcion > 0:
        datos_actualizar["_porciones_por_envase"] = round(float(nuevo_peso) / float(nueva_porcion), 2)
    elif "peso_unidad_g" in datos_actualizar or "tamano_porcion_g" in datos_actualizar:
        datos_actualizar["_porciones_por_envase"] = None

    if datos_actualizar:
        db.execute(
            update(Producto)
            .where(Producto.id == producto_id)
            .values(**datos_actualizar)
        )
        db.commit()
        db.refresh(db_producto)
        regenerar_snapshot_seguro(db)

    db_producto.nombre_receta = _resolver_nombre_receta_producto(db, db_producto)

    return db_producto

def eliminar_producto(db: Session, producto_id: int) -> Producto:
    db_producto = obtener_producto(db, producto_id)
    db_producto.activo = False
    db_producto.visible_publico = False
    db.commit()
    db.refresh(db_producto)
    regenerar_snapshot_seguro(db)
    return db_producto

def restaurar_producto(db: Session, producto_id: int) -> Producto:
    db_producto = obtener_producto(db, producto_id)
    db_producto.activo = True
    db.commit()
    db.refresh(db_producto)
    return db_producto


def actualizar_visibilidad_publica(db: Session, productos_visibles: List[int]) -> List[Producto]:
    ids = set(productos_visibles)
    encontrados = db.scalars(select(Producto).where(Producto.id.in_(list(ids)))).all() if ids else []
    if len(encontrados) != len(ids):
        raise exceptions.ProductoNoEncontrado()
    if any(not p.activo for p in encontrados):
        raise exceptions.ProductoInactivoNoPublicable()

    db.execute(update(Producto).values(visible_publico=Producto.id.in_(list(ids))))
    db.commit()
    regenerar_snapshot_seguro(db)
    return listar_productos(db)

def listar_productos_publicos(db: Session) -> List[Producto]:
    return list(db.scalars(
        select(Producto)
        .where(Producto.activo == True, Producto.visible_publico == True)
        .order_by(Producto.nombre)
    ).all())