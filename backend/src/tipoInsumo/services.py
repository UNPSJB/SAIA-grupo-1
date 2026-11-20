from datetime import date, datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session
from src.alergenos.models import Alergeno
from src.tipoInsumo import exceptions, models, schemas
from src.unidadesMedida.services import resolver_unidad_medida


def normalizar_nombre(nombre: str) -> str:
    return " ".join(nombre.strip().split())


def clave_comparacion(nombre: str) -> str:
    return normalizar_nombre(nombre).replace(" ", "").lower()


def validar_nombre_unico(db: Session, nombre: str, excluir_id: Optional[int] = None) -> None:
    clave = clave_comparacion(nombre)
    consulta = select(models.TipoInsumo).where(
        func.lower(func.replace(models.TipoInsumo.nombre, " ", "")) == clave
    )
    if excluir_id is not None:
        consulta = consulta.where(models.TipoInsumo.id != excluir_id)
    existente = db.scalar(consulta)
    if existente:
        raise exceptions.NombreDuplicado()


def calcular_estado_vencimiento(fecha_vencimiento: Optional[datetime | date], stock: float) -> str:
    if stock <= 0:
        return "AGOTADO"
    if not fecha_vencimiento:
        return "SIN_VENCIMIENTO"
    f_date = fecha_vencimiento.date() if isinstance(fecha_vencimiento, datetime) else fecha_vencimiento
    hoy = date.today()
    dias = (f_date - hoy).days
    if dias < 0:
        return "VENCIDO"
    if dias <= 7:
        return "PROXIMO_A_VENCER"
    return "VIGENTE"


def _resolver_equivalencia_por_defecto(unidad_nombre: str, equivalencia_explicita: Optional[float]) -> Optional[float]:
    if equivalencia_explicita is not None and equivalencia_explicita > 0:
        return float(equivalencia_explicita)
    u = (unidad_nombre or "").strip().lower()
    if u in ("kilogramos", "kilogramo", "kg", "litros", "litro", "l"):
        return 1000.0
    if u in ("gramos", "gramo", "g", "mililitros", "mililitro", "ml"):
        return 1.0
    if u in ("toneladas", "tonelada", "tn"):
        return 1000000.0
    return equivalencia_explicita


def serializar_tipo_insumo(
    tipo: models.TipoInsumo, total_lotes: int = 0, stock_total: float = 0.0
) -> schemas.TipoInsumo:
    return schemas.TipoInsumo(
        id=tipo.id,
        nombre=tipo.nombre,
        descripcion=tipo.descripcion,
        unidad_medida_id=tipo.unidad_medida_id,
        unidadMedida=tipo.unidadMedida,
        unidad_medida_nombre=tipo.unidad_medida_nombre,
        unidad_medida_abreviatura=tipo.unidad_medida_abreviatura,
        cantidad_referencia=tipo.cantidad_referencia or 1.0,
        equivalencia_gramos=tipo.equivalencia_gramos,
        es_aditivo=bool(tipo.es_aditivo),
        clase_funcional=tipo.clase_funcional,
        numero_ins=tipo.numero_ins,
        es_aromatizante=bool(tipo.es_aromatizante),
        es_edulcorante=bool(tipo.es_edulcorante),
        es_cafeina=bool(tipo.es_cafeina),
        energia_kcal=tipo.energia_kcal,
        energia_kj=tipo.energia_kj,
        carbohidratos=tipo.carbohidratos,
        azucares_totales=tipo.azucares_totales,
        azucares_anadidos=tipo.azucares_anadidos,
        proteinas=tipo.proteinas,
        grasas_totales=tipo.grasas_totales,
        grasas_saturadas=tipo.grasas_saturadas,
        grasas_trans=tipo.grasas_trans,
        fibra_alimentaria=tipo.fibra_alimentaria,
        sodio_mg=tipo.sodio_mg,
        fuente_datos=tipo.fuente_datos,
        fuente_detalle=tipo.fuente_detalle,
        alimento_referencia_id=tipo.alimento_referencia_id,
        tiene_datos_nutricionales=bool(tipo.tiene_datos_nutricionales),
        modificado_manualmente=bool(tipo.modificado_manualmente),
        activo=tipo.activo,
        alergenos=[schemas.AlergenoSimple.model_validate(a) for a in (tipo.alergenos or [])],
        nombres_alergenos=tipo.nombres_alergenos,
        total_lotes=total_lotes,
        cantidad_lotes=total_lotes,
        stock_total=stock_total,
    )


