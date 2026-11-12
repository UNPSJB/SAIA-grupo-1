import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from src.insumos.models import Insumo
from src.producto.models import Producto
from src.recetas.models import Receta, VersionReceta, RecetaDetalle
from src.nutricion.constants import NUTRIENTES_DEFECTO_CAA, REFERENCIA_CATEDRA_PAN_CAMPO
from src.nutricion.models import ParametroRedondeoNutricional, InformacionNutricionalProducto
from src.nutricion.schemas import (
    ParametroRedondeoNutricionalResponse,
    ParametroRedondeoUpdate,
    InsumoNutricionalUpdate,
    NutrienteFilaResponse,
    DetalleAporteIngrediente,
    InformacionNutricionalResponse,
    VerificacionReferenciaResponse,
    VerificacionReferenciaDetalle,
)
from src.nutricion.exceptions import (
    NutricionException,
    ProductoSinRecetaError,
    RecetaSinIngredientesError,
    RendimientoInvalidoError,
    PorcionInvalidaError,
    ParametroInvalidoError,
)

NUTRIENTES_CAMPOS = [
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
]

def migrar_columnas_nutricionales(db: Session) -> None:
    engine = db.get_bind()
    with engine.connect() as conn:
        res_insumos = conn.execute(text("PRAGMA table_info(insumos)"))
        columnas_insumos = {row[1] for row in res_insumos.fetchall()}
        for n in NUTRIENTES_CAMPOS:
            if n not in columnas_insumos:
                conn.execute(text(f"ALTER TABLE insumos ADD COLUMN {n} REAL"))

        res_prod = conn.execute(text("PRAGMA table_info(productos)"))
        columnas_prod = {row[1] for row in res_prod.fetchall()}
        columnas_a_agregar = [
            ("receta_id", "INTEGER"),
            ("tamano_porcion_g", "REAL"),
            ("porciones_por_envase", "REAL"),
            ("descripcion_porcion", "VARCHAR(100)"),
        ]
        for col, tipo in columnas_a_agregar:
            if col not in columnas_prod:
                conn.execute(text(f"ALTER TABLE productos ADD COLUMN {col} {tipo}"))
        conn.commit()

def asegurar_parametros_defecto(db: Session) -> None:
    for item in NUTRIENTES_DEFECTO_CAA:
        existente = db.scalar(
            select(ParametroRedondeoNutricional).where(
                ParametroRedondeoNutricional.nutriente == item["nutriente"]
            )
        )
        if not existente:
            db.add(ParametroRedondeoNutricional(**item))
    db.commit()

def listar_parametros(db: Session) -> List[ParametroRedondeoNutricional]:
    asegurar_parametros_defecto(db)
    stmt = (
        select(ParametroRedondeoNutricional)
        .order_by(ParametroRedondeoNutricional.orden.asc())
    )
    return list(db.scalars(stmt).all())

def actualizar_parametro(
    db: Session, nutriente: str, datos: ParametroRedondeoUpdate
) -> ParametroRedondeoNutricional:
    asegurar_parametros_defecto(db)
    param = db.scalar(
        select(ParametroRedondeoNutricional).where(
            ParametroRedondeoNutricional.nutriente == nutriente
        )
    )
    if not param:
        raise ParametroInvalidoError(nutriente)

    updates = datos.model_dump(exclude_unset=True)
    for clave, valor in updates.items():
        setattr(param, clave, valor)

    db.commit()
    db.refresh(param)
    return param

def restablecer_parametros_defecto(db: Session) -> List[ParametroRedondeoNutricional]:
    for item in NUTRIENTES_DEFECTO_CAA:
        param = db.scalar(
            select(ParametroRedondeoNutricional).where(
                ParametroRedondeoNutricional.nutriente == item["nutriente"]
            )
        )
        if param:
            for clave, valor in item.items():
                setattr(param, clave, valor)
        else:
            db.add(ParametroRedondeoNutricional(**item))
    db.commit()
    return listar_parametros(db)

