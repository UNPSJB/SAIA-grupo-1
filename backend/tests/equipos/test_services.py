import pytest
from sqlalchemy.orm import Session
from tests.database import session
from src.equipos.models import Estado, Categoria
from src.equipos.schemas import EquipoBase, EquipoCreate, EquipoUpdate
from src.equipos import exceptions
from src.sectores.exceptions import SectorNoEncontrado
from src.equipos.services import (
    listar_equipos,
    obtener_equipo,
    crear_equipo,
    editar_equipo,
    eliminar_equipo,
    reactivar_equipo,
)

def test_listar_equipos_filtro_estado(session: Session) -> None:
    equipos = listar_equipos(session)
    assert len(equipos) == 2

    eq_eliminado = eliminar_equipo(session, equipos[0].id)
    assert eq_eliminado.estado == Estado.INACTIVO

    todos = listar_equipos(session)
    assert len(todos) == 2

    activos = listar_equipos(session, estado=Estado.ACTIVO)
    assert len(activos) == 1
    assert activos[0].id == equipos[1].id

    inactivos = listar_equipos(session, estado=Estado.INACTIVO)
    assert len(inactivos) == 1
    assert inactivos[0].id == equipos[0].id

def test_baja_y_reactivacion_equipo(session: Session) -> None:
    equipos = listar_equipos(session)
    target_id = equipos[0].id
    assert equipos[0].estado == Estado.ACTIVO

    eq_baja = eliminar_equipo(session, target_id)
    assert eq_baja.estado == Estado.INACTIVO

    eq_reactivado = reactivar_equipo(session, target_id)
    assert eq_reactivado.estado == Estado.ACTIVO

def test_obtener_equipo_inexistente(session: Session) -> None:
    with pytest.raises(exceptions.EquipoNoEncontrado):
        obtener_equipo(session, 9999)

def test_eliminar_equipo_inexistente(session: Session) -> None:
    with pytest.raises(exceptions.EquipoNoEncontrado):
        eliminar_equipo(session, 9999)

def test_reactivar_equipo_inexistente(session: Session) -> None:
    with pytest.raises(exceptions.EquipoNoEncontrado):
        reactivar_equipo(session, 9999)

def test_crear_equipo_con_sector(session: Session) -> None:
    nuevo = crear_equipo(
        session,
        EquipoCreate(
            nombre="Amasadora Nueva",
            categoria=Categoria.MANTENIMIENTO,
            sector_id=1,
            estado=Estado.ACTIVO,
            plan_de_calibracion="Anual",
        ),
    )
    assert nuevo.id is not None
    assert nuevo.sector_id == 1
    assert nuevo.ubicacion.nombre == "Cocina"
    assert nuevo.sector.nombre == "Cocina"

def test_crear_equipo_con_ubicacion_texto_crea_sector(session: Session) -> None:
    nuevo = crear_equipo(
        session,
        EquipoCreate(
            nombre="Horno Convector",
            categoria=Categoria.CONSERVAMIENTO,
            ubicacion="Deposito Secundario",
        ),
    )
    assert nuevo.id is not None
    assert nuevo.ubicacion.nombre == "Deposito Secundario"

def test_crear_equipo_sin_sector_ni_ubicacion_falla(session: Session) -> None:
    with pytest.raises(exceptions.CadenaMayorOigualACUATRO):
        crear_equipo(
            session,
            EquipoCreate(
                nombre="Batidora Industrial",
                categoria=Categoria.MANTENIMIENTO,
            ),
        )

def test_crear_equipo_sector_inexistente_falla(session: Session) -> None:
    with pytest.raises(SectorNoEncontrado):
        crear_equipo(
            session,
            EquipoCreate(
                nombre="Batidora Industrial",
                categoria=Categoria.MANTENIMIENTO,
                sector_id=9999,
            ),
        )

def test_editar_equipo_cambio_ubicacion_y_sector(session: Session) -> None:
    equipos = listar_equipos(session)
    eq_id = equipos[0].id
    editado = editar_equipo(
        session,
        eq_id,
        EquipoUpdate(nombre="Balanza Editada", ubicacion="Laboratorio Control"),
    )
    assert editado.nombre == "Balanza Editada"
    assert editado.ubicacion.nombre == "Laboratorio Control"

    with pytest.raises(SectorNoEncontrado):
        editar_equipo(session, eq_id, EquipoUpdate(sector_id=9999))

def test_validaciones_schemas_equipos() -> None:
    with pytest.raises(exceptions.CATEGORIAInvalida):
        EquipoBase.is_valid_categoria("INVALIDA")

    with pytest.raises(exceptions.NombreConNumeros):
        EquipoCreate.validar_nombre("Equipo $#@!")

    with pytest.raises(exceptions.CadenaMayorOigualACUATRO):
        EquipoCreate.validar_largoDNombre("Abc")

    with pytest.raises(exceptions.CATEGORIAInvalida):
        EquipoUpdate.is_valid_categoria("INVALIDA")

    with pytest.raises(exceptions.NombreConNumeros):
        EquipoUpdate.validar_nombre("Equipo %%%")

    with pytest.raises(exceptions.CadenaMayorOigualACUATRO):
        EquipoUpdate.validar_largoDNombre("X")