def crear_tipo_insumo(db: Session, datos: schemas.TipoInsumoCreate) -> models.TipoInsumo:
    nombre_normalizado = normalizar_nombre(datos.nombre)
    validar_nombre_unico(db, nombre_normalizado)
    unidad = resolver_unidad_medida(
        db,
        unidad_medida_id=datos.unidad_medida_id,
        valor_texto=datos.unidadMedida or ("kilogramos" if datos.unidad_medida_id is None else None),
    )
    equiv_g = _resolver_equivalencia_por_defecto(unidad.nombre, datos.equivalencia_gramos)
    tipo = models.TipoInsumo(
        nombre=nombre_normalizado,
        descripcion=datos.descripcion,
        unidad_medida_id=unidad.id,
        cantidad_referencia=datos.cantidad_referencia if datos.cantidad_referencia and datos.cantidad_referencia > 0 else 1.0,
        equivalencia_gramos=equiv_g,
        es_aditivo=bool(datos.es_aditivo),
        clase_funcional=datos.clase_funcional,
        numero_ins=datos.numero_ins,
        es_aromatizante=bool(datos.es_aromatizante),
        es_edulcorante=bool(datos.es_edulcorante),
        es_cafeina=bool(datos.es_cafeina),
        energia_kcal=datos.energia_kcal,
        energia_kj=datos.energia_kj,
        carbohidratos=datos.carbohidratos,
        azucares_totales=datos.azucares_totales,
        azucares_anadidos=datos.azucares_anadidos,
        proteinas=datos.proteinas,
        grasas_totales=datos.grasas_totales,
        grasas_saturadas=datos.grasas_saturadas,
        grasas_trans=datos.grasas_trans,
        fibra_alimentaria=datos.fibra_alimentaria,
        sodio_mg=datos.sodio_mg,
        fuente_datos=datos.fuente_datos,
        fuente_detalle=datos.fuente_detalle,
        alimento_referencia_id=datos.alimento_referencia_id,
        fecha_carga_nutricional=datetime.now() if datos.energia_kcal is not None or datos.fuente_datos else None,
        activo=True,
    )

    if datos.alergeno_ids:
        alergenos_db = list(db.scalars(select(Alergeno).where(Alergeno.id.in_(datos.alergeno_ids))).all())
        tipo.alergenos = alergenos_db
    db.add(tipo)
    db.commit()
    db.refresh(tipo)
    return tipo


def listar_tipos_insumos(
    db: Session, solo_activos: bool = False, busqueda: Optional[str] = None
) -> List[schemas.TipoInsumo]:
    from src.insumos.models import Insumo
    consulta = select(models.TipoInsumo).order_by(models.TipoInsumo.nombre.asc())
    if solo_activos:
        consulta = consulta.where(models.TipoInsumo.activo == True)
    if busqueda and busqueda.strip():
        termino = f"%{busqueda.strip()}%"
        consulta = consulta.where(models.TipoInsumo.nombre.ilike(termino))
    tipos = list(db.scalars(consulta).all())
    resultado: List[schemas.TipoInsumo] = []
    for t in tipos:
        totales = db.execute(
            select(
                func.count(Insumo.id),
                func.coalesce(func.sum(Insumo.stock), 0.0),
            ).where(Insumo.tipo_insumo_id == t.id, Insumo.activo == True)
        ).first()
        total_lotes = totales[0] if totales else 0
        stock_total = float(totales[1]) if totales else 0.0
        resultado.append(serializar_tipo_insumo(t, total_lotes=total_lotes, stock_total=stock_total))
    return resultado


def obtener_tipo_insumo(db: Session, tipo_id: int) -> models.TipoInsumo:
    tipo = db.get(models.TipoInsumo, tipo_id)
    if not tipo:
        raise exceptions.TipoInsumoNoEncontrado()
    return tipo


