import pytest
from datetime import date, datetime, timedelta
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
    recibir_lote_insumo,
    listar_insumos_agrupados_por_tipo,
    listar_insumos_para_selector,
    desechar_insumo,
    obtener_trazabilidad_insumo,
)
from src.insumos.schemas import (
    InsumoBase,
    InsumoCreate,
    InsumoUpdate,
    InsumoUpdateStock,
    RecepcionInsumoRequest,
)
from src.tipoInsumo.schemas import TipoInsumoCreate
from src.tipoInsumo.services import crear_tipo_insumo
from src.proveedores.schemas import ProveedorCreate
from src.proveedores.services import crear_proveedor
from src.insumos.models import Insumo
from src.unidadesMedida.exceptions import UnidadMedidaNoEncontrada
from src.unidadesMedida.services import resolver_unidad_medida

def test_listar_insumos(session: Session) -> None:
    insumos = listar_insumos(session)
    assert len(insumos) == 3

def test_leer_insumo(session: Session) -> None:
    insumo = leer_insumo(session, 1)
    assert insumo.nombre == "Harina de Trigo 000"
    assert insumo.lote == "ING-HAR-001"
    assert insumo.stock == 80.0
    assert insumo.medida == "kilogramos"

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
        medida="kilogramos",
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
                medida="unidades",
            ),
        )

def test_modificar_insumo(session: Session) -> None:
    insumo_id = 1
    nuevo_nombre = "Harina de Trigo 0000"
    insumo = modificar_insumo(
        session, insumo_id, InsumoUpdate(nombre=nuevo_nombre)
    )
    assert insumo.nombre == nuevo_nombre

    with pytest.raises(exceptions.NombreInsumoVacio):
        modificar_insumo(session, insumo_id, InsumoUpdate(nombre="   "))

    with pytest.raises(exceptions.FechaVencimientoInvalida):
        modificar_insumo(session, insumo_id, InsumoUpdate(fechaVencimiento=datetime.now() - timedelta(days=5)))

    with pytest.raises(exceptions.StockMayorCantidad):
        modificar_insumo(session, insumo_id, InsumoUpdate(stock=9999.0))

    with pytest.raises(exceptions.InsumoNoEncontrado):
        modificar_insumo(session, 9999, InsumoUpdate(nombre="Inexistente"))

def test_modificar_stock(session: Session) -> None:
    insumo_id = 1
    insumo_antes = leer_insumo(session, insumo_id)
    stock_anterior = insumo_antes.stock

    insumo_despues = modificar_stock(
        session, insumo_id, InsumoUpdateStock(stock=10.0)
    )
    assert insumo_despues.stock == stock_anterior - 10.0

    with pytest.raises(exceptions.StockInvalido):
        modificar_stock(session, insumo_id, InsumoUpdateStock(stock=500.0))

    with pytest.raises(exceptions.InsumoNoEncontrado):
        modificar_stock(session, 9999, InsumoUpdateStock(stock=5.0))

def test_eliminar_insumo(session: Session) -> None:
    insumos_antes = listar_insumos(session)
    assert len(insumos_antes) == 3

    insumo_eliminado = eliminar_insumo(session, 1)
    assert insumo_eliminado.id == 1

    insumos_despues = listar_insumos(session)
    assert len(insumos_despues) == 2

    with pytest.raises(exceptions.InsumoNoEncontrado):
        leer_insumo(session, 1)

    with pytest.raises(exceptions.InsumoNoEncontrado):
        eliminar_insumo(session, 9999)

def test_validaciones_schemas_insumos(session: Session):
    with pytest.raises(ValueError):
        InsumoBase.is_valid_medida_insumo("   ")

    hoy = datetime.now()
    with pytest.raises(UnidadMedidaNoEncontrada):
        crear_insumo(
            session,
            InsumoCreate(
                nombre="Unidad Inexistente",
                lote="ING-ERR-UNI",
                fechaRecepcion=hoy - timedelta(days=1),
                fechaVencimiento=hoy + timedelta(days=60),
                cantRecibida=10.0,
                stock=5.0,
                medida="INEXISTENTE",
            ),
        )

    with pytest.raises(exceptions.CantidadRecibidaInvalida):
        InsumoCreate.validar_mayores_a_cero(-5)

    with pytest.raises(exceptions.StockInvalido):
        InsumoCreate.validar_menor_a_cero(-5)

    with pytest.raises(exceptions.FechaRecepcionInvalida):
        InsumoCreate.validar_fecha_recepcion(datetime.now() + timedelta(days=2))

    with pytest.raises(exceptions.FechaVencimientoInvalida):
        InsumoCreate.validar_fecha_vencimiento(datetime.now() + timedelta(days=2))

    with pytest.raises(ValueError):
        InsumoUpdate.is_valid_medida_insumo("   ")

    with pytest.raises(exceptions.CantidadRecibidaInvalida):
        InsumoUpdate.validar_mayores_a_cero(-5)

    with pytest.raises(exceptions.StockInvalido):
        InsumoUpdate.validar_menor_a_cero(-5)

    with pytest.raises(exceptions.StockInvalido):
        InsumoUpdateStock.validar_stock_mayor_a_cero(-5)


