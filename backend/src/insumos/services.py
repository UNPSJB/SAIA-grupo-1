import json
from typing import Any, Dict, List, Optional
from datetime import date, datetime, timedelta
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session
from src.insumos.models import Insumo, AlimentoReferenciaSARA
from src.insumos import schemas, exceptions
from src.insumos.constants import (
    CAMPOS_NUTRICIONALES,
    FUENTE_SARA_2,
    FUENTE_ROTULO_PROVEEDOR,
    FUENTE_VALOR_PROPIO,
    FUENTE_OTRA_BIBLIOGRAFIA,
    FUENTES_VALIDAS,
)
from src.insumos.migraciones import migrar_columnas_nutricionales_insumos

def _validar_nombre_unico(db: Session, nombre: str, excluir_id: Optional[int] = None) -> None:
    consulta = select(Insumo.id).where(
        Insumo.activo, func.lower(Insumo.nombre) == nombre.strip().lower()
    )
    if excluir_id is not None:
        consulta = consulta.where(Insumo.id != excluir_id)
    if db.scalar(consulta) is not None:
        raise exceptions.NombreInsumoDuplicado()

def obtener_insumos_para_csv(
    db: Session,
    busqueda: Optional[str] = None,
    unidad: Optional[str] = None,
    vencimiento: Optional[str] = None
) -> List[Dict[str, Any]]:
    migrar_columnas_nutricionales_insumos(db)
    query = select(Insumo)
    insumos = db.scalars(query).all()
    filas = []
    term = busqueda.lower().strip() if busqueda else None

    for i in insumos:
        nombre = getattr(i, "nombre", "") or ""
        lote = getattr(i, "lote", "") or ""
        medida_val = i.medida.value if hasattr(i.medida, "value") else str(i.medida or "")

        if term and (term not in nombre.lower() and term not in lote.lower()):
            continue

        if unidad and unidad != "TODOS":
            if medida_val.upper() != unidad.upper():
                continue

        f_venc = getattr(i, "fechaVencimiento", None)
        f_rec = getattr(i, "fechaRecepcion", None)

        str_venc = f_venc.strftime("%Y-%m-%d") if isinstance(f_venc, (datetime, date)) else "No aplica"
        str_rec = f_rec.strftime("%Y-%m-%d") if isinstance(f_rec, (datetime, date)) else "No aplica"

        estado_venc = "SIN_VENCIMIENTO"
        if f_venc:
            now_dt = datetime.now()
            f_venc_dt = datetime.combine(f_venc, datetime.min.time()) if isinstance(f_venc, date) and not isinstance(f_venc, datetime) else f_venc
            dias = (f_venc_dt - now_dt).total_seconds() / (1000 * 60 * 60 * 24)
            if dias < 0:
                estado_venc = "VENCIDO"
            elif dias <= 15:
                estado_venc = "POR_VENCER"
            else:
                estado_venc = "VIGENTE"

        if vencimiento and vencimiento != "TODOS":
            if estado_venc != vencimiento.upper():
                continue

        filas.append({
            "id": i.id,
            "nombre": nombre,
            "lote": lote,
            "stock": getattr(i, "stock", 0),
            "cantRecibida": getattr(i, "cantRecibida", 0),
            "medida": medida_val,
            "fechaRecepcion": str_rec,
            "fechaVencimiento": str_venc,
            "estadoVencimiento": estado_venc.replace("_", " ").capitalize(),
        })

    return filas

def crear_insumo(db: Session, insumo: schemas.InsumoCreate) -> Insumo:
    migrar_columnas_nutricionales_insumos(db)
    if not insumo.nombre or insumo.nombre.strip() == "":
        raise exceptions.NombreInsumoVacio()
    _validar_nombre_unico(db, insumo.nombre)
    _insumo = Insumo(**insumo.model_dump())
    db.add(_insumo)
    db.commit()
    db.refresh(_insumo)
    return _insumo

def listar_insumos(db: Session) -> List[Insumo]:
    migrar_columnas_nutricionales_insumos(db)
    items = list(db.scalars(select(Insumo).where(Insumo.activo)).all())
    for item in items:
        setattr(
            item,
            "tiene_datos_nutricionales",
            item.fuente_datos is not None or item.energia_kcal is not None,
        )
    return items

def leer_insumo(db: Session, insumo_id: int) -> Insumo:
    migrar_columnas_nutricionales_insumos(db)
    db_insumo = db.scalar(select(Insumo).where(Insumo.id == insumo_id, Insumo.activo))
    if db_insumo is None:
        raise exceptions.InsumoNoEncontrado()
    setattr(
        db_insumo,
        "tiene_datos_nutricionales",
        db_insumo.fuente_datos is not None or db_insumo.energia_kcal is not None,
    )
    return db_insumo