def obtener_tipo_insumo_detalle(db: Session, tipo_id: int) -> schemas.TipoInsumoDetalle:
    from src.insumos.models import Insumo
    tipo = obtener_tipo_insumo(db, tipo_id)
    lotes_db = list(
        db.scalars(
            select(Insumo)
            .where(Insumo.tipo_insumo_id == tipo_id)
            .order_by(Insumo.fechaRecepcion.desc(), Insumo.id.desc())
        ).all()
    )
    lotes_historicos: List[schemas.LoteInsumoHistorico] = []
    stock_total = 0.0
    for l in lotes_db:
        if l.activo:
            stock_total += float(l.stock)
        estado_v = calcular_estado_vencimiento(l.fechaVencimiento, l.stock)
        prov_nombre = l.proveedor.nombre if getattr(l, "proveedor", None) else None
        lotes_historicos.append(
            schemas.LoteInsumoHistorico(
                id=l.id,
                lote=l.lote,
                nombre=l.nombre,
                stock=float(l.stock),
                cantRecibida=float(l.cantRecibida),
                medida=str(l.medida),
                fechaRecepcion=l.fechaRecepcion,
                fechaVencimiento=l.fechaVencimiento,
                proveedor_id=l.proveedor_id,
                proveedor_nombre=prov_nombre,
                estadoVencimiento=estado_v,
                activo=l.activo,
            )
        )
    base = serializar_tipo_insumo(tipo, total_lotes=len(lotes_historicos), stock_total=stock_total)
    return schemas.TipoInsumoDetalle(
        **base.model_dump(),
        lotes=lotes_historicos,
        lotes_historicos=lotes_historicos,
    )


def actualizar_tipo_insumo(
    db: Session, tipo_id: int, datos: schemas.TipoInsumoUpdate
) -> models.TipoInsumo:
    from src.insumos.models import Insumo
    tipo = obtener_tipo_insumo(db, tipo_id)
    datos_dict = datos.model_dump(exclude_unset=True)
    if "nombre" in datos_dict and datos_dict["nombre"] is not None:
        nombre_normalizado = normalizar_nombre(datos_dict["nombre"])
        validar_nombre_unico(db, nombre_normalizado, excluir_id=tipo_id)
        tipo.nombre = nombre_normalizado

    if "alergeno_ids" in datos_dict and datos_dict["alergeno_ids"] is not None:
        alergenos_db = list(db.scalars(select(Alergeno).where(Alergeno.id.in_(datos_dict["alergeno_ids"]))).all())
        tipo.alergenos = alergenos_db
        
    if "descripcion" in datos_dict:
        tipo.descripcion = datos_dict["descripcion"]
    if (
        datos_dict.get("unidad_medida_id") is not None
        or datos_dict.get("unidadMedida") is not None
    ):
        unidad = resolver_unidad_medida(
            db,
            unidad_medida_id=datos_dict.get("unidad_medida_id"),
            valor_texto=datos_dict.get("unidadMedida"),
        )
        tipo.unidad_medida_id = unidad.id
    for campo_extra in (
        "cantidad_referencia",
        "equivalencia_gramos",
        "es_aditivo",
        "clase_funcional",
        "numero_ins",
        "es_aromatizante",
        "es_edulcorante",
        "es_cafeina",
        "energia_kcal",
        "energia_kj",
        "carbohidratos",
        "azucares_totales",
        "azucares_anadidos",
        "proteinas",
        "grasas_totales",
        "grasas_saturadas",
        "grasas_trans",
        "fibra_alimentaria",
        "sodio_mg",
        "fuente_datos",
        "fuente_detalle",
        "alimento_referencia_id",
    ):
        if campo_extra in datos_dict:
            setattr(tipo, campo_extra, datos_dict[campo_extra])
    if "activo" in datos_dict and datos_dict["activo"] is not None:
        tipo.activo = datos_dict["activo"]

    lotes_asoc = list(db.scalars(select(Insumo).where(Insumo.tipo_insumo_id == tipo.id)).all())
    for lote_obj in lotes_asoc:
        for campo_nut in (
            "es_aditivo",
            "energia_kcal",
            "energia_kj",
            "carbohidratos",
            "azucares_totales",
            "azucares_anadidos",
            "proteinas",
            "grasas_totales",
            "grasas_saturadas",
            "grasas_trans",
            "fibra_alimentaria",
            "sodio_mg",
            "fuente_datos",
            "fuente_detalle",
            "alimento_referencia_id",
        ):
            val_t = getattr(tipo, campo_nut, None)
            if val_t is not None:
                setattr(lote_obj, campo_nut, val_t)

    db.commit()
    db.refresh(tipo)
    return tipo


