"""Evaluacion de los sellos del rotulado frontal.

Funciones puras: reciben las reglas ya validadas y los valores nutricionales, sin tocar la base.
Las formulas son una lista cerrada (TipoCondicion); si la norma introduce un tipo de calculo
nuevo, se agrega un caso en valor_condicion. Umbrales, nutrientes, factores y aplicabilidad
vienen siempre de los datos.
"""
from typing import Any, Dict, List, Optional, Sequence, Tuple

from src.rotulado_frontal.constants import Comparador, EstadoFisico, Nutriente, TipoCondicion
from src.rotulado_frontal.schemas import (
    CondicionUmbral, DetalleCondicion, PasoCalculoSello, ReglaIn, ResultadoRegla,
)

DECIMALES_COMPARACION = 4


def valor_condicion(condicion: CondicionUmbral, valores: Dict[str, float]) -> Optional[float]:
    energia = valores[Nutriente.ENERGIA_KCAL]
    cantidad = valores[condicion.nutriente]
    match condicion.tipo:
        case TipoCondicion.PORCENTAJE_ENERGIA:
            if energia == 0:
                return 0.0
            return cantidad * condicion.factor_kcal / energia * 100
        case TipoCondicion.MG_POR_KCAL:
            if energia == 0:
                return None
            return cantidad / energia
        case TipoCondicion.CANTIDAD_POR_100:
            return cantidad
    raise ValueError(f"Tipo de condición no soportado: {condicion.tipo}")


def comparar(valor: float, comparador: Comparador, umbral: float) -> bool:
    valor = round(valor, DECIMALES_COMPARACION)
    umbral = round(umbral, DECIMALES_COMPARACION)
    match comparador:
        case Comparador.MAYOR:
            return valor > umbral
        case Comparador.MAYOR_IGUAL:
            return valor >= umbral
        case Comparador.MENOR:
            return valor < umbral
        case Comparador.MENOR_IGUAL:
            return valor <= umbral
    raise ValueError(f"Comparador no soportado: {comparador}")


def evaluar_regla(regla: ReglaIn, valores: Dict[str, float], estado_fisico: EstadoFisico) -> ResultadoRegla:
    aplica = all(comparar(valores[a.campo], a.comparador, a.valor) for a in regla.aplicabilidad)

    detalle: List[DetalleCondicion] = []
    for condicion in regla.condiciones:
        if condicion.estado_fisico is not None and condicion.estado_fisico != estado_fisico:
            detalle.append(DetalleCondicion(condicion=condicion, evaluada=False))
            continue
        valor = valor_condicion(condicion, valores)
        cumple = valor is not None and comparar(valor, condicion.comparador, condicion.umbral)
        detalle.append(DetalleCondicion(
            condicion=condicion,
            valor_calculado=None if valor is None else round(valor, DECIMALES_COMPARACION),
            cumple=cumple,
        ))

    supera = aplica and any(d.cumple for d in detalle)
    return ResultadoRegla(
        codigo=regla.codigo, leyenda=regla.leyenda, aplica=aplica, supera=supera, condiciones=detalle,
    )


def evaluar(
    reglas: Sequence[ReglaIn], valores: Dict[str, float], estado_fisico: EstadoFisico,
) -> Tuple[List[str], List[ResultadoRegla]]:
    activas = sorted((r for r in reglas if r.activa), key=lambda r: r.orden)
    detalle = [evaluar_regla(r, valores, estado_fisico) for r in activas]
    sellos = [r.codigo for r in detalle if r.supera]
    return sellos, detalle