def modificar_insumo(
    db: Session, insumo_id: int, insumo: schemas.InsumoUpdate
) -> Insumo:
    db_insumo = leer_insumo(db, insumo_id)
    datos_actualizados = insumo.model_dump(exclude_unset=True)

    campos_no_nulos = ["nombre", "lote", "cantRecibida", "stock", "medida"]
    for campo in campos_no_nulos:
        if campo in datos_actualizados and datos_actualizados[campo] is None:
            datos_actualizados.pop(campo)

    if "nombre" in datos_actualizados:
        nombre_val = datos_actualizados["nombre"]
        if nombre_val.strip() == "":
            raise exceptions.NombreInsumoVacio()
        _validar_nombre_unico(db, nombre_val, excluir_id=insumo_id)

    if "fechaVencimiento" in datos_actualizados and datos_actualizados["fechaVencimiento"] is not None:
        f_venc = datos_actualizados["fechaVencimiento"]
        minimo_venc = (datetime.now() + timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
        if f_venc < minimo_venc:
            raise exceptions.FechaVencimientoInvalida()
        if f_venc < db_insumo.fechaRecepcion:
            raise exceptions.FechaVencimientoInvalida()

    stock_efectivo = datos_actualizados.get("stock", db_insumo.stock)
    cant_efectiva = datos_actualizados.get("cantRecibida", db_insumo.cantRecibida)

    if stock_efectivo > cant_efectiva:
        raise exceptions.StockMayorCantidad()

    if datos_actualizados:
        db.execute(update(Insumo)
                .where(Insumo.id == insumo_id)
                .values(**datos_actualizados))
        db.commit()
        db.refresh(db_insumo)
    return db_insumo

def eliminar_insumo(db: Session, insumo_id: int) -> Insumo:
    db_insumo = leer_insumo(db, insumo_id)
    db_insumo.activo = False
    db.commit()
    return db_insumo

def modificar_stock(
    db: Session, insumo_id: int, datos_stock: schemas.InsumoUpdateStock
) -> Insumo:
    db_insumo = leer_insumo(db, insumo_id)
    nuevo_stock = db_insumo.stock - datos_stock.stock
    if nuevo_stock < 0:
        raise exceptions.StockInvalido()
    db_insumo.stock = nuevo_stock
    db.commit()
    db.refresh(db_insumo)
    return db_insumo

def buscar_alimentos_sara(
    db: Session,
    busqueda: Optional[str] = None,
    categoria: Optional[str] = None,
) -> List[AlimentoReferenciaSARA]:
    migrar_columnas_nutricionales_insumos(db)
    stmt = select(AlimentoReferenciaSARA)
    if busqueda and busqueda.strip():
        term = f"%{busqueda.strip().lower()}%"
        stmt = stmt.where(
            func.lower(AlimentoReferenciaSARA.nombre).like(term)
            | func.lower(AlimentoReferenciaSARA.codigo).like(term)
            | func.lower(AlimentoReferenciaSARA.categoria).like(term)
        )
    if categoria and categoria.strip() and categoria != "TODAS":
        stmt = stmt.where(AlimentoReferenciaSARA.categoria == categoria.strip())

    stmt = stmt.order_by(AlimentoReferenciaSARA.nombre.asc())
    return list(db.scalars(stmt).all())

def obtener_alimento_sara_por_codigo(
    db: Session, codigo: str
) -> AlimentoReferenciaSARA:
    migrar_columnas_nutricionales_insumos(db)
    item = db.scalar(
        select(AlimentoReferenciaSARA).where(
            AlimentoReferenciaSARA.codigo == codigo.strip()
        )
    )
    if not item:
        raise exceptions.AlimentoReferenciaNoEncontrado()
    return item

def obtener_nutricion_insumo(
    db: Session, insumo_id: int
) -> schemas.DatosNutricionalesInsumoResponse:
    insumo = leer_insumo(db, insumo_id)

    campos_modificados: List[str] = []
    valores_ref_dict = None
    if insumo.valores_referencia_json:
        try:
            valores_ref_dict = json.loads(insumo.valores_referencia_json)
            for c in CAMPOS_NUTRICIONALES:
                val_insumo = getattr(insumo, c)
                val_ref = valores_ref_dict.get(c)
                if val_ref is not None and val_insumo is not None:
                    if abs(float(val_insumo) - float(val_ref)) > 0.001:
                        campos_modificados.append(c)
                elif (val_ref is None and val_insumo is not None) or (val_ref is not None and val_insumo is None):
                    campos_modificados.append(c)
        except Exception:
            valores_ref_dict = None

    tiene_datos = (
        insumo.fuente_datos is not None
        or insumo.energia_kcal is not None
        or (insumo.es_aditivo and insumo.fecha_carga_nutricional is not None)
    )

    return schemas.DatosNutricionalesInsumoResponse(
        insumo_id=insumo.id,
        nombre_insumo=insumo.nombre,
        es_aditivo=insumo.es_aditivo,
        fuente_datos=insumo.fuente_datos,
        fuente_detalle=insumo.fuente_detalle,
        alimento_referencia_id=insumo.alimento_referencia_id,
        fecha_carga_nutricional=insumo.fecha_carga_nutricional,
        usuario_carga_nutricional=insumo.usuario_carga_nutricional,
        modificado_manualmente=insumo.modificado_manualmente,
        fecha_modificacion_nutricional=insumo.fecha_modificacion_nutricional,
        usuario_modificacion_nutricional=insumo.usuario_modificacion_nutricional,
        campos_modificados=campos_modificados,
        valores_referencia=valores_ref_dict,
        energia_kcal=insumo.energia_kcal,
        energia_kj=insumo.energia_kj,
        carbohidratos=insumo.carbohidratos,
        azucares_totales=insumo.azucares_totales,
        azucares_anadidos=insumo.azucares_anadidos,
        proteinas=insumo.proteinas,
        grasas_totales=insumo.grasas_totales,
        grasas_saturadas=insumo.grasas_saturadas,
        grasas_trans=insumo.grasas_trans,
        fibra_alimentaria=insumo.fibra_alimentaria,
        sodio_mg=insumo.sodio_mg,
        tiene_datos_cargados=tiene_datos,
    )

def guardar_nutricion_insumo(
    db: Session,
    insumo_id: int,
    datos: schemas.DatosNutricionalesInsumoUpdate,
    usuario: Optional[str] = None,
) -> schemas.DatosNutricionalesInsumoResponse:
    insumo = leer_insumo(db, insumo_id)
    ahora = datetime.now()
    usuario_str = usuario or "Administrador"

    if insumo.fecha_carga_nutricional is None:
        insumo.fecha_carga_nutricional = ahora
        insumo.usuario_carga_nutricional = usuario_str

    insumo.es_aditivo = datos.es_aditivo
    insumo.fuente_datos = datos.fuente_datos
    insumo.fuente_detalle = datos.fuente_detalle
    insumo.alimento_referencia_id = datos.alimento_referencia_id

    valores_ref_dict = None
    if datos.fuente_datos == FUENTE_SARA_2:
        if datos.alimento_referencia_id:
            ref_alimento = db.scalar(
                select(AlimentoReferenciaSARA).where(
                    AlimentoReferenciaSARA.codigo == datos.alimento_referencia_id.strip()
                )
            )
            if ref_alimento:
                valores_ref_dict = {
                    "energia_kcal": ref_alimento.energia_kcal,
                    "energia_kj": ref_alimento.energia_kj,
                    "carbohidratos": ref_alimento.carbohidratos,
                    "azucares_totales": ref_alimento.azucares_totales,
                    "azucares_anadidos": ref_alimento.azucares_anadidos,
                    "proteinas": ref_alimento.proteinas,
                    "grasas_totales": ref_alimento.grasas_totales,
                    "grasas_saturadas": ref_alimento.grasas_saturadas,
                    "grasas_trans": ref_alimento.grasas_trans,
                    "fibra_alimentaria": ref_alimento.fibra_alimentaria,
                    "sodio_mg": ref_alimento.sodio_mg,
                }
                insumo.valores_referencia_json = json.dumps(valores_ref_dict)

        if valores_ref_dict:
            hubo_cambio = False
            for c in CAMPOS_NUTRICIONALES:
                val_ingresado = getattr(datos, c)
                val_ref = valores_ref_dict.get(c)
                if val_ingresado is not None and val_ref is not None:
                    if abs(float(val_ingresado) - float(val_ref)) > 0.001:
                        hubo_cambio = True
                        break
                elif (val_ref is None and val_ingresado is not None) or (val_ref is not None and val_ingresado is None):
                    hubo_cambio = True
                    break

            if hubo_cambio:
                insumo.modificado_manualmente = True
                insumo.fecha_modificacion_nutricional = ahora
                insumo.usuario_modificacion_nutricional = usuario_str
            else:
                insumo.modificado_manualmente = False
                insumo.fecha_modificacion_nutricional = None
                insumo.usuario_modificacion_nutricional = None
        else:
            insumo.modificado_manualmente = False
            insumo.valores_referencia_json = None
    else:
        if insumo.valores_referencia_json:
            insumo.valores_referencia_json = None

        if insumo.fecha_carga_nutricional is not None and insumo.fecha_carga_nutricional != ahora:
            insumo.fecha_modificacion_nutricional = ahora
            insumo.usuario_modificacion_nutricional = usuario_str
        insumo.modificado_manualmente = False

    insumo.energia_kcal = datos.energia_kcal
    insumo.energia_kj = datos.energia_kj
    insumo.carbohidratos = datos.carbohidratos
    insumo.azucares_totales = datos.azucares_totales
    insumo.azucares_anadidos = datos.azucares_anadidos
    insumo.proteinas = datos.proteinas
    insumo.grasas_totales = datos.grasas_totales
    insumo.grasas_saturadas = datos.grasas_saturadas
    insumo.grasas_trans = datos.grasas_trans
    insumo.fibra_alimentaria = datos.fibra_alimentaria
    insumo.sodio_mg = datos.sodio_mg

    db.commit()
    db.refresh(insumo)

    return obtener_nutricion_insumo(db, insumo_id)
