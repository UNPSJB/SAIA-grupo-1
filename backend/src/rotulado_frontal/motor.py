"""Evaluacion de los sellos del rotulado frontal.

Funciones puras: reciben las reglas ya validadas y los valores nutricionales, sin tocar la base.
Las formulas son una lista cerrada (TipoCondicion); si la norma introduce un tipo de calculo
nuevo, se agrega un caso en valor_condicion. Umbrales, nutrientes, factores y aplicabilidad
vienen siempre de los datos.
"""
from typing import Dict, List, Optional, Sequence, Tuple

from src.rotulado_frontal.constants import Comparador, EstadoFisico, Nutriente, TipoCondicion
from src.rotulado_frontal.schemas import (
    CondicionUmbral, DetalleCondicion, ReglaIn, ResultadoRegla,
)

# se redondea antes de comparar para que 9.9999999 no quede debajo de un umbral de 10
DECIMALES_COMPARACION = 4


def valor_condicion(condicion: CondicionUmbral, valores: Dict[str, float]) -> Optional[float]:
    energia = valores[Nutriente.ENERGIA_KCAL]
    cantidad = valores[condicion.nutriente]
    match condicion.tipo:
        case TipoCondicion.PORCENTAJE_ENERGIA:
            # sin energia el nutriente no aporta calorias
            if energia == 0:
                return 0.0
            return cantidad * condicion.factor_kcal / energia * 100
        case TipoCondicion.MG_POR_KCAL:
            # sin energia la relacion no esta definida; la regla queda en manos de sus otras condiciones
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

    # las condiciones de una regla se combinan con OR
    supera = aplica and any(d.cumple for d in detalle)
    return ResultadoRegla(
        codigo=regla.codigo, leyenda=regla.leyenda, aplica=aplica, supera=supera, condiciones=detalle,
    )


def evaluar(
    reglas: Sequence[ReglaIn], valores: Dict[str, float], estado_fisico: EstadoFisico,
) -> Tuple[List[str], List[ResultadoRegla]]:
    """Devuelve los codigos de los sellos que corresponden y el detalle de cada regla activa."""
    activas = sorted((r for r in reglas if r.activa), key=lambda r: r.orden)
    detalle = [evaluar_regla(r, valores, estado_fisico) for r in activas]
    sellos = [r.codigo for r in detalle if r.supera]
    return sellos, detalle
