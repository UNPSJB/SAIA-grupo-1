import pytest
from sqlalchemy.orm import Session
from tests.database import session
from src.insumos_quimicos.constants import TipoQuimicoEnum, UnidadMedidaEnum
from src.insumos_quimicos import exceptions, schemas
from src.insumos_quimicos.services import InsumoQuimicoService

def test_crear_insumo_quimico_service(session: Session):
    data = schemas.InsumoQuimicoCreate(
        nombre="Desengrasante Pesado",
        tipo=TipoQuimicoEnum.DESENGRASANTE,
        unidad_medida=UnidadMedidaEnum.LITROS,
        stock_actual=40.0,
    )
    insumo = InsumoQuimicoService.create(session, data)
    assert insumo.id is not None
    assert insumo.nombre == "Desengrasante Pesado"
    assert insumo.tipo == TipoQuimicoEnum.DESENGRASANTE
    assert insumo.unidad_medida == UnidadMedidaEnum.LITROS
    assert insumo.stock_actual == 40.0
    assert insumo.activo is True

def test_crear_insumo_quimico_duplicado_falla(session: Session):
    data = schemas.InsumoQuimicoCreate(
        nombre="Amonio Cuaternario Plus",
        tipo=TipoQuimicoEnum.DESINFECTANTE,
        unidad_medida=UnidadMedidaEnum.LITROS,
        stock_actual=15.0,
    )
    InsumoQuimicoService.create(session, data)

    with pytest.raises(exceptions.InsumoQuimicoDuplicateNameException):
        InsumoQuimicoService.create(session, data)

def test_obtener_insumo_quimico_por_id(session: Session):
    data = schemas.InsumoQuimicoCreate(
        nombre="Jabon Sanitizante Manos",
        tipo=TipoQuimicoEnum.SANITIZANTE,
        unidad_medida=UnidadMedidaEnum.LITROS,
        stock_actual=25.0,
    )
    creado = InsumoQuimicoService.create(session, data)
    obtenido = InsumoQuimicoService.get_by_id(session, creado.id)
    assert obtenido.id == creado.id
    assert obtenido.nombre == "Jabon Sanitizante Manos"

    with pytest.raises(exceptions.InsumoQuimicoNotFoundException):
        InsumoQuimicoService.get_by_id(session, 99999)

def test_actualizar_insumo_quimico(session: Session):
    data = schemas.InsumoQuimicoCreate(
        nombre="Cloro Gel",
        tipo=TipoQuimicoEnum.DESINFECTANTE,
        unidad_medida=UnidadMedidaEnum.LITROS,
        stock_actual=10.0,
    )
    creado = InsumoQuimicoService.create(session, data)

    update_data = schemas.InsumoQuimicoUpdate(stock_actual=30.0)
    actualizado = InsumoQuimicoService.update(session, creado.id, update_data)
    assert actualizado.stock_actual == 30.0

def test_toggle_estado_insumo_quimico(session: Session):
    data = schemas.InsumoQuimicoCreate(
        nombre="Pastillas Cloradas",
        tipo=TipoQuimicoEnum.DESINFECTANTE,
        unidad_medida=UnidadMedidaEnum.UNIDADES,
        stock_actual=100.0,
    )
    creado = InsumoQuimicoService.create(session, data)
    assert creado.activo is True

    toggled = InsumoQuimicoService.toggle_estado(session, creado.id)
    assert toggled.activo is False

    toggled_again = InsumoQuimicoService.toggle_estado(session, creado.id)
    assert toggled_again.activo is True
