import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from tests.database import session
from src.insumos import exceptions
from src.insumos.services import (
    listar_insumos,
    crear_insumo,
    leer_insumo,
    modificar_insumo,
    modificar_stock,
    eliminar_insumo,
)
from src.insumos.schemas import InsumoCreate, InsumoUpdate, InsumoUpdateStock
from src.insumos.models import Insumo, UnidadMedida


def test_listar_insumos(session: Session) -> None:
    insumos = listar_insumos(session)
    assert len(insumos) == 3


def test_leer_insumo(session: Session) -> None:
    insumo = leer_insumo(session, 1)
    assert insumo.nombre == "Harina de Trigo 000"
    assert insumo.lote == "ING-HAR-001"
    assert insumo.stock == 80.0
    assert insumo.medida == UnidadMedida.KILOGRAMOS

    with pytest.raises(exceptions.InsumoNoEncontrado):
        leer_insumo(session, 999)


def test_crear_insumo(session: Session) -> None:
    hoy = datetime.now()
    nuevo = InsumoCreate(
        nombre="Sal Fina",
        lote="ING-SAL-004",
        fechaRecepcion=hoy - timedelta(days=1),
        fechaVencimiento=hoy + timedelta(days=365),
        cantRecibida=50.0,
        stock=50.0,
        medida=UnidadMedida.KILOGRAMOS,
    )
    insumo = crear_insumo(session, nuevo)
    assert insumo.id is not None
    assert insumo.nombre == "Sal Fina"

    insumos = listar_insumos(session)
    assert len(insumos) == 4


def test_crear_insumo_nombre_vacio(session: Session) -> None:
    hoy = datetime.now()
    with pytest.raises(exceptions.NombreInsumoVacio):
        crear_insumo(
            session,
            InsumoCreate(
                nombre="   ",
                lote="ING-ERR-005",
                fechaRecepcion=hoy - timedelta(days=1),
                fechaVencimiento=hoy + timedelta(days=60),
                cantRecibida=10.0,
                stock=5.0,
                medida=UnidadMedida.UNIDADES,
            ),
        )


def test_modificar_insumo(session: Session) -> None:
    insumo_id = 1
    nuevo_nombre = "Harina de Trigo 0000"
    insumo = modificar_insumo(
        session, insumo_id, InsumoUpdate(nombre=nuevo_nombre)
    )
    assert insumo.nombre == nuevo_nombre

    # Probar que no permite stock mayor a cantidad recibida
    with pytest.raises(exceptions.StockMayorCantidad):
        modificar_insumo(session, insumo_id, InsumoUpdate(stock=9999.0))


def test_modificar_stock(session: Session) -> None:
    insumo_id = 1
    insumo_antes = leer_insumo(session, insumo_id)
    stock_anterior = insumo_antes.stock

    # Restar 10 unidades
    insumo_despues = modificar_stock(
        session, insumo_id, InsumoUpdateStock(stock=10.0)
    )
    assert insumo_despues.stock == stock_anterior - 10.0

    # Intentar restar más del stock disponible
    with pytest.raises(exceptions.StockInvalido):
        modificar_stock(session, insumo_id, InsumoUpdateStock(stock=500.0))


def test_eliminar_insumo(session: Session) -> None:
    insumos_antes = listar_insumos(session)
    assert len(insumos_antes) == 3

    insumo_eliminado = eliminar_insumo(session, 1)
    assert insumo_eliminado.id == 1

    insumos_despues = listar_insumos(session)
    assert len(insumos_despues) == 2

    with pytest.raises(exceptions.InsumoNoEncontrado):
        leer_insumo(session, 1)



# ------------------------------------------------------------------ baja logica


def _nuevo(nombre: str) -> InsumoCreate:
    hoy = datetime.now()
    return InsumoCreate(
        nombre=nombre,
        lote="ING-NUE-001",
        fechaRecepcion=hoy - timedelta(days=1),
        fechaVencimiento=hoy + timedelta(days=365),
        cantRecibida=10.0,
        stock=10.0,
        medida=UnidadMedida.KILOGRAMOS,
    )


def test_eliminar_insumo_es_baja_logica(session: Session) -> None:
    eliminar_insumo(session, 1)

    # la fila sigue en la base (los lotes de produccion que la usaron la necesitan)
    insumo = session.get(Insumo, 1)
    assert insumo is not None
    assert insumo.activo is False


def test_un_insumo_dado_de_baja_no_se_puede_modificar_ni_volver_a_eliminar(session: Session) -> None:
    eliminar_insumo(session, 1)

    with pytest.raises(exceptions.InsumoNoEncontrado):
        modificar_insumo(session, 1, InsumoUpdate(lote="OTRO"))
    with pytest.raises(exceptions.InsumoNoEncontrado):
        modificar_stock(session, 1, InsumoUpdateStock(stock=1.0))
    with pytest.raises(exceptions.InsumoNoEncontrado):
        eliminar_insumo(session, 1)


@pytest.mark.parametrize("nombre", ["Harina de Trigo 000", "harina de trigo 000", "  HARINA DE TRIGO 000 "])
def test_no_se_puede_crear_un_insumo_con_el_nombre_de_uno_activo(session: Session, nombre: str) -> None:
    with pytest.raises(exceptions.NombreInsumoDuplicado):
        crear_insumo(session, _nuevo(nombre))


def test_se_puede_reusar_el_nombre_de_un_insumo_dado_de_baja(session: Session) -> None:
    eliminar_insumo(session, 1)

    insumo = crear_insumo(session, _nuevo("Harina de Trigo 000"))

    assert insumo.id != 1
    assert [i.nombre for i in listar_insumos(session)].count("Harina de Trigo 000") == 1


def test_no_se_puede_renombrar_con_el_nombre_de_otro_activo(session: Session) -> None:
    with pytest.raises(exceptions.NombreInsumoDuplicado):
        modificar_insumo(session, 1, InsumoUpdate(nombre="aceite de girasol"))
    # mantener el propio nombre (o cambiarle las mayusculas) no es un duplicado
    assert modificar_insumo(session, 1, InsumoUpdate(nombre="HARINA DE TRIGO 000")).nombre == "HARINA DE TRIGO 000"
