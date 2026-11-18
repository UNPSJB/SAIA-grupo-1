from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from src.insumos.models import Insumo
from src.producto.models import Producto
from src.recetas.models import Receta, VersionReceta, RecetaDetalle, CLASE_FUNCIONAL
from src.nutricion.services import (
    migrar_columnas_nutricionales,
    asegurar_parametros_defecto,
    calcular_informacion_nutricional,
)

DATOS_NUTRICIONALES_INSUMOS: Dict[str, Dict[str, Any]] = {
    "harina_000": {"energia_kcal": 350.0, "energia_kj": 1464.4, "carbohidratos": 72.0, "azucares_totales": 1.5, "azucares_anadidos": 0.0, "proteinas": 10.0, "grasas_totales": 1.2, "grasas_saturadas": 0.3, "grasas_trans": 0.0, "fibra_alimentaria": 3.5, "sodio_mg": 5.0, "es_aditivo": False, "fuente": "SARA_2"},
    "harina_0000": {"energia_kcal": 353.0, "energia_kj": 1477.0, "carbohidratos": 74.0, "azucares_totales": 1.2, "azucares_anadidos": 0.0, "proteinas": 9.5, "grasas_totales": 1.0, "grasas_saturadas": 0.2, "grasas_trans": 0.0, "fibra_alimentaria": 2.8, "sodio_mg": 4.0, "es_aditivo": False, "fuente": "SARA_2"},
    "harina_integral": {"energia_kcal": 340.0, "energia_kj": 1422.6, "carbohidratos": 68.0, "azucares_totales": 1.8, "azucares_anadidos": 0.0, "proteinas": 12.0, "grasas_totales": 2.2, "grasas_saturadas": 0.4, "grasas_trans": 0.0, "fibra_alimentaria": 10.5, "sodio_mg": 6.0, "es_aditivo": False, "fuente": "SARA_2"},
    "harina_centeno": {"energia_kcal": 335.0, "energia_kj": 1401.6, "carbohidratos": 65.0, "azucares_totales": 2.0, "azucares_anadidos": 0.0, "proteinas": 9.0, "grasas_totales": 1.5, "grasas_saturadas": 0.3, "grasas_trans": 0.0, "fibra_alimentaria": 12.0, "sodio_mg": 3.0, "es_aditivo": False, "fuente": "SARA_2"},
    "manteca": {"energia_kcal": 717.0, "energia_kj": 3000.0, "carbohidratos": 0.1, "azucares_totales": 0.1, "azucares_anadidos": 0.0, "proteinas": 0.8, "grasas_totales": 81.0, "grasas_saturadas": 51.0, "grasas_trans": 2.5, "fibra_alimentaria": 0.0, "sodio_mg": 11.0, "es_aditivo": False, "fuente": "SARA_2"},
    "azucar": {"energia_kcal": 387.0, "energia_kj": 1619.2, "carbohidratos": 100.0, "azucares_totales": 100.0, "azucares_anadidos": 100.0, "proteinas": 0.0, "grasas_totales": 0.0, "grasas_saturadas": 0.0, "grasas_trans": 0.0, "fibra_alimentaria": 0.0, "sodio_mg": 1.0, "es_aditivo": False, "fuente": "SARA_2"},
    "azucar_mascabo": {"energia_kcal": 380.0, "energia_kj": 1589.9, "carbohidratos": 98.0, "azucares_totales": 95.0, "azucares_anadidos": 95.0, "proteinas": 0.2, "grasas_totales": 0.0, "grasas_saturadas": 0.0, "grasas_trans": 0.0, "fibra_alimentaria": 0.0, "sodio_mg": 15.0, "es_aditivo": False, "fuente": "SARA_2"},
    "azucar_impalpable": {"energia_kcal": 389.0, "energia_kj": 1627.6, "carbohidratos": 99.5, "azucares_totales": 99.5, "azucares_anadidos": 99.5, "proteinas": 0.0, "grasas_totales": 0.0, "grasas_saturadas": 0.0, "grasas_trans": 0.0, "fibra_alimentaria": 0.0, "sodio_mg": 2.0, "es_aditivo": False, "fuente": "SARA_2"},
    "huevos": {"energia_kcal": 143.0, "energia_kj": 598.3, "carbohidratos": 0.7, "azucares_totales": 0.4, "azucares_anadidos": 0.0, "proteinas": 12.6, "grasas_totales": 9.5, "grasas_saturadas": 3.1, "grasas_trans": 0.0, "fibra_alimentaria": 0.0, "sodio_mg": 142.0, "es_aditivo": False, "fuente": "SARA_2"},
    "leche_entera": {"energia_kcal": 60.0, "energia_kj": 251.0, "carbohidratos": 4.7, "azucares_totales": 4.7, "azucares_anadidos": 0.0, "proteinas": 3.2, "grasas_totales": 3.0, "grasas_saturadas": 1.8, "grasas_trans": 0.1, "fibra_alimentaria": 0.0, "sodio_mg": 45.0, "es_aditivo": False, "fuente": "SARA_2"},
    "leche_descremada": {"energia_kcal": 34.0, "energia_kj": 142.3, "carbohidratos": 4.9, "azucares_totales": 4.9, "azucares_anadidos": 0.0, "proteinas": 3.4, "grasas_totales": 0.1, "grasas_saturadas": 0.06, "grasas_trans": 0.0, "fibra_alimentaria": 0.0, "sodio_mg": 48.0, "es_aditivo": False, "fuente": "SARA_2"},
    "crema": {"energia_kcal": 345.0, "energia_kj": 1443.5, "carbohidratos": 2.8, "azucares_totales": 2.8, "azucares_anadidos": 0.0, "proteinas": 2.1, "grasas_totales": 37.0, "grasas_saturadas": 23.0, "grasas_trans": 1.0, "fibra_alimentaria": 0.0, "sodio_mg": 35.0, "es_aditivo": False, "fuente": "SARA_2"},
    "queso_crema": {"energia_kcal": 240.0, "energia_kj": 1004.2, "carbohidratos": 3.5, "azucares_totales": 3.5, "azucares_anadidos": 0.0, "proteinas": 6.5, "grasas_totales": 22.0, "grasas_saturadas": 14.0, "grasas_trans": 0.6, "fibra_alimentaria": 0.0, "sodio_mg": 320.0, "es_aditivo": False, "fuente": "SARA_2"},
    "queso_maquina": {"energia_kcal": 310.0, "energia_kj": 1297.0, "carbohidratos": 1.5, "azucares_totales": 0.5, "azucares_anadidos": 0.0, "proteinas": 24.0, "grasas_totales": 23.0, "grasas_saturadas": 15.0, "grasas_trans": 0.7, "fibra_alimentaria": 0.0, "sodio_mg": 580.0, "es_aditivo": False, "fuente": "SARA_2"},
    "ricota": {"energia_kcal": 140.0, "energia_kj": 585.8, "carbohidratos": 3.8, "azucares_totales": 3.0, "azucares_anadidos": 0.0, "proteinas": 11.5, "grasas_totales": 8.0, "grasas_saturadas": 5.0, "grasas_trans": 0.2, "fibra_alimentaria": 0.0, "sodio_mg": 110.0, "es_aditivo": False, "fuente": "SARA_2"},
    "queso_tybo": {"energia_kcal": 325.0, "energia_kj": 1360.0, "carbohidratos": 1.0, "azucares_totales": 0.5, "azucares_anadidos": 0.0, "proteinas": 25.0, "grasas_totales": 24.0, "grasas_saturadas": 15.5, "grasas_trans": 0.8, "fibra_alimentaria": 0.0, "sodio_mg": 600.0, "es_aditivo": False, "fuente": "SARA_2"},
    "queso_sardo": {"energia_kcal": 380.0, "energia_kj": 1590.0, "carbohidratos": 1.0, "azucares_totales": 0.2, "azucares_anadidos": 0.0, "proteinas": 33.0, "grasas_totales": 27.0, "grasas_saturadas": 18.0, "grasas_trans": 0.9, "fibra_alimentaria": 0.0, "sodio_mg": 950.0, "es_aditivo": False, "fuente": "SARA_2"},
    "levadura_fresca": {"energia_kcal": 105.0, "energia_kj": 439.3, "carbohidratos": 11.0, "azucares_totales": 0.0, "azucares_anadidos": 0.0, "proteinas": 8.5, "grasas_totales": 1.5, "grasas_saturadas": 0.3, "grasas_trans": 0.0, "fibra_alimentaria": 6.0, "sodio_mg": 30.0, "es_aditivo": False, "fuente": "SARA_2"},
    "levadura_seca": {"energia_kcal": 310.0, "energia_kj": 1297.0, "carbohidratos": 32.0, "azucares_totales": 0.0, "azucares_anadidos": 0.0, "proteinas": 38.0, "grasas_totales": 4.0, "grasas_saturadas": 0.8, "grasas_trans": 0.0, "fibra_alimentaria": 18.0, "sodio_mg": 60.0, "es_aditivo": False, "fuente": "SARA_2"},
    "sal": {"energia_kcal": 0.0, "energia_kj": 0.0, "carbohidratos": 0.0, "azucares_totales": 0.0, "azucares_anadidos": 0.0, "proteinas": 0.0, "grasas_totales": 0.0, "grasas_saturadas": 0.0, "grasas_trans": 0.0, "fibra_alimentaria": 0.0, "sodio_mg": 38850.0, "es_aditivo": False, "fuente": "SARA_2"},
    "dulce_leche": {"energia_kcal": 315.0, "energia_kj": 1318.0, "carbohidratos": 55.0, "azucares_totales": 50.0, "azucares_anadidos": 40.0, "proteinas": 6.5, "grasas_totales": 7.5, "grasas_saturadas": 4.5, "grasas_trans": 0.2, "fibra_alimentaria": 0.0, "sodio_mg": 125.0, "es_aditivo": False, "fuente": "ROTULO_PROVEEDOR"},
    "chocolate_semiamargo": {"energia_kcal": 530.0, "energia_kj": 2217.5, "carbohidratos": 54.0, "azucares_totales": 48.0, "azucares_anadidos": 45.0, "proteinas": 5.0, "grasas_totales": 31.0, "grasas_saturadas": 18.5, "grasas_trans": 0.0, "fibra_alimentaria": 7.0, "sodio_mg": 20.0, "es_aditivo": False, "fuente": "ROTULO_PROVEEDOR"},
    "chocolate_blanco": {"energia_kcal": 545.0, "energia_kj": 2280.3, "carbohidratos": 59.0, "azucares_totales": 58.0, "azucares_anadidos": 52.0, "proteinas": 6.0, "grasas_totales": 31.5, "grasas_saturadas": 19.0, "grasas_trans": 0.2, "fibra_alimentaria": 0.0, "sodio_mg": 90.0, "es_aditivo": False, "fuente": "ROTULO_PROVEEDOR"},
    "cacao_amargo": {"energia_kcal": 310.0, "energia_kj": 1297.0, "carbohidratos": 22.0, "azucares_totales": 1.0, "azucares_anadidos": 0.0, "proteinas": 20.0, "grasas_totales": 12.0, "grasas_saturadas": 7.0, "grasas_trans": 0.0, "fibra_alimentaria": 30.0, "sodio_mg": 25.0, "es_aditivo": False, "fuente": "ROTULO_PROVEEDOR"},
    "chocolate_leche": {"energia_kcal": 535.0, "energia_kj": 2238.4, "carbohidratos": 57.0, "azucares_totales": 55.0, "azucares_anadidos": 48.0, "proteinas": 7.0, "grasas_totales": 30.0, "grasas_saturadas": 18.0, "grasas_trans": 0.2, "fibra_alimentaria": 2.5, "sodio_mg": 80.0, "es_aditivo": False, "fuente": "ROTULO_PROVEEDOR"},
    "aceite_girasol": {"energia_kcal": 900.0, "energia_kj": 3765.6, "carbohidratos": 0.0, "azucares_totales": 0.0, "azucares_anadidos": 0.0, "proteinas": 0.0, "grasas_totales": 100.0, "grasas_saturadas": 11.0, "grasas_trans": 0.0, "fibra_alimentaria": 0.0, "sodio_mg": 0.0, "es_aditivo": False, "fuente": "SARA_2"},
    "aceite_alto_oleico": {"energia_kcal": 900.0, "energia_kj": 3765.6, "carbohidratos": 0.0, "azucares_totales": 0.0, "azucares_anadidos": 0.0, "proteinas": 0.0, "grasas_totales": 100.0, "grasas_saturadas": 7.5, "grasas_trans": 0.0, "fibra_alimentaria": 0.0, "sodio_mg": 0.0, "es_aditivo": False, "fuente": "ROTULO_PROVEEDOR"},
    "vainilla": {"energia_kcal": 0.0, "energia_kj": 0.0, "carbohidratos": 0.0, "azucares_totales": 0.0, "azucares_anadidos": 0.0, "proteinas": 0.0, "grasas_totales": 0.0, "grasas_saturadas": 0.0, "grasas_trans": 0.0, "fibra_alimentaria": 0.0, "sodio_mg": 0.0, "es_aditivo": True, "fuente": "ROTULO_PROVEEDOR"},
    "polvo_hornear": {"energia_kcal": 0.0, "energia_kj": 0.0, "carbohidratos": 0.0, "azucares_totales": 0.0, "azucares_anadidos": 0.0, "proteinas": 0.0, "grasas_totales": 0.0, "grasas_saturadas": 0.0, "grasas_trans": 0.0, "fibra_alimentaria": 0.0, "sodio_mg": 11000.0, "es_aditivo": True, "fuente": "ROTULO_PROVEEDOR"},
    "canela": {"energia_kcal": 247.0, "energia_kj": 1033.4, "carbohidratos": 80.0, "azucares_totales": 2.2, "azucares_anadidos": 0.0, "proteinas": 4.0, "grasas_totales": 1.2, "grasas_saturadas": 0.3, "grasas_trans": 0.0, "fibra_alimentaria": 53.0, "sodio_mg": 10.0, "es_aditivo": False, "fuente": "SARA_2"},
    "membrillo": {"energia_kcal": 260.0, "energia_kj": 1087.8, "carbohidratos": 65.0, "azucares_totales": 60.0, "azucares_anadidos": 50.0, "proteinas": 0.5, "grasas_totales": 0.1, "grasas_saturadas": 0.0, "grasas_trans": 0.0, "fibra_alimentaria": 2.0, "sodio_mg": 15.0, "es_aditivo": False, "fuente": "ROTULO_PROVEEDOR"},
    "jamon": {"energia_kcal": 120.0, "energia_kj": 502.1, "carbohidratos": 1.5, "azucares_totales": 1.0, "azucares_anadidos": 0.0, "proteinas": 18.0, "grasas_totales": 5.0, "grasas_saturadas": 2.0, "grasas_trans": 0.0, "fibra_alimentaria": 0.0, "sodio_mg": 950.0, "es_aditivo": False, "fuente": "ROTULO_PROVEEDOR"},
    "nueces": {"energia_kcal": 654.0, "energia_kj": 2736.3, "carbohidratos": 13.7, "azucares_totales": 2.6, "azucares_anadidos": 0.0, "proteinas": 15.2, "grasas_totales": 65.2, "grasas_saturadas": 6.1, "grasas_trans": 0.0, "fibra_alimentaria": 6.7, "sodio_mg": 2.0, "es_aditivo": False, "fuente": "SARA_2"},
    "almendras": {"energia_kcal": 579.0, "energia_kj": 2422.5, "carbohidratos": 21.6, "azucares_totales": 4.4, "azucares_anadidos": 0.0, "proteinas": 21.2, "grasas_totales": 49.9, "grasas_saturadas": 3.8, "grasas_trans": 0.0, "fibra_alimentaria": 12.5, "sodio_mg": 1.0, "es_aditivo": False, "fuente": "SARA_2"},
    "pasas": {"energia_kcal": 299.0, "energia_kj": 1251.0, "carbohidratos": 79.2, "azucares_totales": 59.2, "azucares_anadidos": 0.0, "proteinas": 3.1, "grasas_totales": 0.5, "grasas_saturadas": 0.1, "grasas_trans": 0.0, "fibra_alimentaria": 3.7, "sodio_mg": 11.0, "es_aditivo": False, "fuente": "SARA_2"},
    "coco": {"energia_kcal": 660.0, "energia_kj": 2761.4, "carbohidratos": 23.6, "azucares_totales": 7.4, "azucares_anadidos": 0.0, "proteinas": 6.9, "grasas_totales": 64.5, "grasas_saturadas": 57.2, "grasas_trans": 0.0, "fibra_alimentaria": 16.3, "sodio_mg": 37.0, "es_aditivo": False, "fuente": "SARA_2"},
    "almidon_maiz": {"energia_kcal": 381.0, "energia_kj": 1594.1, "carbohidratos": 91.0, "azucares_totales": 0.0, "azucares_anadidos": 0.0, "proteinas": 0.3, "grasas_totales": 0.1, "grasas_saturadas": 0.0, "grasas_trans": 0.0, "fibra_alimentaria": 0.9, "sodio_mg": 9.0, "es_aditivo": False, "fuente": "SARA_2"},
    "avena": {"energia_kcal": 379.0, "energia_kj": 1585.7, "carbohidratos": 67.7, "azucares_totales": 1.0, "azucares_anadidos": 0.0, "proteinas": 13.2, "grasas_totales": 6.5, "grasas_saturadas": 1.2, "grasas_trans": 0.0, "fibra_alimentaria": 10.1, "sodio_mg": 6.0, "es_aditivo": False, "fuente": "SARA_2"},
    "mermelada": {"energia_kcal": 250.0, "energia_kj": 1046.0, "carbohidratos": 62.0, "azucares_totales": 55.0, "azucares_anadidos": 45.0, "proteinas": 0.4, "grasas_totales": 0.1, "grasas_saturadas": 0.0, "grasas_trans": 0.0, "fibra_alimentaria": 1.2, "sodio_mg": 15.0, "es_aditivo": False, "fuente": "ROTULO_PROVEEDOR"},
    "miel": {"energia_kcal": 304.0, "energia_kj": 1271.9, "carbohidratos": 82.4, "azucares_totales": 82.1, "azucares_anadidos": 0.0, "proteinas": 0.3, "grasas_totales": 0.0, "grasas_saturadas": 0.0, "grasas_trans": 0.0, "fibra_alimentaria": 0.2, "sodio_mg": 4.0, "es_aditivo": False, "fuente": "SARA_2"},
    "sesamo": {"energia_kcal": 573.0, "energia_kj": 2397.4, "carbohidratos": 23.4, "azucares_totales": 0.3, "azucares_anadidos": 0.0, "proteinas": 17.7, "grasas_totales": 49.7, "grasas_saturadas": 7.0, "grasas_trans": 0.0, "fibra_alimentaria": 11.8, "sodio_mg": 11.0, "es_aditivo": False, "fuente": "SARA_2"},
    "lino": {"energia_kcal": 534.0, "energia_kj": 2234.3, "carbohidratos": 28.9, "azucares_totales": 1.5, "azucares_anadidos": 0.0, "proteinas": 18.3, "grasas_totales": 42.2, "grasas_saturadas": 3.7, "grasas_trans": 0.0, "fibra_alimentaria": 27.3, "sodio_mg": 30.0, "es_aditivo": False, "fuente": "SARA_2"},
    "agua": {"energia_kcal": 0.0, "energia_kj": 0.0, "carbohidratos": 0.0, "azucares_totales": 0.0, "azucares_anadidos": 0.0, "proteinas": 0.0, "grasas_totales": 0.0, "grasas_saturadas": 0.0, "grasas_trans": 0.0, "fibra_alimentaria": 0.0, "sodio_mg": 0.0, "es_aditivo": False, "fuente": "SARA_2"},
}

