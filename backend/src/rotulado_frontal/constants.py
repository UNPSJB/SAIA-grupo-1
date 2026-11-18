from datetime import date
from enum import StrEnum


class EstadoConjunto(StrEnum):
    # un BORRADOR se puede editar o borrar; un PUBLICADO queda fijo para no alterar calculos historicos
    BORRADOR = "BORRADOR"
    PUBLICADO = "PUBLICADO"


class TipoCondicion(StrEnum):
    # % del valor energetico que aporta el nutriente: nutriente * factor_kcal / energia_kcal * 100
    PORCENTAJE_ENERGIA = "PORCENTAJE_ENERGIA"
    # cantidad del nutriente cada 100 g o 100 ml
    CANTIDAD_POR_100 = "CANTIDAD_POR_100"
    # miligramos del nutriente por cada kcal: nutriente / energia_kcal
    MG_POR_KCAL = "MG_POR_KCAL"


class Comparador(StrEnum):
    MAYOR = ">"
    MAYOR_IGUAL = ">="
    MENOR = "<"
    MENOR_IGUAL = "<="


class EstadoFisico(StrEnum):
    SOLIDO = "SOLIDO"
    LIQUIDO = "LIQUIDO"


class Nutriente(StrEnum):
    # valores por 100 g o 100 ml; el sodio en mg y el resto en g, la energia en kcal
    ENERGIA_KCAL = "energia_kcal"
    AZUCARES_ANADIDOS = "azucares_anadidos"
    GRASAS_TOTALES = "grasas_totales"
    GRASAS_SATURADAS = "grasas_saturadas"
    SODIO_MG = "sodio_mg"


CLAVE_MODULO_OCTOGONOS = "octogonos"

# Conjunto que se carga la primera vez que arranca el sistema, para que haya parametros vigentes.
# Los umbrales y la fecha hay que contrastarlos con el texto oficial del Decreto 151/2022:
# si difieren, se corrigen creando una nueva version desde la pantalla, no tocando este archivo.
PARAMETROS_INICIALES = {
    "version": "2022.1",
    "fecha_vigencia": date(2022, 3, 23),
    "norma_origen": "Ley 27.642 - Decreto 151/2022, Anexo II",
    "descripcion": "Version inicial cargada por el sistema",
    "reglas": [
        {
            "codigo": "EXCESO_AZUCARES",
            "leyenda": "EXCESO EN AZÚCARES",
            "orden": 1,
            "condiciones": [
                {"tipo": "PORCENTAJE_ENERGIA", "nutriente": "azucares_anadidos", "factor_kcal": 4,
                 "comparador": ">=", "umbral": 10},
            ],
            "aplicabilidad": [
                {"campo": "azucares_anadidos", "comparador": ">", "valor": 0},
            ],
        },
        {
            "codigo": "EXCESO_GRASAS_TOTALES",
            "leyenda": "EXCESO EN GRASAS TOTALES",
            "orden": 2,
            "condiciones": [
                {"tipo": "PORCENTAJE_ENERGIA", "nutriente": "grasas_totales", "factor_kcal": 9,
                 "comparador": ">=", "umbral": 30},
            ],
            "aplicabilidad": [],
        },
        {
            "codigo": "EXCESO_GRASAS_SATURADAS",
            "leyenda": "EXCESO EN GRASAS SATURADAS",
            "orden": 3,
            "condiciones": [
                {"tipo": "PORCENTAJE_ENERGIA", "nutriente": "grasas_saturadas", "factor_kcal": 9,
                 "comparador": ">=", "umbral": 10},
            ],
            "aplicabilidad": [],
        },
        {
            "codigo": "EXCESO_SODIO",
            "leyenda": "EXCESO EN SODIO",
            "orden": 4,
            "condiciones": [
                {"tipo": "MG_POR_KCAL", "nutriente": "sodio_mg", "comparador": ">=", "umbral": 1},
                {"tipo": "CANTIDAD_POR_100", "nutriente": "sodio_mg", "comparador": ">=", "umbral": 300},
            ],
            "aplicabilidad": [],
        },
        {
            "codigo": "EXCESO_CALORIAS",
            "leyenda": "EXCESO EN CALORÍAS",
            "orden": 5,
            "condiciones": [
                {"tipo": "CANTIDAD_POR_100", "nutriente": "energia_kcal", "comparador": ">=", "umbral": 275,
                 "estado_fisico": "SOLIDO"},
                {"tipo": "CANTIDAD_POR_100", "nutriente": "energia_kcal", "comparador": ">=", "umbral": 70,
                 "estado_fisico": "LIQUIDO"},
            ],
            "aplicabilidad": [],
        },
    ],
}


class ErrorCode:
    CONJUNTO_NO_ENCONTRADO = "Conjunto de parámetros no encontrado"
    VERSION_DUPLICADA = "Ya existe un conjunto de parámetros con esa versión"
    CONJUNTO_PUBLICADO_INMUTABLE = (
        "Un conjunto publicado no se puede modificar ni eliminar; creá una nueva versión"
    )
    CALCULO_NO_ENCONTRADO = "El producto todavía no tiene cálculos de rotulado"
    CALCULO_INMUTABLE ="Los cálculos realizados no se pueden modificar ni eliminar"
    CONJUNTO_SIN_REGLAS = "No se puede publicar un conjunto sin reglas activas"
    FECHA_VIGENCIA_NO_POSTERIOR = (
        "La fecha de vigencia debe ser posterior a la del último conjunto publicado"
    )
    SIN_PARAMETROS_VIGENTES = "No hay parámetros de rotulado vigentes para la fecha indicada"
    MODULO_DESACTIVADO = "El módulo de octógonos está desactivado"
    ESTADO_FISICO_INDETERMINADO = (
        "No se puede determinar si el producto es sólido o líquido por su unidad de medida; indicalo"
    )