def actualizar_nutricion_insumo(
    db: Session, insumo_id: int, datos: InsumoNutricionalUpdate
) -> Insumo:
    insumo = db.get(Insumo, insumo_id)
    if not insumo:
        raise NutricionException("Insumo no encontrado", status_code=404)

    updates = datos.model_dump(exclude_unset=True)
    for clave, valor in updates.items():
        setattr(insumo, clave, valor)

    if insumo.energia_kcal is not None and (insumo.energia_kj is None or "energia_kj" not in updates):
        insumo.energia_kj = round(insumo.energia_kcal * 4.184, 1)
    elif insumo.energia_kj is not None and (insumo.energia_kcal is None or "energia_kcal" not in updates):
        insumo.energia_kcal = round(insumo.energia_kj / 4.184, 1)

    db.commit()
    db.refresh(insumo)
    return insumo

def obtener_nutricion_insumo(db: Session, insumo_id: int) -> Insumo:
    insumo = db.get(Insumo, insumo_id)
    if not insumo:
        raise NutricionException("Insumo no encontrado", status_code=404)
    return insumo

def normalizar_a_gramos(cantidad: float, unidad: str) -> float:
    u = unidad.strip().lower()
    if u in ["kg", "kilogramos", "kilogramo", "kilos", "kilo"]:
        return cantidad * 1000.0
    if u in ["l", "litros", "litro"]:
        return cantidad * 1000.0
    if u in ["ml", "mililitros", "mililitro", "cm3", "cc"]:
        return cantidad
    return cantidad

def redondear_y_formatear(
    valor: float, param: ParametroRedondeoNutricional
) -> tuple[float, str, bool]:
    if valor <= param.umbral_no_significativo:
        return 0.0, param.texto_no_significativo, True

    decimales = (
        param.cifras_decimales_mayores_10
        if valor > 10.0
        else param.cifras_decimales
    )
    valor_redondeado = round(valor, decimales)
    if decimales == 0:
        texto = str(int(valor_redondeado))
    else:
        texto = f"{valor_redondeado:.{decimales}f}".replace(".", ",")
    return valor_redondeado, texto, False

def calcular_vd(valor_porcion: float, vdr: Optional[float]) -> tuple[Optional[float], str]:
    if not vdr or vdr <= 0:
        return None, "-"
    vd_raw = (valor_porcion / vdr) * 100.0
    vd_redondeado = round(vd_raw)
    return float(vd_redondeado), f"{int(vd_redondeado)}%"

def resolver_receta_para_producto(db: Session, producto: Producto, receta_id: Optional[int] = None) -> Receta:
    r_id = receta_id or getattr(producto, "receta_id", None)
    if not r_id:
        r_by_name = db.scalar(
            select(Receta).where(Receta.nombre.ilike(f"%{producto.nombre}%"))
        )
        if r_by_name:
            return r_by_name
        raise ProductoSinRecetaError()

    receta = db.get(Receta, r_id)
    if not receta:
        raise ProductoSinRecetaError()
    return receta

