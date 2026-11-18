from datetime import date

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.producto.models import UnidadMedida
from src.producto.schemas import ProductoCreate
from src.producto.services import crear_producto
from src.rotulado_frontal import exceptions, services
from src.rotulado_frontal.constants import PARAMETROS_INICIALES, EstadoConjunto
from src.rotulado_frontal.models import CalculoRotulado, ConjuntoParametrosRotulado
from src.rotulado_frontal.schemas import CalculoIn, ConjuntoCreate, NuevaVersionIn
from tests.database import session


def datos_conjunto(version: str, fecha: date) -> ConjuntoCreate:
    datos = dict(PARAMETROS_INICIALES, version=version, fecha_vigencia=fecha)
    return ConjuntoCreate.model_validate(datos)


def test_datos_iniciales_es_idempotente(session: Session) -> None:
    services.asegurar_datos_iniciales(session)
    services.asegurar_datos_iniciales(session)

    assert session.scalar(select(func.count(ConjuntoParametrosRotulado.id))) == 1
    vigente = services.obtener_vigente(session)
    assert vigente.version == PARAMETROS_INICIALES["version"]
    assert vigente.estado == EstadoConjunto.PUBLICADO
    assert len(vigente.reglas) == 5
    assert services.modulo_activo(session) is True


def test_vigente_segun_fecha(session: Session) -> None:
    v1 = services.crear_conjunto(session, datos_conjunto("v1", date(2020, 1, 1)))
    services.publicar(session, v1.id)
    v2 = services.crear_conjunto(session, datos_conjunto("v2", date(2021, 1, 1)))
    services.publicar(session, v2.id)

    with pytest.raises(exceptions.SinParametrosVigentes):
        services.obtener_vigente(session, date(2019, 12, 31))
    assert services.obtener_vigente(session, date(2020, 6, 1)).version == "v1"
    assert services.obtener_vigente(session, date(2021, 1, 1)).version == "v2"
    assert services.obtener_vigente(session).es_vigente is True


def test_un_borrador_no_es_vigente(session: Session) -> None:
    services.crear_conjunto(session, datos_conjunto("v1", date(2020, 1, 1)))
    with pytest.raises(exceptions.SinParametrosVigentes):
        services.obtener_vigente(session)


def test_nueva_version_copia_las_reglas(session: Session) -> None:
    v1 = services.crear_conjunto(session, datos_conjunto("v1", date(2020, 1, 1)))
    services.publicar(session, v1.id)

    v2 = services.nueva_version(
        session, v1.id,
        NuevaVersionIn(version="v2", fecha_vigencia=date(2021, 1, 1), norma_origen="Resolución X"),
    )
    assert v2.estado == EstadoConjunto.BORRADOR
    assert v2.basado_en_id == v1.id
    assert [r.codigo for r in v2.reglas] == [r.codigo for r in v1.reglas]
    assert {r.id for r in v2.reglas}.isdisjoint({r.id for r in v1.reglas})


def test_no_se_publica_con_fecha_no_posterior(session: Session) -> None:
    v1 = services.crear_conjunto(session, datos_conjunto("v1", date(2021, 1, 1)))
    services.publicar(session, v1.id)
    v2 = services.crear_conjunto(session, datos_conjunto("v2", date(2021, 1, 1)))

    with pytest.raises(exceptions.FechaVigenciaNoPosterior):
        services.publicar(session, v2.id)


def test_no_se_publica_sin_reglas(session: Session) -> None:
    vacio = services.crear_conjunto(
        session, ConjuntoCreate(version="v1", fecha_vigencia=date(2020, 1, 1), norma_origen="Ley 27.642"),
    )
    with pytest.raises(exceptions.ConjuntoSinReglas):
        services.publicar(session, vacio.id)


def test_orm_bloquea_cambios_sobre_un_conjunto_publicado(session: Session) -> None:
    """Aunque alguien saltee los servicios, la base no deja alterar lo publicado."""
    v1 = services.crear_conjunto(session, datos_conjunto("v1", date(2020, 1, 1)))
    services.publicar(session, v1.id)

    conjunto = session.get(ConjuntoParametrosRotulado, v1.id)
    conjunto.norma_origen = "otra norma"
    with pytest.raises(exceptions.ConjuntoPublicadoInmutable):
        session.commit()
    session.rollback()

    regla = conjunto.reglas[0]
    regla.condiciones = []
    with pytest.raises(exceptions.ConjuntoPublicadoInmutable):
        session.commit()
    session.rollback()


def test_orm_bloquea_cambios_sobre_un_calculo(session: Session) -> None:
    v1 = services.crear_conjunto(session, datos_conjunto("v1", date(2020, 1, 1)))
    services.publicar(session, v1.id)
    producto = crear_producto(session, ProductoCreate(nombre="Alfajor", unidadMedida=UnidadMedida.GRAMOS))
    calculo = services.calcular_rotulado(session, producto.id, CalculoIn(valores={
        "energia_kcal": 400, "azucares_anadidos": 30, "grasas_totales": 5, "grasas_saturadas": 1, "sodio_mg": 100,
    }))

    calculo = session.get(CalculoRotulado, calculo.id)
    calculo.sellos = []
    with pytest.raises(exceptions.CalculoInmutable):
        session.commit()
    session.rollback()

    session.delete(session.get(CalculoRotulado, calculo.id))
    with pytest.raises(exceptions.CalculoInmutable):
        session.commit()
    session.rollback()


def test_estado_fisico_se_deduce_de_la_unidad(session: Session) -> None:
    v1 = services.crear_conjunto(session, datos_conjunto("v1", date(2020, 1, 1)))
    services.publicar(session, v1.id)
    valores = {"energia_kcal": 100, "azucares_anadidos": 0, "grasas_totales": 0, "grasas_saturadas": 0, "sodio_mg": 0}

    jugo = crear_producto(session, ProductoCreate(nombre="Jugo", unidadMedida=UnidadMedida.MILILITROS))
    calculo = services.calcular_rotulado(session, jugo.id, CalculoIn(valores=valores))
    assert calculo.estado_fisico == "LIQUIDO"
    assert calculo.sellos == ["EXCESO_CALORIAS"]

    caja = crear_producto(session, ProductoCreate(nombre="Caja surtida", unidadMedida=UnidadMedida.UNIDADES))
    with pytest.raises(exceptions.EstadoFisicoIndeterminado):
        services.calcular_rotulado(session, caja.id, CalculoIn(valores=valores))
    calculo = services.calcular_rotulado(session, caja.id, CalculoIn(valores=valores, estado_fisico="SOLIDO"))
    assert calculo.sellos == []