def evaluar_con_parametros_y_agregados(
    parametros: Any,
    valores: Dict[str, float],
    estado_fisico: EstadoFisico,
    agregados: Optional[Dict[str, Any]] = None,
) -> Tuple[List[str], List[PasoCalculoSello]]:
    agregados = agregados or {}
    tiene_azucares = bool(agregados.get("azucares", valores.get(Nutriente.AZUCARES_ANADIDOS, 0.0) > 0))
    detalle_azucares = str(agregados.get("detalle_azucares", "Azúcares añadidos" if tiene_azucares else "Sin agregado"))

    tiene_grasas = bool(agregados.get("grasas", valores.get(Nutriente.GRASAS_TOTALES, 0.0) > 0))
    detalle_grasas = str(agregados.get("detalle_grasas", "Grasas añadidas" if tiene_grasas else "Sin agregado"))

    tiene_sodio = bool(agregados.get("sodio", valores.get(Nutriente.SODIO_MG, 0.0) > 0))
    detalle_sodio = str(agregados.get("detalle_sodio", "Sodio añadido" if tiene_sodio else "Sin agregado"))

    energia = float(valores.get(Nutriente.ENERGIA_KCAL, 0.0))
    azucares = float(valores.get(Nutriente.AZUCARES_ANADIDOS, 0.0))
    grasas = float(valores.get(Nutriente.GRASAS_TOTALES, 0.0))
    grasas_sat = float(valores.get(Nutriente.GRASAS_SATURADAS, 0.0))
    sodio = float(valores.get(Nutriente.SODIO_MG, 0.0))

    factor_carb = float(getattr(parametros, "factor_kcal_carbohidratos", 4.0))
    factor_grasa = float(getattr(parametros, "factor_kcal_grasas", 9.0))
    u_azucares = float(getattr(parametros, "umbral_azucares_pct", 10.0))
    u_grasas = float(getattr(parametros, "umbral_grasas_totales_pct", 30.0))
    u_grasas_sat = float(getattr(parametros, "umbral_grasas_saturadas_pct", 10.0))
    u_sodio_kcal = float(getattr(parametros, "umbral_sodio_mg_por_kcal", 1.0))
    u_sodio_100 = float(getattr(parametros, "umbral_sodio_max_100g", 300.0))
    u_sodio_sin_kcal = float(getattr(parametros, "umbral_sodio_bebida_sin_kcal", 40.0))
    u_cal_solido = float(getattr(parametros, "umbral_calorias_solido_100g", 275.0))
    u_cal_liquido = float(getattr(parametros, "umbral_calorias_liquido_100ml", 25.0))

    if not tiene_azucares:
        aplica_azucares = False
        supera_azucares = False
        calculo_azucares = "No aplica (sin agregado)"
    else:
        aplica_azucares = True
        pct_azucares = (azucares * factor_carb * 100.0 / energia) if energia > 0 else 0.0
        calculo_azucares = f"({azucares:g} g × {factor_carb:g} × 100) ÷ {energia:g} kcal = {pct_azucares:.1f}%"
        supera_azucares = round(pct_azucares, 4) >= round(u_azucares, 4)

    paso_azucares = PasoCalculoSello(
        criterio="Azúcares añadidos",
        codigo="EXCESO_AZUCARES",
        leyenda="EXCESO EN AZÚCARES",
        tiene_agregado=tiene_azucares,
        detalle_agregado=detalle_azucares,
        calculo_realizado=calculo_azucares,
        umbral=f"≥ {u_azucares:g}%",
        supera=supera_azucares,
        aplica=aplica_azucares,
    )

    if not tiene_grasas:
        aplica_grasas = False
        supera_grasas = False
        calculo_grasas = "No aplica (sin agregado)"
    else:
        aplica_grasas = True
        pct_grasas = (grasas * factor_grasa * 100.0 / energia) if energia > 0 else 0.0
        calculo_grasas = f"({grasas:g} g × {factor_grasa:g} × 100) ÷ {energia:g} kcal = {pct_grasas:.1f}%"
        supera_grasas = round(pct_grasas, 4) >= round(u_grasas, 4)

    paso_grasas = PasoCalculoSello(
        criterio="Grasas totales",
        codigo="EXCESO_GRASAS_TOTALES",
        leyenda="EXCESO EN GRASAS TOTALES",
        tiene_agregado=tiene_grasas,
        detalle_agregado=detalle_grasas,
        calculo_realizado=calculo_grasas,
        umbral=f"≥ {u_grasas:g}%",
        supera=supera_grasas,
        aplica=aplica_grasas,
    )

    if not tiene_grasas:
        aplica_grasas_sat = False
        supera_grasas_sat = False
        calculo_grasas_sat = "No aplica (sin agregado)"
    else:
        aplica_grasas_sat = True
        pct_grasas_sat = (grasas_sat * factor_grasa * 100.0 / energia) if energia > 0 else 0.0
        calculo_grasas_sat = f"({grasas_sat:g} g × {factor_grasa:g} × 100) ÷ {energia:g} kcal = {pct_grasas_sat:.1f}%"
        supera_grasas_sat = round(pct_grasas_sat, 4) >= round(u_grasas_sat, 4)

    paso_grasas_sat = PasoCalculoSello(
        criterio="Grasas saturadas",
        codigo="EXCESO_GRASAS_SATURADAS",
        leyenda="EXCESO EN GRASAS SATURADAS",
        tiene_agregado=tiene_grasas,
        detalle_agregado=detalle_grasas,
        calculo_realizado=calculo_grasas_sat,
        umbral=f"≥ {u_grasas_sat:g}%",
        supera=supera_grasas_sat,
        aplica=aplica_grasas_sat,
    )

    unidad_vol = "ml" if estado_fisico == EstadoFisico.LIQUIDO else "g"
    if not tiene_sodio:
        aplica_sodio = False
        supera_sodio = False
        calculo_sodio = "No aplica (sin agregado)"
        umbral_sodio_str = f"≥ {u_sodio_kcal:g} mg/kcal o ≥ {u_sodio_100:g} mg/100{unidad_vol}"
    else:
        aplica_sodio = True
        if estado_fisico == EstadoFisico.LIQUIDO and energia <= 4.0:
            supera_sodio = round(sodio, 4) >= round(u_sodio_sin_kcal, 4)
            calculo_sodio = f"{sodio:g} mg / 100 ml (bebida ≤ 4 kcal)"
            umbral_sodio_str = f"≥ {u_sodio_sin_kcal:g} mg/100ml"
        else:
            rel_mg_kcal = (sodio / energia) if energia > 0 else None
            cumple_rel = rel_mg_kcal is not None and round(rel_mg_kcal, 4) >= round(u_sodio_kcal, 4)
            cumple_100 = round(sodio, 4) >= round(u_sodio_100, 4)
            supera_sodio = cumple_rel or cumple_100
            rel_txt = f"{rel_mg_kcal:.2f} mg/kcal" if rel_mg_kcal is not None else "N/D"
            calculo_sodio = f"{sodio:g} mg / {energia:g} kcal = {rel_txt} y {sodio:g} mg / 100 {unidad_vol}"
            umbral_sodio_str = f"≥ {u_sodio_kcal:g} mg/kcal o ≥ {u_sodio_100:g} mg/100{unidad_vol}"

    paso_sodio = PasoCalculoSello(
        criterio="Sodio",
        codigo="EXCESO_SODIO",
        leyenda="EXCESO EN SODIO",
        tiene_agregado=tiene_sodio,
        detalle_agregado=detalle_sodio,
        calculo_realizado=calculo_sodio,
        umbral=umbral_sodio_str,
        supera=supera_sodio,
        aplica=aplica_sodio,
    )

    tiene_sello_energetico = supera_azucares or supera_grasas or supera_grasas_sat
    umbral_cal = u_cal_liquido if estado_fisico == EstadoFisico.LIQUIDO else u_cal_solido
    umbral_cal_str = f"≥ {umbral_cal:g} kcal/100{unidad_vol}"

    if not tiene_sello_energetico:
        aplica_calorias = False
        supera_calorias = False
        detalle_cal = "Condición previa no cumplida"
        calculo_cal = "Sin sellos de azúcares o grasas"
    else:
        aplica_calorias = True
        supera_calorias = round(energia, 4) >= round(umbral_cal, 4)
        detalle_cal = "Condición previa cumplida"
        calculo_cal = f"{energia:g} kcal / 100 {unidad_vol}"

    paso_calorias = PasoCalculoSello(
        criterio="Calorías",
        codigo="EXCESO_CALORIAS",
        leyenda="EXCESO EN CALORÍAS",
        tiene_agregado=tiene_sello_energetico,
        detalle_agregado=detalle_cal,
        calculo_realizado=calculo_cal,
        umbral=umbral_cal_str,
        supera=supera_calorias,
        aplica=aplica_calorias,
    )

    pasos = [paso_azucares, paso_grasas, paso_grasas_sat, paso_sodio, paso_calorias]
    sellos = [p.codigo for p in pasos if p.supera]
    return sellos, pasos