def _nuevo(nombre: str) -> InsumoCreate:
    hoy = datetime.now()
    return InsumoCreate(
        nombre=nombre,
        lote="ING-NUE-001",
        fechaRecepcion=hoy - timedelta(days=1),
        fechaVencimiento=hoy + timedelta(days=365),
        cantRecibida=10.0,
        stock=10.0,
        medida="kilogramos",
    )


def test_eliminar_insumo_es_baja_logica(session: Session) -> None:
    eliminar_insumo(session, 1)

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
    assert modificar_insumo(session, 1, InsumoUpdate(nombre="HARINA DE TRIGO 000")).nombre == "HARINA DE TRIGO 000"


def test_recibir_lote_insumo_exitoso(session: Session) -> None:
    tipo = crear_tipo_insumo(session, TipoInsumoCreate(nombre="Levadura Seca", unidadMedida="kilogramos"))
    prov = crear_proveedor(session, ProveedorCreate(nombre="Distribuidora Alimentos"))
    hoy = date.today()
    req = RecepcionInsumoRequest(
        tipo_insumo_id=tipo.id,
        proveedor_id=prov.id,
        nombre="Levadura Seca Instantánea",
        lote="LEV-001",
        fechaRecepcion=hoy,
        fechaVencimiento=hoy + timedelta(days=30),
        cantRecibida=25.0,
    )
    insumo = recibir_lote_insumo(session, req)
    assert insumo.id is not None
    assert insumo.stock == 25.0
    assert insumo.medida == "kilogramos"
    assert insumo.tipo_insumo_id == tipo.id
    assert insumo.proveedor_id == prov.id


def test_recibir_lote_fecha_recepcion_invalida(session: Session) -> None:
    tipo = crear_tipo_insumo(session, TipoInsumoCreate(nombre="Canela", unidadMedida="gramos"))
    prov = crear_proveedor(session, ProveedorCreate(nombre="Especias SA"))
    ayer = date.today() - timedelta(days=2)
    with pytest.raises(exceptions.FechaRecepcionSoloHoy):
        recibir_lote_insumo(
            session,
            RecepcionInsumoRequest(
                tipo_insumo_id=tipo.id,
                proveedor_id=prov.id,
                nombre="Canela en Polvo",
                lote="CAN-002",
                fechaRecepcion=ayer,
                fechaVencimiento=date.today() + timedelta(days=30),
                cantRecibida=500.0,
            ),
        )


def test_recibir_lote_fecha_vencimiento_menor_7_dias(session: Session) -> None:
    tipo = crear_tipo_insumo(session, TipoInsumoCreate(nombre="Ricota", unidadMedida="kilogramos"))
    prov = crear_proveedor(session, ProveedorCreate(nombre="Lacteos SA"))
    hoy = date.today()
    with pytest.raises(exceptions.FechaVencimientoPosterior):
        recibir_lote_insumo(
            session,
            RecepcionInsumoRequest(
                tipo_insumo_id=tipo.id,
                proveedor_id=prov.id,
                nombre="Ricota Magra",
                lote="RIC-003",
                fechaRecepcion=hoy,
                fechaVencimiento=hoy + timedelta(days=3),
                cantRecibida=10.0,
            ),
        )