def calcular_informacion_nutricional(
    db: Session,
    producto_id: int,
    receta_id: Optional[int] = None,
    tamano_porcion_g: Optional[float] = None,
    porciones_por_envase: Optional[float] = None,
    descripcion_porcion: Optional[str] = None,
    usuario_actual: Optional[str] = None,
) -> InformacionNutricionalResponse:
    migrar_columnas_nutricionales(db)
    asegurar_parametros_defecto(db)

    producto = db.get(Producto, producto_id)
    if not producto:
        raise NutricionException("Producto no encontrado", status_code=404)

    receta = resolver_receta_para_producto(db, producto, receta_id)

    version: Optional[VersionReceta] = receta.version_actual
    detalles: List[RecetaDetalle] = version.detalles if version else []
    if not detalles:
        raise RecetaSinIngredientesError()

    rendimiento_final = (
        version.rendimiento_final
        if version and version.rendimiento_final and version.rendimiento_final > 0
        else receta.rendimiento_final
    )
    if not rendimiento_final or rendimiento_final <= 0:
        raise RendimientoInvalidoError()

    porcion = (
        tamano_porcion_g
        or getattr(producto, "tamano_porcion_g", None)
        or 50.0
    )
    if porcion <= 0:
        raise PorcionInvalidaError()

    porciones_env = (
        porciones_por_envase
        or getattr(producto, "porciones_por_envase", None)
    )
    desc_porcion = (
        descripcion_porcion
        or getattr(producto, "descripcion_porcion", None)
    )

    setattr(producto, "receta_id", receta.id)
    setattr(producto, "tamano_porcion_g", porcion)
    if porciones_env is not None:
        setattr(producto, "porciones_por_envase", porciones_env)
    if desc_porcion is not None:
        setattr(producto, "descripcion_porcion", desc_porcion)
    db.commit()

    parametros = listar_parametros(db)
    parametros_map = {p.nutriente: p for p in parametros}

    detalles_aportes: List[DetalleAporteIngrediente] = []
    totales_aportes_lote: Dict[str, float] = {k: 0.0 for k in NUTRIENTES_CAMPOS}
    peso_total_ingredientes = 0.0

    for det in detalles:
        insumo = det.ingrediente
        if not insumo:
            insumo = db.get(Insumo, det.ingrediente_id)
        if not insumo:
            continue

        cant_g = normalizar_a_gramos(det.cantidad, det.unidad_medida)
        peso_total_ingredientes += cant_g

        aportes_item: Dict[str, float] = {}
        for nutriente in NUTRIENTES_CAMPOS:
            val_100g_ingrediente = getattr(insumo, nutriente, None)
            if val_100g_ingrediente is None:
                val_100g_ingrediente = 0.0
            aporte = (cant_g * float(val_100g_ingrediente)) / 100.0
            aportes_item[nutriente] = aporte
            totales_aportes_lote[nutriente] += aporte

        detalles_aportes.append(
            DetalleAporteIngrediente(
                ingrediente_id=insumo.id,
                nombre_ingrediente=insumo.nombre,
                cantidad_receta=det.cantidad,
                unidad_medida=det.unidad_medida,
                cantidad_gramos=cant_g,
                es_aditivo=det.es_aditivo,
                aportes=aportes_item,
            )
        )

    if totales_aportes_lote["energia_kj"] == 0.0 and totales_aportes_lote["energia_kcal"] > 0:
        totales_aportes_lote["energia_kj"] = totales_aportes_lote["energia_kcal"] * 4.184
    elif totales_aportes_lote["energia_kcal"] == 0.0 and totales_aportes_lote["energia_kj"] > 0:
        totales_aportes_lote["energia_kcal"] = totales_aportes_lote["energia_kj"] / 4.184

    factor_rendimiento = (
        rendimiento_final / peso_total_ingredientes
        if peso_total_ingredientes > 0
        else 1.0
    )

    tabla_nutricional: List[NutrienteFilaResponse] = []
    datos_persistir: Dict[str, Any] = {}

    for param in parametros:
        k = param.nutriente
        aporte_total = totales_aportes_lote.get(k, 0.0)

        valor_100g_raw = (aporte_total / rendimiento_final) * 100.0
        valor_100g_red, txt_100g, no_sig_100 = redondear_y_formatear(
            valor_100g_raw, param
        )

        valor_porcion_raw = (valor_100g_raw / 100.0) * porcion
        valor_porcion_red, txt_porcion, no_sig_porcion = redondear_y_formatear(
            valor_porcion_raw, param
        )

        vd_pct, txt_vd = calcular_vd(valor_porcion_red, param.vdr)

        fila = NutrienteFilaResponse(
            nutriente=k,
            nombre_mostrar=param.nombre_mostrar,
            unidad=param.unidad,
            valor_100g=valor_100g_red,
            valor_100g_formateado=txt_100g,
            valor_porcion=valor_porcion_red,
            valor_porcion_formateado=txt_porcion,
            vdr=param.vdr,
            vd_porcentaje=vd_pct,
            vd_formateado=txt_vd,
            es_no_significativo=no_sig_porcion,
        )
        tabla_nutricional.append(fila)

        datos_persistir[f"{k}_100g"] = valor_100g_red
        datos_persistir[f"{k}_porcion"] = valor_porcion_red
        datos_persistir[f"{k}_vd"] = vd_pct

    tabla_dict_json = [f.model_dump() for f in tabla_nutricional]
    aportes_dict_json = [d.model_dump() for d in detalles_aportes]

    info_existente = db.scalar(
        select(InformacionNutricionalProducto).where(
            InformacionNutricionalProducto.producto_id == producto.id
        )
    )

    if not info_existente:
        info_existente = InformacionNutricionalProducto(
            producto_id=producto.id,
            receta_id=receta.id,
            version_receta_id=version.id if version else None,
            tamano_porcion_g=porcion,
            porciones_por_envase=porciones_env,
            descripcion_porcion=desc_porcion,
            rendimiento_final_receta=rendimiento_final,
            peso_total_ingredientes=peso_total_ingredientes,
            factor_rendimiento=factor_rendimiento,
            fecha_calculo=datetime.now(),
            calculado_por_usuario=usuario_actual,
            detalles_ingredientes_json=json.dumps(aportes_dict_json, ensure_ascii=False),
            valores_nutricionales_json=json.dumps(tabla_dict_json, ensure_ascii=False),
            **datos_persistir,
        )
        db.add(info_existente)
    else:
        info_existente.receta_id = receta.id
        info_existente.version_receta_id = version.id if version else None
        info_existente.tamano_porcion_g = porcion
        info_existente.porciones_por_envase = porciones_env
        info_existente.descripcion_porcion = desc_porcion
        info_existente.rendimiento_final_receta = rendimiento_final
        info_existente.peso_total_ingredientes = peso_total_ingredientes
        info_existente.factor_rendimiento = factor_rendimiento
        info_existente.fecha_calculo = datetime.now()
        info_existente.calculado_por_usuario = usuario_actual
        info_existente.detalles_ingredientes_json = json.dumps(
            aportes_dict_json, ensure_ascii=False
        )
        info_existente.valores_nutricionales_json = json.dumps(
            tabla_dict_json, ensure_ascii=False
        )
        for campo, val in datos_persistir.items():
            setattr(info_existente, campo, val)

    db.commit()
    db.refresh(info_existente)

    return InformacionNutricionalResponse(
        id=info_existente.id,
        producto_id=producto.id,
        nombre_producto=producto.nombre,
        receta_id=receta.id,
        nombre_receta=receta.nombre,
        version_receta=version.version if version else None,
        tamano_porcion_g=porcion,
        porciones_por_envase=porciones_env,
        descripcion_porcion=desc_porcion,
        rendimiento_final_receta=rendimiento_final,
        peso_total_ingredientes=peso_total_ingredientes,
        factor_rendimiento=factor_rendimiento,
        fecha_calculo=info_existente.fecha_calculo,
        calculado_por_usuario=usuario_actual,
        tabla_nutricional=tabla_nutricional,
        detalles_ingredientes=detalles_aportes,
    )

