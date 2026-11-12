import pytest
from sqlalchemy.orm import Session
from tests.database import session
from src.proveedores import exceptions, schemas, services
from src.insumos.models import Insumo
from src.unidadesMedida.services import resolver_unidad_medida
from datetime import datetime


def test_crear_proveedor_exitoso(session: Session):
    prov = services.crear_proveedor(
        session,
        schemas.ProveedorCreate(
            nombre="Molinos del Plata",
            cuit="30-11223344-5",
            contacto="Juan Gomez",
            telefono="011-4455-6677",
            email="juan@molinos.com",
            direccion="Av. Siempre Viva 123",
        ),
    )
    assert prov.id is not None
    assert prov.nombre == "Molinos del Plata"
    assert prov.cuit == "30-11223344-5"
    assert prov.activo is True


def test_crear_proveedor_nombre_vacio(session: Session):
    with pytest.raises(exceptions.NombreVacio):
        schemas.ProveedorCreate(nombre="   ")


def test_crear_proveedor_nombre_corto(session: Session):
    with pytest.raises(exceptions.NombreCorto):
        schemas.ProveedorCreate(nombre="A")


def test_crear_proveedor_duplicado(session: Session):
    services.crear_proveedor(
        session, schemas.ProveedorCreate(nombre="Lácteos del Valle")
    )
    with pytest.raises(exceptions.NombreDuplicado):
        services.crear_proveedor(
            session, schemas.ProveedorCreate(nombre="  lácteos del valle  ")
        )


def test_listar_proveedores_orden_y_busqueda(session: Session):
    p1 = services.crear_proveedor(session, schemas.ProveedorCreate(nombre="Distribuidora Beta"))
    p2 = services.crear_proveedor(session, schemas.ProveedorCreate(nombre="Distribuidora Alfa"))
    p3 = services.crear_proveedor(session, schemas.ProveedorCreate(nombre="Química Delta"))
    services.eliminar_proveedor(session, p3.id, baja_logica=True)

    todos = services.listar_proveedores(session, solo_activos=False)
    nombres = [p.nombre for p in todos]
    assert "Distribuidora Alfa" in nombres
    assert "Distribuidora Beta" in nombres
    assert "Química Delta" in nombres

    solo_activos = services.listar_proveedores(session, solo_activos=True)
    nombres_activos = [p.nombre for p in solo_activos]
    assert "Química Delta" not in nombres_activos

    buscados = services.listar_proveedores(session, busqueda="beta")
    assert len(buscados) == 1
    assert buscados[0].id == p1.id


def test_obtener_proveedor(session: Session):
    creado = services.crear_proveedor(session, schemas.ProveedorCreate(nombre="Harinas SA"))
    obtenido = services.obtener_proveedor(session, creado.id)
    assert obtenido.id == creado.id

    with pytest.raises(exceptions.ProveedorNoEncontrado):
        services.obtener_proveedor(session, 88888)


def test_actualizar_proveedor(session: Session):
    creado = services.crear_proveedor(session, schemas.ProveedorCreate(nombre="Avícola Sur"))
    actualizado = services.actualizar_proveedor(
        session,
        creado.id,
        schemas.ProveedorUpdate(nombre="Avícola Norte", telefono="111-222"),
    )
    assert actualizado.nombre == "Avícola Norte"
    assert actualizado.telefono == "111-222"


def test_eliminar_proveedor_con_insumos_asociados_falla(session: Session):
    prov = services.crear_proveedor(session, schemas.ProveedorCreate(nombre="Granja Central"))
    insumo = Insumo(
        nombre="Huevo Blanco",
        lote="H-01",
        fechaRecepcion=datetime.now(),
        fechaVencimiento=datetime.now(),
        cantRecibida=100.0,
        stock=100.0,
        unidad_medida_id=resolver_unidad_medida(session, valor_texto="unidades").id,
        proveedor_id=prov.id,
        activo=True,
    )
    session.add(insumo)
    session.commit()

    with pytest.raises(exceptions.ProveedorEnUso):
        services.eliminar_proveedor(session, prov.id, baja_logica=False)