def eliminar_tipo_insumo(db: Session, tipo_id: int, baja_logica: bool = True) -> models.TipoInsumo:
    from src.insumos.models import Insumo
    tipo = obtener_tipo_insumo(db, tipo_id)
    cant_insumos = db.scalar(
        select(func.count(Insumo.id)).where(Insumo.tipo_insumo_id == tipo_id)
    )
    if cant_insumos and cant_insumos > 0:
        raise exceptions.TipoInsumoEnUso()
    if baja_logica:
        tipo.activo = False
        db.commit()
        db.refresh(tipo)
        return tipo
    db.execute(delete(models.TipoInsumo).where(models.TipoInsumo.id == tipo_id))
    db.commit()
    return tipo


def restaurar_tipo_insumo(db: Session, tipo_id: int) -> models.TipoInsumo:
    tipo = obtener_tipo_insumo(db, tipo_id)
    validar_nombre_unico(db, tipo.nombre, excluir_id=tipo_id)
    tipo.activo = True
    db.commit()
    db.refresh(tipo)
    return tipo


def obtener_tipos_insumos_para_csv(
    db: Session, busqueda: Optional[str] = None, solo_activos: bool = False
) -> List[Dict[str, Any]]:
    tipos = listar_tipos_insumos(db, solo_activos=solo_activos, busqueda=busqueda)
    return [
        {
            "id": t.id,
            "nombre": t.nombre,
            "descripcion": t.descripcion or "-",
            "unidadMedida": t.unidadMedida,
            "stockTotal": t.stock_total,
            "totalLotes": t.total_lotes,
            "estado": "Activo" if t.activo else "Inactivo",
        }
        for t in tipos
    ]


def listar_aditivos(db: Session, solo_activos: bool = False) -> List[models.Aditivo]:
    stmt = select(models.Aditivo).order_by(models.Aditivo.nombre.asc())
    if solo_activos:
        stmt = stmt.where(models.Aditivo.activo == True)
    return list(db.scalars(stmt).all())


def crear_aditivo(db: Session, datos: schemas.AditivoCreate) -> models.Aditivo:
    nombre_normalizado = normalizar_nombre(datos.nombre)
    unidad = resolver_unidad_medida(
        db,
        unidad_medida_id=datos.unidad_medida_id,
        valor_texto=datos.unidadMedida or ("gramos" if datos.unidad_medida_id is None else None),
    )
    equiv_g = _resolver_equivalencia_por_defecto(unidad.nombre, datos.equivalencia_gramos)
    aditivo = models.Aditivo(
        nombre=nombre_normalizado,
        descripcion=datos.descripcion,
        clase_funcional=datos.clase_funcional,
        numero_ins=datos.numero_ins,
        unidad_medida_id=unidad.id,
        cantidad_referencia=datos.cantidad_referencia if datos.cantidad_referencia and datos.cantidad_referencia > 0 else 1.0,
        equivalencia_gramos=equiv_g,
        es_aromatizante=bool(datos.es_aromatizante or "aroma" in (datos.clase_funcional or "").lower()),
        es_edulcorante=bool(datos.es_edulcorante or "edulcor" in (datos.clase_funcional or "").lower()),
        es_cafeina=bool(datos.es_cafeina or "cafein" in nombre_normalizado.lower() or "cafeín" in nombre_normalizado.lower()),
        aporta_energia_sodio=bool(datos.aporta_energia_sodio),
        energia_kcal=datos.energia_kcal,
        energia_kj=datos.energia_kj,
        sodio_mg=datos.sodio_mg,
        fuente_datos=datos.fuente_datos,
        fuente_detalle=datos.fuente_detalle,
        activo=True,
    )
    db.add(aditivo)
    db.commit()
    db.refresh(aditivo)
    return aditivo


def actualizar_aditivo(db: Session, aditivo_id: int, datos: schemas.AditivoUpdate) -> models.Aditivo:
    aditivo = db.get(models.Aditivo, aditivo_id)
    if not aditivo:
        raise exceptions.TipoInsumoNoEncontrado()
    datos_dict = datos.model_dump(exclude_unset=True)
    if (
        datos_dict.get("unidad_medida_id") is not None
        or datos_dict.get("unidadMedida") is not None
    ):
        unidad = resolver_unidad_medida(
            db,
            unidad_medida_id=datos_dict.get("unidad_medida_id"),
            valor_texto=datos_dict.get("unidadMedida"),
        )
        aditivo.unidad_medida_id = unidad.id
    for k, v in datos_dict.items():
        if k not in ("unidad_medida_id", "unidadMedida"):
            setattr(aditivo, k, v)
    db.commit()
    db.refresh(aditivo)
    return aditivo
