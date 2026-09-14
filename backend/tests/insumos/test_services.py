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
from src.insumos.models import UnidadMedida


def test_listar_insumos(session: Session) -> None:
    insumos = listar_insumos(session)
    assert len(insumos) == 3


def test_leer_insumo(session: Session) -> None:
    insumo = leer_insumo(session, 1)
    assert insumo.nombre == "Lavandina concentrada 55g/l"
    assert insumo.lote == "POES-LAV-001"
    assert insumo.stock == 80.0
    assert insumo.medida == UnidadMedida.LITROS

    with pytest.raises(exceptions.InsumoNoEncontrado):
        leer_insumo(session, 999)


def test_crear_insumo(session: Session) -> None:
    hoy = datetime.now()
    nuevo = InsumoCreate(
        nombre="Alcohol sanitizante 70%",
        lote="POES-ALC-004",
        fechaRecepcion=hoy - timedelta(days=1),
        fechaVencimiento=hoy + timedelta(days=60),
        cantRecibida=200.0,
        stock=150.0,
        medida=UnidadMedida.LITROS,
    )
    insumo = crear_insumo(session, nuevo)
    assert insumo.id is not None
    assert insumo.nombre == "Alcohol sanitizante 70%"

    insumos = listar_insumos(session)
    assert len(insumos) == 4


def test_crear_insumo_nombre_vacio(session: Session) -> None:
    hoy = datetime.now()
    with pytest.raises(exceptions.NombreInsumoVacio):
        crear_insumo(
            session,
            InsumoCreate(
                nombre="   ",
                lote="POES-ERR-005",
                fechaRecepcion=hoy - timedelta(days=1),
                fechaVencimiento=hoy + timedelta(days=60),
                cantRecibida=10.0,
                stock=5.0,
                medida=UnidadMedida.UNIDADES,
            ),
        )


def test_modificar_insumo(session: Session) -> None:
    insumo_id = 1
    nuevo_nombre = "Lavandina sanitizante 60g/l"
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