MAPEO_INSUMOS_IDS: Dict[int, str] = {
    1: "harina_000", 2: "harina_000", 3: "harina_000", 4: "harina_000",
    5: "harina_0000", 6: "harina_0000", 7: "harina_integral", 8: "harina_integral",
    9: "harina_centeno", 10: "manteca", 11: "manteca", 12: "manteca", 13: "manteca",
    14: "azucar", 15: "azucar", 16: "azucar_mascabo", 17: "azucar_impalpable", 18: "azucar",
    19: "huevos", 20: "huevos", 21: "huevos", 22: "huevos",
    23: "leche_entera", 24: "leche_entera", 25: "leche_descremada", 26: "leche_entera",
    27: "crema", 28: "crema", 29: "crema", 30: "crema",
    31: "queso_crema", 32: "queso_maquina", 33: "ricota", 34: "queso_tybo", 35: "queso_sardo", 36: "queso_maquina",
    37: "levadura_fresca", 38: "levadura_fresca", 39: "levadura_seca", 40: "levadura_fresca", 41: "levadura_fresca",
    42: "sal", 43: "sal",
    44: "dulce_leche", 45: "dulce_leche", 46: "dulce_leche", 47: "dulce_leche",
    48: "chocolate_semiamargo", 49: "chocolate_blanco", 50: "cacao_amargo", 51: "chocolate_leche", 52: "chocolate_blanco", 53: "chocolate_semiamargo",
    54: "aceite_girasol", 55: "aceite_alto_oleico",
    56: "vainilla", 57: "vainilla",
    58: "polvo_hornear", 59: "polvo_hornear",
    60: "canela",
    61: "membrillo", 62: "membrillo",
    63: "jamon", 64: "jamon", 65: "jamon", 66: "jamon",
    67: "nueces", 68: "almendras", 69: "pasas", 70: "coco",
    71: "almidon_maiz", 72: "almidon_maiz",
    73: "avena",
    74: "mermelada",
    75: "miel",
    76: "sesamo", 77: "lino",
    78: "agua",
}