def obtener_informacion_nutricional_producto(
    db: Session, producto_id: int
) -> InformacionNutricionalResponse:
    migrar_columnas_nutricionales(db)
    producto = db.get(Producto, producto_id)
    if not producto:
        raise NutricionException("Producto no encontrado", status_code=404)

    info = db.scalar(
        select(InformacionNutricionalProducto).where(
            InformacionNutricionalProducto.producto_id == producto_id
        )
    )
    if not info:
        return calcular_informacion_nutricional(db, producto_id)

    receta = db.get(Receta, info.receta_id)
    nombre_receta = receta.nombre if receta else "Receta"
    version = db.get(VersionReceta, info.version_receta_id) if info.version_receta_id else None

    tabla_data = json.loads(info.valores_nutricionales_json)
    tabla_nutricional = [NutrienteFilaResponse(**item) for item in tabla_data]

    detalles_data = (
        json.loads(info.detalles_ingredientes_json)
        if info.detalles_ingredientes_json
        else None
    )
    detalles_ingredientes = (
        [DetalleAporteIngrediente(**item) for item in detalles_data]
        if detalles_data
        else None
    )

    return InformacionNutricionalResponse(
        id=info.id,
        producto_id=producto.id,
        nombre_producto=producto.nombre,
        receta_id=info.receta_id,
        nombre_receta=nombre_receta,
        version_receta=version.version if version else None,
        tamano_porcion_g=info.tamano_porcion_g,
        porciones_por_envase=info.porciones_por_envase,
        descripcion_porcion=info.descripcion_porcion,
        rendimiento_final_receta=info.rendimiento_final_receta,
        peso_total_ingredientes=info.peso_total_ingredientes,
        factor_rendimiento=info.factor_rendimiento,
        fecha_calculo=info.fecha_calculo,
        calculado_por_usuario=info.calculado_por_usuario,
        tabla_nutricional=tabla_nutricional,
        detalles_ingredientes=detalles_ingredientes,
    )

