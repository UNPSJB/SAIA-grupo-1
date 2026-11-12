import pytest
from sqlalchemy.orm import Session
from tests.database import session
from src.insumos_quimicos.constants import TipoQuimicoEnum
from src.insumos_quimicos.schemas import InsumoQuimicoCreate
from src.insumos_quimicos.services import InsumoQuimicoService
from src.producto.schemas import ProductoCreate
from src.producto.services import crear_producto
from src.tipoInsumo.schemas import TipoInsumoCreate
from src.tipoInsumo.services import crear_tipo_insumo
from src.unidadesMedida import exceptions, schemas, services


def test_asegurar_unidades_base(session: Session) -> None:
    services.asegurar_unidades_base(session)
    unidades = services.listar_unidades_medida(session)
    abreviaturas = {u.abreviatura for u in unidades}
    assert {"KG", "G", "L", "ML", "UN"}.issubset(abreviaturas)


def test_crear_y_listar_unidad_medida(session: Session) -> None:
    creada = services.crear_unidad_medida(
        session,
        schemas.UnidadMedidaCreate(nombre="  Toneladas   Métricas ", abreviatura=" tm "),
    )
    assert creada.id is not None
    assert creada.nombre == "Toneladas Métricas"
    assert creada.abreviatura == "TM"
    assert creada.activo is True

    buscadas = services.listar_unidades_medida(session, busqueda="tm")
    assert any(u.id == creada.id for u in buscadas)


def test_validaciones_unidad_medida(session: Session) -> None:
    with pytest.raises(exceptions.NombreVacio):
        schemas.UnidadMedidaCreate(nombre="   ", abreviatura="X")

    with pytest.raises(exceptions.NombreCorto):
        schemas.UnidadMedidaCreate(nombre="A", abreviatura="A")

    with pytest.raises(exceptions.AbreviaturaVacia):
        schemas.UnidadMedidaCreate(nombre="Caja", abreviatura="   ")

    services.crear_unidad_medida(
        session, schemas.UnidadMedidaCreate(nombre="Docena", abreviatura="DOC")
    )
    with pytest.raises(exceptions.NombreDuplicado):
        services.crear_unidad_medida(
            session, schemas.UnidadMedidaCreate(nombre=" docena ", abreviatura="DC2")
        )
    with pytest.raises(exceptions.AbreviaturaDuplicada):
        services.crear_unidad_medida(
            session, schemas.UnidadMedidaCreate(nombre="Otra Docena", abreviatura="doc")
        )


def test_actualizar_eliminar_y_restaurar_unidad_medida(session: Session) -> None:
    creada = services.crear_unidad_medida(
        session, schemas.UnidadMedidaCreate(nombre="Onzas", abreviatura="OZ")
    )
    actualizada = services.actualizar_unidad_medida(
        session,
        creada.id,
        schemas.UnidadMedidaUpdate(nombre="Onza Fluida", abreviatura="FLOZ"),
    )
    assert actualizada.nombre == "Onza Fluida"
    assert actualizada.abreviatura == "FLOZ"

    baja = services.eliminar_unidad_medida(session, creada.id, baja_logica=True)
    assert baja.activo is False

    activos = services.listar_unidades_medida(session, solo_activos=True)
    assert all(u.id != creada.id for u in activos)

    with pytest.raises(exceptions.UnidadMedidaInactiva):
        services.resolver_unidad_medida(session, unidad_medida_id=creada.id)

    restaurada = services.restaurar_unidad_medida(session, creada.id)
    assert restaurada.activo is True


def test_eliminar_unidad_en_uso_bloqueado(session: Session) -> None:
    u_caja = services.crear_unidad_medida(
        session, schemas.UnidadMedidaCreate(nombre="Cajas", abreviatura="CJ")
    )
    crear_tipo_insumo(
        session,
        TipoInsumoCreate(nombre="Chocolate En Cajas", unidad_medida_id=u_caja.id),
    )
    with pytest.raises(exceptions.UnidadMedidaEnUso):
        services.eliminar_unidad_medida(session, u_caja.id, baja_logica=True)

    u_pack = services.crear_unidad_medida(
        session, schemas.UnidadMedidaCreate(nombre="Packs", abreviatura="PK")
    )
    crear_producto(
        session,
        ProductoCreate(nombre="Medialunas Pack", unidad_medida_id=u_pack.id),
    )
    with pytest.raises(exceptions.UnidadMedidaEnUso):
        services.eliminar_unidad_medida(session, u_pack.id, baja_logica=True)

    u_bidon = services.crear_unidad_medida(
        session, schemas.UnidadMedidaCreate(nombre="Bidones", abreviatura="BD")
    )
    InsumoQuimicoService.create(
        session,
        InsumoQuimicoCreate(
            nombre="Desinfectante Bidon",
            tipo=TipoQuimicoEnum.DESINFECTANTE,
            unidad_medida_id=u_bidon.id,
            stock_actual=15.0,
        ),
    )
    with pytest.raises(exceptions.UnidadMedidaEnUso):
        services.eliminar_unidad_medida(session, u_bidon.id, baja_logica=True)


def test_resolver_unidad_medida_por_id_o_texto(session: Session) -> None:
    por_nombre = services.resolver_unidad_medida(session, valor_texto="kilogramos")
    por_abrev = services.resolver_unidad_medida(session, valor_texto="kg")
    por_id = services.resolver_unidad_medida(session, unidad_medida_id=por_nombre.id)
    assert por_nombre.id == por_abrev.id == por_id.id

    with pytest.raises(exceptions.UnidadMedidaNoEncontrada):
        services.resolver_unidad_medida(session, valor_texto="INEXISTENTE")