def asegurar_recetas_y_productos_base(db: Session) -> None:
    migrar_columnas_nutricionales(db)
    asegurar_parametros_defecto(db)

    ahora = datetime.now()
    todos_insumos = db.query(Insumo).all()
    for ins in todos_insumos:
        clave = MAPEO_INSUMOS_IDS.get(ins.id, "harina_000")
        info = DATOS_NUTRICIONALES_INSUMOS.get(clave, DATOS_NUTRICIONALES_INSUMOS["harina_000"])
        if ins.energia_kcal is None or ins.energia_kcal == 0:
            for campo, val in info.items():
                if campo == "fuente":
                    if not ins.fuente_datos:
                        ins.fuente_datos = val
                elif hasattr(ins, campo):
                    setattr(ins, campo, val)
            if not ins.fecha_carga_nutricional:
                ins.fecha_carga_nutricional = ahora
                ins.usuario_carga_nutricional = "Administrador"

    agua_obj = db.scalar(select(Insumo).where(Insumo.nombre == "Agua Potable"))
    if not agua_obj:
        agua_obj = Insumo(
            nombre="Agua Potable",
            lote="AGUA-RED",
            fechaRecepcion=ahora,
            cantRecibida=1000.0,
            stock=1000.0,
            medida="LITROS",
            unidad_medida_id=3,
            activo=True,
            energia_kcal=0.0,
            energia_kj=0.0,
            carbohidratos=0.0,
            azucares_totales=0.0,
            azucares_anadidos=0.0,
            proteinas=0.0,
            grasas_totales=0.0,
            grasas_saturadas=0.0,
            grasas_trans=0.0,
            fibra_alimentaria=0.0,
            sodio_mg=0.0,
            fuente_datos="SARA_2",
            fecha_carga_nutricional=ahora,
            usuario_carga_nutricional="Administrador",
        )
        db.add(agua_obj)
        db.flush()
    id_agua = agua_obj.id

    recetas_definiciones = [
        {
            "producto_id": 1,
            "nombre": "Receta Pan de Campo Tradicional",
            "rendimiento": 1400.0,
            "porcion_g": 50.0,
            "porciones_env": 28.0,
            "desc_porcion": "1 rebanada (50 g)",
            "ingredientes": [
                {"id": 1, "cant": 1000.0, "unidad": "GRAMOS", "pasos": "Tamizar en corona."},
                {"id": id_agua, "cant": 600.0, "unidad": "GRAMOS", "pasos": "Añadir agua tibia."},
                {"id": 37, "cant": 30.0, "unidad": "GRAMOS", "pasos": "Disolver en parte del agua."},
                {"id": 42, "cant": 20.0, "unidad": "GRAMOS", "pasos": "Agregar por el exterior."},
                {"id": 54, "cant": 20.0, "unidad": "GRAMOS", "pasos": "Incorporar al amasado."},
            ],
        },
        {
            "producto_id": 2,
            "nombre": "Receta Medialunas de Manteca Artesanales",
            "rendimiento": 1200.0,
            "porcion_g": 40.0,
            "porciones_env": 30.0,
            "desc_porcion": "1 unidad (40 g)",
            "ingredientes": [
                {"id": 5, "cant": 600.0, "unidad": "GRAMOS", "pasos": "Colocar en amasadora."},
                {"id": 10, "cant": 250.0, "unidad": "GRAMOS", "pasos": "Empaste para hojaldre."},
                {"id": 23, "cant": 200.0, "unidad": "GRAMOS", "pasos": "Amasar hasta unir."},
                {"id": 14, "cant": 100.0, "unidad": "GRAMOS", "pasos": "Mezclar con los secos."},
                {"id": 19, "cant": 60.0, "unidad": "GRAMOS", "pasos": "Incorporar al batido."},
                {"id": 37, "cant": 25.0, "unidad": "GRAMOS", "pasos": "Fermentar masa previa."},
                {"id": 42, "cant": 10.0, "unidad": "GRAMOS", "pasos": "Mezclar con harina."},
                {"id": 56, "cant": 5.0, "unidad": "GRAMOS", "pasos": "Perfumar masa.", "es_aditivo": True, "ins": "INS 150d"},
            ],
        },
        {
            "producto_id": 3,
            "nombre": "Receta Baguette Tradicional Francesa",
            "rendimiento": 1500.0,
            "porcion_g": 50.0,
            "porciones_env": 30.0,
            "desc_porcion": "1 porción (50 g)",
            "ingredientes": [
                {"id": 1, "cant": 1000.0, "unidad": "GRAMOS", "pasos": "Amasado directo."},
                {"id": id_agua, "cant": 650.0, "unidad": "GRAMOS", "pasos": "Autólisis 30 minutos."},
                {"id": 39, "cant": 10.0, "unidad": "GRAMOS", "pasos": "Incorporar directo a secos."},
                {"id": 42, "cant": 18.0, "unidad": "GRAMOS", "pasos": "Añadir al final del amasado."},
                {"id": 59, "cant": 2.0, "unidad": "GRAMOS", "pasos": "Mejorador de masa.", "es_aditivo": True, "ins": "INS 300"},
            ],
        },
        {
            "producto_id": 4,
            "nombre": "Receta Torta de Chocolate Húmeda",
            "rendimiento": 1800.0,
            "porcion_g": 60.0,
            "porciones_env": 30.0,
            "desc_porcion": "1 porción (60 g)",
            "ingredientes": [
                {"id": 6, "cant": 400.0, "unidad": "GRAMOS", "pasos": "Tamizar con polvo y cacao."},
                {"id": 15, "cant": 350.0, "unidad": "GRAMOS", "pasos": "Batir con manteca."},
                {"id": 11, "cant": 200.0, "unidad": "GRAMOS", "pasos": "Punto pomada."},
                {"id": 20, "cant": 200.0, "unidad": "GRAMOS", "pasos": "Agregar de a uno."},
                {"id": 48, "cant": 250.0, "unidad": "GRAMOS", "pasos": "Fundir a baño maría."},
                {"id": 50, "cant": 80.0, "unidad": "GRAMOS", "pasos": "Incorporar tamizado."},
                {"id": 28, "cant": 200.0, "unidad": "GRAMOS", "pasos": "Unir a la mezcla fundida."},
                {"id": 58, "cant": 15.0, "unidad": "GRAMOS", "pasos": "Leudante químico.", "es_aditivo": True, "ins": "INS 500ii"},
            ],
        },
        {
            "producto_id": 5,
            "nombre": "Receta Pan Lactal Blanco Familiar",
            "rendimiento": 1600.0,
            "porcion_g": 50.0,
            "porciones_env": 32.0,
            "desc_porcion": "2 rebanadas (50 g)",
            "ingredientes": [
                {"id": 2, "cant": 1000.0, "unidad": "GRAMOS", "pasos": "Tamizar en amasadora."},
                {"id": 24, "cant": 550.0, "unidad": "GRAMOS", "pasos": "Leche tibia."},
                {"id": 12, "cant": 60.0, "unidad": "GRAMOS", "pasos": "Incorporar blanda."},
                {"id": 14, "cant": 40.0, "unidad": "GRAMOS", "pasos": "Alimentar fermento."},
                {"id": 38, "cant": 30.0, "unidad": "GRAMOS", "pasos": "Disolver en leche."},
                {"id": 42, "cant": 18.0, "unidad": "GRAMOS", "pasos": "Sal al final."},
            ],
        },
        {
            "producto_id": 6,
            "nombre": "Receta Pan de Salvado con Semillas",
            "rendimiento": 1750.0,
            "porcion_g": 50.0,
            "porciones_env": 35.0,
            "desc_porcion": "2 rebanadas (50 g)",
            "ingredientes": [
                {"id": 7, "cant": 500.0, "unidad": "GRAMOS", "pasos": "Base integral fina."},
                {"id": 8, "cant": 250.0, "unidad": "GRAMOS", "pasos": "Aporte de salvado grueso."},
                {"id": 9, "cant": 200.0, "unidad": "GRAMOS", "pasos": "Harina de centeno para textura."},
                {"id": id_agua, "cant": 600.0, "unidad": "GRAMOS", "pasos": "Hidratación integral."},
                {"id": 73, "cant": 80.0, "unidad": "GRAMOS", "pasos": "Avena fina en masa."},
                {"id": 76, "cant": 40.0, "unidad": "GRAMOS", "pasos": "Semillas de sésamo."},
                {"id": 77, "cant": 40.0, "unidad": "GRAMOS", "pasos": "Semillas de lino."},
                {"id": 55, "cant": 30.0, "unidad": "GRAMOS", "pasos": "Aceite alto oleico."},
                {"id": 75, "cant": 25.0, "unidad": "GRAMOS", "pasos": "Miel natural."},
                {"id": 37, "cant": 25.0, "unidad": "GRAMOS", "pasos": "Levadura fresca."},
                {"id": 43, "cant": 18.0, "unidad": "GRAMOS", "pasos": "Sal entrefina."},
            ],
        },
        {
            "producto_id": 7,
            "nombre": "Receta Facturas Surtidas Clásicas",
            "rendimiento": 2100.0,
            "porcion_g": 60.0,
            "porciones_env": 35.0,
            "desc_porcion": "1 unidad (60 g)",
            "ingredientes": [
                {"id": 5, "cant": 900.0, "unidad": "GRAMOS", "pasos": "Harina especial hojaldre."},
                {"id": 13, "cant": 350.0, "unidad": "GRAMOS", "pasos": "Manteca pastelera."},
                {"id": 23, "cant": 300.0, "unidad": "GRAMOS", "pasos": "Leche entera."},
                {"id": 16, "cant": 120.0, "unidad": "GRAMOS", "pasos": "Azúcar mascabo rubio."},
                {"id": 19, "cant": 100.0, "unidad": "GRAMOS", "pasos": "Huevos enteros."},
                {"id": 45, "cant": 200.0, "unidad": "GRAMOS", "pasos": "Dulce de leche repostero."},
                {"id": 61, "cant": 150.0, "unidad": "GRAMOS", "pasos": "Dulce de membrillo."},
                {"id": 37, "cant": 35.0, "unidad": "GRAMOS", "pasos": "Levadura fresca."},
                {"id": 60, "cant": 5.0, "unidad": "GRAMOS", "pasos": "Canela aromática."},
            ],
        },
        {
            "producto_id": 8,
            "nombre": "Receta Budín de Limón con Glaseado",
            "rendimiento": 1100.0,
            "porcion_g": 55.0,
            "porciones_env": 20.0,
            "desc_porcion": "1 rebanada (55 g)",
            "ingredientes": [
                {"id": 5, "cant": 350.0, "unidad": "GRAMOS", "pasos": "Tamizar secos."},
                {"id": 71, "cant": 60.0, "unidad": "GRAMOS", "pasos": "Almidón de maíz."},
                {"id": 10, "cant": 200.0, "unidad": "GRAMOS", "pasos": "Cremar con azúcar."},
                {"id": 17, "cant": 220.0, "unidad": "GRAMOS", "pasos": "Azúcar impalpable glaseado."},
                {"id": 19, "cant": 180.0, "unidad": "GRAMOS", "pasos": "Huevos a temperatura ambiente."},
                {"id": 58, "cant": 12.0, "unidad": "GRAMOS", "pasos": "Polvo leudante.", "es_aditivo": True, "ins": "INS 500ii"},
                {"id": 57, "cant": 6.0, "unidad": "GRAMOS", "pasos": "Esencia vainilla.", "es_aditivo": True, "ins": "INS 150d"},
                {"id": 42, "cant": 3.0, "unidad": "GRAMOS", "pasos": "Pizca de sal."},
            ],
        },
        {
            "producto_id": 9,
            "nombre": "Receta Chipá Tradicional Correntino",
            "rendimiento": 1400.0,
            "porcion_g": 30.0,
            "porciones_env": 46.0,
            "desc_porcion": "1 unidad (30 g)",
            "ingredientes": [
                {"id": 72, "cant": 600.0, "unidad": "GRAMOS", "pasos": "Almidón de mandioca/maíz especial."},
                {"id": 35, "cant": 200.0, "unidad": "GRAMOS", "pasos": "Queso sardo rallado."},
                {"id": 34, "cant": 180.0, "unidad": "GRAMOS", "pasos": "Queso tybo en cubitos."},
                {"id": 32, "cant": 100.0, "unidad": "GRAMOS", "pasos": "Queso de máquina rallado."},
                {"id": 10, "cant": 120.0, "unidad": "GRAMOS", "pasos": "Manteca pomada."},
                {"id": 19, "cant": 120.0, "unidad": "GRAMOS", "pasos": "Huevos batidos."},
                {"id": 23, "cant": 120.0, "unidad": "GRAMOS", "pasos": "Leche entera."},
                {"id": 42, "cant": 10.0, "unidad": "GRAMOS", "pasos": "Sal fina fina."},
            ],
        },
        {
            "producto_id": 10,
            "nombre": "Receta Ciabatta Rústica Italiana",
            "rendimiento": 1850.0,
            "porcion_g": 50.0,
            "porciones_env": 37.0,
            "desc_porcion": "1 porción (50 g)",
            "ingredientes": [
                {"id": 3, "cant": 600.0, "unidad": "GRAMOS", "pasos": "Harina Chacabuco alta proteína."},
                {"id": 4, "cant": 400.0, "unidad": "GRAMOS", "pasos": "Harina Morixe para fuerza."},
                {"id": id_agua, "cant": 750.0, "unidad": "GRAMOS", "pasos": "Alta hidratación 75%."},
                {"id": 54, "cant": 40.0, "unidad": "GRAMOS", "pasos": "Aceite de girasol refinado."},
                {"id": 37, "cant": 15.0, "unidad": "GRAMOS", "pasos": "Levadura fresca para larga fermentación."},
                {"id": 42, "cant": 20.0, "unidad": "GRAMOS", "pasos": "Sal fina disuelta."},
                {"id": 67, "cant": 60.0, "unidad": "GRAMOS", "pasos": "Nueces mariposa troceadas."},
                {"id": 69, "cant": 40.0, "unidad": "GRAMOS", "pasos": "Pasas de uva hidratadas."},
            ],
        },
    ]

    for def_rec in recetas_definiciones:
        p_id = def_rec["producto_id"]
        prod = db.get(Producto, p_id)
        if not prod:
            continue

        receta = None
        if prod.receta_id:
            receta = db.get(Receta, prod.receta_id)
        if not receta:
            receta = db.scalar(select(Receta).where(Receta.nombre == def_rec["nombre"]))

        if not receta:
            receta = Receta(
                nombre=def_rec["nombre"],
                rendimiento_final=def_rec["rendimiento"],
                fecha_creacion=ahora,
                activo=True,
            )
            db.add(receta)
            db.flush()

        prod.receta_id = receta.id
        prod.tamano_porcion_g = def_rec["porcion_g"]
        prod.porciones_por_envase = def_rec["porciones_env"]
        prod.descripcion_porcion = def_rec["desc_porcion"]

        version = db.scalar(
            select(VersionReceta).where(
                VersionReceta.receta_id == receta.id,
                VersionReceta.es_vigente == True,
            )
        )
        if not version:
            version = VersionReceta(
                receta_id=receta.id,
                version=1,
                rendimiento_final=def_rec["rendimiento"],
                archivado=False,
                es_vigente=True,
                fecha_vigencia=ahora,
                creado_el=ahora,
                creado_por_usuario="Administrador",
            )
            db.add(version)
            db.flush()

        detalles_existentes = db.query(RecetaDetalle).filter(RecetaDetalle.version_receta_id == version.id).all()
        if not detalles_existentes:
            for ing in def_rec["ingredientes"]:
                ins_obj = db.get(Insumo, ing["id"])
                nom_ing = ins_obj.nombre if ins_obj else f"Insumo #{ing['id']}"
                es_adit = bool(ing.get("es_aditivo") or (ins_obj and ins_obj.es_aditivo))
                clase_f = CLASE_FUNCIONAL.CONSERVANTE if es_adit else None
                det = RecetaDetalle(
                    nombre=f"Etapa {nom_ing}",
                    version_receta_id=version.id,
                    ingrediente_id=ing["id"],
                    cantidad=float(ing["cant"]),
                    unidad_medida=ing["unidad"],
                    es_aditivo=es_adit,
                    clase_funcional=clase_f,
                    numero_ins=ing.get("ins"),
                    operario_legajo=1,
                    descripcion_pasos=ing["pasos"],
                )
                db.add(det)
            db.flush()

        try:
            calcular_informacion_nutricional(
                db,
                producto_id=prod.id,
                receta_id=receta.id,
                tamano_porcion_g=def_rec["porcion_g"],
                porciones_por_envase=def_rec["porciones_env"],
                descripcion_porcion=def_rec["desc_porcion"],
                usuario_actual="Administrador",
            )
        except Exception:
            pass

    db.commit()
