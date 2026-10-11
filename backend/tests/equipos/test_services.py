import pytest
from sqlalchemy.orm import Session
from fastapi import HTTPException
from tests.database import session
from src.equipos.models import Estado, Categoria
from src.equipos.schemas import EquipoCreate, EquipoUpdate
from src.equipos.services import (
    listar_equipos,
    obtener_equipo,
    crear_equipo,
    editar_equipo,
    eliminar_equipo,
    reactivar_equipo,
)


def test_listar_equipos_filtro_estado(session: Session) -> None:
    # Seeded has 2 active equipments
    equipos = listar_equipos(session)
    assert len(equipos) == 2

    # Eliminar uno (baja lógica)
    eq_eliminado = eliminar_equipo(session, equipos[0].id)
    assert eq_eliminado.estado == Estado.INACTIVO

    # listar_equipos sin filtro devuelve ambos (activos e inactivos)
    todos = listar_equipos(session)
    assert len(todos) == 2

    # listar con filtro Estado.ACTIVO
    activos = listar_equipos(session, estado=Estado.ACTIVO)
    assert len(activos) == 1
    assert activos[0].id == equipos[1].id

    # listar con filtro Estado.INACTIVO
    inactivos = listar_equipos(session, estado=Estado.INACTIVO)
    assert len(inactivos) == 1
    assert inactivos[0].id == equipos[0].id


def test_baja_y_reactivacion_equipo(session: Session) -> None:
    equipos = listar_equipos(session)
    target_id = equipos[0].id
    assert equipos[0].estado == Estado.ACTIVO

    # Baja lógica
    eq_baja = eliminar_equipo(session, target_id)
    assert eq_baja.estado == Estado.INACTIVO

    # Reactivación
    eq_reactivado = reactivar_equipo(session, target_id)
    assert eq_reactivado.estado == Estado.ACTIVO


def test_eliminar_equipo_inexistente(session: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        eliminar_equipo(session, 9999)
    assert exc_info.value.status_code == 404


def test_reactivar_equipo_inexistente(session: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        reactivar_equipo(session, 9999)
    assert exc_info.value.status_code == 404


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