def verificar_tolerancia_referencia_catedra(
    info: InformacionNutricionalResponse, tolerancia_pct: float = 5.0
) -> VerificacionReferenciaResponse:
    ref = REFERENCIA_CATEDRA_PAN_CAMPO
    esperados_100g = ref["valores_esperados_100g"]
    esperados_porcion = ref["valores_esperados_porcion"]

    filas_map = {f.nutriente: f for f in info.tabla_nutricional}

    detalles_100g: List[VerificacionReferenciaDetalle] = []
    detalles_porcion: List[VerificacionReferenciaDetalle] = []
    global_valido = True

    for nutriente, exp_val in esperados_100g.items():
        fila = filas_map.get(nutriente)
        calc_val = fila.valor_100g if fila else 0.0
        diff_abs = abs(calc_val - exp_val)
        diff_pct = (diff_abs / exp_val * 100.0) if exp_val > 0 else 0.0
        cumple = diff_pct <= tolerancia_pct or diff_abs <= 1.0
        if not cumple:
            global_valido = False
        detalles_100g.append(
            VerificacionReferenciaDetalle(
                nutriente=nutriente,
                valor_calculado=calc_val,
                valor_esperado=exp_val,
                diferencia_absoluta=round(diff_abs, 2),
                diferencia_porcentual=round(diff_pct, 2),
                cumple_tolerancia=cumple,
            )
        )

    for nutriente, exp_val in esperados_porcion.items():
        fila = filas_map.get(nutriente)
        calc_val = fila.valor_porcion if fila else 0.0
        diff_abs = abs(calc_val - exp_val)
        diff_pct = (diff_abs / exp_val * 100.0) if exp_val > 0 else 0.0
        cumple = diff_pct <= tolerancia_pct or diff_abs <= 1.0
        if not cumple:
            global_valido = False
        detalles_porcion.append(
            VerificacionReferenciaDetalle(
                nutriente=nutriente,
                valor_calculado=calc_val,
                valor_esperado=exp_val,
                diferencia_absoluta=round(diff_abs, 2),
                diferencia_porcentual=round(diff_pct, 2),
                cumple_tolerancia=cumple,
            )
        )

    mensaje = (
        "Los cálculos coinciden con los valores del producto de referencia de la cátedra dentro de la tolerancia acordada."
        if global_valido
        else "Se detectaron diferencias superiores a la tolerancia acordada respecto al producto de referencia."
    )

    return VerificacionReferenciaResponse(
        nombre_producto=info.nombre_producto,
        tolerancia_acordada_porcentaje=tolerancia_pct,
        resultado_global_valido=global_valido,
        detalles_100g=detalles_100g,
        detalles_porcion=detalles_porcion,
        mensaje=mensaje,
    )
