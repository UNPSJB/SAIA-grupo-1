from datetime import datetime, timedelta
import pytest
from sqlalchemy.orm import Session
from tests.database import session
from src.elementosDeLimpieza import exceptions, schemas, services

def test_crear_elemento_de_limpieza(session: Session):
    data = schemas.ElementoDeLimpiezaCreate(nombre="Esponja Fibra", frecuenciaDeCambio=15)
    elemento = services.crear_elementoDeLimpieza(session, data)
    assert elemento.id is not None
    assert elemento.nombre == "Esponja Fibra"
    assert elemento.frecuenciaDeCambio == 15
    assert elemento.activo is True
    assert elemento.fechaCambio is not None
    assert elemento.fechaCambio > datetime.now()

def test_listar_elementos_de_limpieza(session: Session):
    elementos_iniciales = services.listar_elementosDeLimpiezas(session)
    data = schemas.ElementoDeLimpiezaCreate(nombre="Panio Secador", frecuenciaDeCambio=7)
    services.crear_elementoDeLimpieza(session, data)
    elementos = services.listar_elementosDeLimpiezas(session)
    assert len(elementos) == len(elementos_iniciales) + 1

def test_obtener_elemento_de_limpieza(session: Session):
    data = schemas.ElementoDeLimpiezaCreate(nombre="Cepillo Mano", frecuenciaDeCambio=30)
    creado = services.crear_elementoDeLimpieza(session, data)
    obtenido = services.obtener_elementoDeLimpieza(session, creado.id)
    assert obtenido.id == creado.id
    assert obtenido.nombre == "Cepillo Mano"

    with pytest.raises(exceptions.ElementoNoEncontrado):
        services.obtener_elementoDeLimpieza(session, 99999)

def test_editar_elemento_de_limpieza(session: Session):
    data = schemas.ElementoDeLimpiezaCreate(nombre="Mopa Giratoria", frecuenciaDeCambio=20)
    creado = services.crear_elementoDeLimpieza(session, data)
    fecha_original = creado.fechaCambio

    update_data = schemas.ElementoDeLimpiezaUpdate(nombre="Mopa Actualizada", frecuenciaDeCambio=10)
    editado = services.editar_elementoDeLimpieza(session, creado.id, update_data)
    assert editado.nombre == "Mopa Actualizada"
    assert editado.frecuenciaDeCambio == 10
    assert editado.fechaCambio != fecha_original

def test_eliminar_elemento_de_limpieza(session: Session):
    data = schemas.ElementoDeLimpiezaCreate(nombre="Escobillon", frecuenciaDeCambio=60)
    creado = services.crear_elementoDeLimpieza(session, data)
    eliminado = services.eliminar_elementoDeLimpieza(session, creado.id)
    assert eliminado.activo is False

def test_registrar_cambio_fecha(session: Session):
    data = schemas.ElementoDeLimpiezaCreate(nombre="Guantes Latex", frecuenciaDeCambio=14)
    creado = services.crear_elementoDeLimpieza(session, data)
    cambiado = services.registrar_cambio_fecha(session, creado.id)
    assert cambiado.fechaCambio is not None
    assert cambiado.fechaCambio > datetime.now()