def test_listar_insumos_agrupados_por_tipo(session: Session) -> None:
    tipo = crear_tipo_insumo(session, TipoInsumoCreate(nombre="Avena Integral", unidadMedida="kilogramos"))
    prov = crear_proveedor(session, ProveedorCreate(nombre="Granos SA"))
    hoy = date.today()
    recibir_lote_insumo(
        session,
        RecepcionInsumoRequest(
            tipo_insumo_id=tipo.id,
            proveedor_id=prov.id,
            nombre="Avena Fina Lote A",
            lote="AVE-A",
            fechaRecepcion=hoy,
            fechaVencimiento=hoy + timedelta(days=20),
            cantRecibida=15.0,
        ),
    )
    agrupados = listar_insumos_agrupados_por_tipo(session)
    encontrado = next((g for g in agrupados if g.tipo_id == tipo.id), None)
    assert encontrado is not None
    assert encontrado.stock_total >= 15.0
    assert len(encontrado.lotes) >= 1


def test_listar_insumos_para_selector_orden_fefo(session: Session) -> None:
    tipo = crear_tipo_insumo(session, TipoInsumoCreate(nombre="Cacao Puro", unidadMedida="kilogramos"))
    prov = crear_proveedor(session, ProveedorCreate(nombre="Chocolates SA"))
    hoy = date.today()
    recibir_lote_insumo(
        session,
        RecepcionInsumoRequest(
            tipo_insumo_id=tipo.id,
            proveedor_id=prov.id,
            nombre="Cacao Tarde",
            lote="CAC-TARDE",
            fechaRecepcion=hoy,
            fechaVencimiento=hoy + timedelta(days=60),
            cantRecibida=10.0,
        ),
    )
    recibir_lote_insumo(
        session,
        RecepcionInsumoRequest(
            tipo_insumo_id=tipo.id,
            proveedor_id=prov.id,
            nombre="Cacao Temprano",
            lote="CAC-TEMPRANO",
            fechaRecepcion=hoy,
            fechaVencimiento=hoy + timedelta(days=15),
            cantRecibida=10.0,
        ),
    )
    items = listar_insumos_para_selector(session, tipo_id=tipo.id)
    assert len(items) == 2
    assert items[0].lote == "CAC-TEMPRANO"
    assert items[1].lote == "CAC-TARDE"

    lote_vencido = Insumo(
        nombre="Cacao Vencido",
        lote="CAC-VENC",
        fechaRecepcion=datetime.now() - timedelta(days=30),
        fechaVencimiento=datetime.now() - timedelta(days=1),
        cantRecibida=5.0,
        stock=5.0,
        unidad_medida_id=resolver_unidad_medida(session, valor_texto="kilogramos").id,
        tipo_insumo_id=tipo.id,
        activo=True,
    )
    session.add(lote_vencido)
    session.commit()
    items_actualizados = listar_insumos_para_selector(session, tipo_id=tipo.id)
    assert [i.lote for i in items_actualizados] == ["CAC-TEMPRANO", "CAC-TARDE"]


def test_desechar_insumo_vencido(session: Session) -> None:
    tipo = crear_tipo_insumo(session, TipoInsumoCreate(nombre="Queso Barra", unidadMedida="kilogramos"))
    insumo_vencido = Insumo(
        nombre="Queso Danbo",
        lote="Q-VENCIDO",
        fechaRecepcion=datetime.now() - timedelta(days=40),
        fechaVencimiento=datetime.now() - timedelta(days=2),
        cantRecibida=10.0,
        stock=8.0,
        unidad_medida_id=resolver_unidad_medida(session, valor_texto="kilogramos").id,
        tipo_insumo_id=tipo.id,
        activo=True,
    )
    session.add(insumo_vencido)
    session.commit()

    desechado = desechar_insumo(session, insumo_vencido.id)
    assert desechado.stock == 0.0


def test_desechar_insumo_no_vencido_falla(session: Session) -> None:
    tipo = crear_tipo_insumo(session, TipoInsumoCreate(nombre="Queso Fresco", unidadMedida="kilogramos"))
    insumo_vigente = Insumo(
        nombre="Queso Mozzarella",
        lote="Q-VIGENTE",
        fechaRecepcion=datetime.now() - timedelta(days=5),
        fechaVencimiento=datetime.now() + timedelta(days=20),
        cantRecibida=10.0,
        stock=8.0,
        unidad_medida_id=resolver_unidad_medida(session, valor_texto="kilogramos").id,
        tipo_insumo_id=tipo.id,
        activo=True,
    )
    session.add(insumo_vigente)
    session.commit()

    with pytest.raises(exceptions.InsumoNoVencido):
        desechar_insumo(session, insumo_vigente.id)

