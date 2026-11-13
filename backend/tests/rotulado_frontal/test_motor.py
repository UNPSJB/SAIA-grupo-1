"""Tests del motor de evaluacion: funciones puras, sin base de datos."""
import pytest
from pydantic import ValidationError

from src.rotulado_frontal import motor
from src.rotulado_frontal.constants import PARAMETROS_INICIALES, EstadoFisico
from src.rotulado_frontal.schemas import ConjuntoCreate, CondicionUmbral, ReglaIn

REGLAS = ConjuntoCreate.model_validate(PARAMETROS_INICIALES).reglas


def valores(**cambios) -> dict:
    # producto "neutro": 100 kcal sin ningun nutriente critico
    base = {"energia_kcal": 100, "azucares_anadidos": 0, "grasas_totales": 0, "grasas_saturadas": 0, "sodio_mg": 0}
    base.update(cambios)
    return base


def sellos(v: dict, estado=EstadoFisico.SOLIDO) -> list[str]:
    return motor.evaluar(REGLAS, v, estado)[0]


def test_producto_sin_nutrientes_criticos_no_lleva_sellos():
    assert sellos(valores()) == []


@pytest.mark.parametrize("azucares, esperado", [(2.4, False), (2.5, True), (3, True)])
def test_azucares_en_el_umbral_del_10_por_ciento(azucares, esperado):
    # 2.5 g * 4 kcal / 100 kcal = 10 %
    assert ("EXCESO_AZUCARES" in sellos(valores(azucares_anadidos=azucares))) is esperado


def test_redondeo_evita_falsos_negativos_por_punto_flotante():
    # 0.1 * 3 da 0.30000000000000004; la comparacion no debe depender de eso
    v = valores(energia_kcal=120, azucares_anadidos=3)  # 12 kcal / 120 kcal = 10 %
    assert "EXCESO_AZUCARES" in sellos(v)


@pytest.mark.parametrize("grasas, esperado", [(3.3, False), (3.34, True)])
def test_grasas_totales_30_por_ciento(grasas, esperado):
    assert ("EXCESO_GRASAS_TOTALES" in sellos(valores(grasas_totales=grasas))) is esperado


def test_grasas_saturadas_10_por_ciento():
    assert "EXCESO_GRASAS_SATURADAS" in sellos(valores(grasas_saturadas=1.12))
    assert "EXCESO_GRASAS_SATURADAS" not in sellos(valores(grasas_saturadas=1.1))


def test_sodio_supera_solo_por_mg_por_kcal():
    # 150 mg / 100 kcal = 1.5 mg/kcal, pero < 300 mg cada 100 g
    assert "EXCESO_SODIO" in sellos(valores(sodio_mg=150))


def test_sodio_supera_solo_por_cantidad_cada_100():
    # 350 mg / 1000 kcal = 0.35 mg/kcal, pero >= 300 mg cada 100 g
    assert "EXCESO_SODIO" in sellos(valores(energia_kcal=1000, sodio_mg=350))


def test_sodio_sin_energia_no_rompe_y_usa_la_otra_condicion():
    _, detalle = motor.evaluar(REGLAS, valores(energia_kcal=0, sodio_mg=400), EstadoFisico.LIQUIDO)
    sodio = next(r for r in detalle if r.codigo == "EXCESO_SODIO")
    assert sodio.supera is True
    assert sodio.condiciones[0].valor_calculado is None
    assert sodio.condiciones[0].cumple is False


def test_energia_cero_no_divide_por_cero():
    assert sellos(valores(energia_kcal=0, azucares_anadidos=5, grasas_totales=5)) == []


def test_calorias_depende_del_estado_fisico():
    v = valores(energia_kcal=100)
    assert "EXCESO_CALORIAS" in sellos(v, EstadoFisico.LIQUIDO)      # >= 70 kcal / 100 ml
    assert "EXCESO_CALORIAS" not in sellos(v, EstadoFisico.SOLIDO)   # < 275 kcal / 100 g
    assert "EXCESO_CALORIAS" in sellos(valores(energia_kcal=300), EstadoFisico.SOLIDO)


def test_condicion_de_otro_estado_fisico_queda_sin_evaluar():
    _, detalle = motor.evaluar(REGLAS, valores(energia_kcal=300), EstadoFisico.SOLIDO)
    calorias = next(r for r in detalle if r.codigo == "EXCESO_CALORIAS")
    liquido = next(d for d in calorias.condiciones if d.condicion.estado_fisico == EstadoFisico.LIQUIDO)
    assert liquido.evaluada is False and liquido.cumple is False


def test_aplicabilidad_impide_el_sello_aunque_supere_el_umbral():
    regla = ReglaIn(
        codigo="exceso grasas",
        leyenda="EXCESO EN GRASAS TOTALES",
        condiciones=[{"tipo": "PORCENTAJE_ENERGIA", "nutriente": "grasas_totales", "factor_kcal": 9, "umbral": 30}],
        # solo aplica si tiene azucares anadidos
        aplicabilidad=[{"campo": "azucares_anadidos", "comparador": ">", "valor": 0}],
    )
    assert regla.codigo == "EXCESO_GRASAS"
    sellos_, detalle = motor.evaluar([regla], valores(grasas_totales=5), EstadoFisico.SOLIDO)
    assert sellos_ == []
    assert detalle[0].aplica is False

    sellos_, _ = motor.evaluar([regla], valores(grasas_totales=5, azucares_anadidos=1), EstadoFisico.SOLIDO)
    assert sellos_ == ["EXCESO_GRASAS"]


def test_reglas_inactivas_no_se_evaluan():
    inactiva = REGLAS[0].model_copy(update={"activa": False})
    sellos_, detalle = motor.evaluar([inactiva], valores(azucares_anadidos=10), EstadoFisico.SOLIDO)
    assert sellos_ == [] and detalle == []


def test_porcentaje_energia_exige_factor_kcal():
    with pytest.raises(ValidationError):
        CondicionUmbral(tipo="PORCENTAJE_ENERGIA", nutriente="azucares_anadidos", umbral=10)


def test_energia_no_se_compara_contra_si_misma():
    with pytest.raises(ValidationError):
        CondicionUmbral(tipo="MG_POR_KCAL", nutriente="energia_kcal", umbral=1)
