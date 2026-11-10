import pytest
from sqlalchemy.orm import Session
from tests.database import session
from src.tipoInsumo import exceptions, schemas, services


def test_crear_tipo_insumo_exitoso(session: Session):
    tipo = services.crear_tipo_insumo(
        session, schemas.TipoInsumoCreate(nombre="Harina", descripcion="Harina de trigo base")
    )
    assert tipo.id is not None
    assert tipo.nombre == "Harina"
    assert tipo.descripcion == "Harina de trigo base"
    assert tipo.activo is True


def test_crear_tipo_insumo_nombre_vacio_falla(session: Session):
    with pytest.raises(exceptions.NombreVacio):
        schemas.TipoInsumoCreate(nombre="   ")


def test_crear_tipo_insumo_nombre_corto_falla(session: Session):
    with pytest.raises(exceptions.NombreCorto):
        schemas.TipoInsumoCreate(nombre="A")


def test_crear_tipo_insumo_duplicado_falla(session: Session):
    services.crear_tipo_insumo(session, schemas.TipoInsumoCreate(nombre="Esencia de Vainilla"))
    with pytest.raises(exceptions.NombreDuplicado):
        services.crear_tipo_insumo(
            session, schemas.TipoInsumoCreate(nombre="  esencia   de vainilla  ")
        )


def test_listar_tipos_insumos_orden_y_filtros(session: Session):
    t1 = services.crear_tipo_insumo(session, schemas.TipoInsumoCreate(nombre="Polvo para Hornear"))
    t2 = services.crear_tipo_insumo(session, schemas.TipoInsumoCreate(nombre="Azúcar"))
    t3 = services.crear_tipo_insumo(session, schemas.TipoInsumoCreate(nombre="Sal"))
    services.eliminar_tipo_insumo(session, t3.id, baja_logica=True)

    todos = services.listar_tipos_insumos(session, solo_activos=False)
    nombres_todos = [t.nombre for t in todos]
    assert "Azúcar" in nombres_todos
    assert "Polvo para Hornear" in nombres_todos
    assert "Sal" in nombres_todos

    solo_activos = services.listar_tipos_insumos(session, solo_activos=True)
    nombres_activos = [t.nombre for t in solo_activos]
    assert "Azúcar" in nombres_activos
    assert "Sal" not in nombres_activos

    filtrados = services.listar_tipos_insumos(session, busqueda="hornear")
    assert len(filtrados) == 1
    assert filtrados[0].id == t1.id


def test_obtener_tipo_insumo_existente_e_inexistente(session: Session):
    creado = services.crear_tipo_insumo(session, schemas.TipoInsumoCreate(nombre="Manteca"))
    obtenido = services.obtener_tipo_insumo(session, creado.id)
    assert obtenido.id == creado.id
    assert obtenido.nombre == "Manteca"

    with pytest.raises(exceptions.TipoInsumoNoEncontrado):
        services.obtener_tipo_insumo(session, 99999)


def test_actualizar_tipo_insumo_exitoso(session: Session):
    creado = services.crear_tipo_insumo(
        session, schemas.TipoInsumoCreate(nombre="Cacao", descripcion="Desc original")
    )
    actualizado = services.actualizar_tipo_insumo(
        session,
        creado.id,
        schemas.TipoInsumoUpdate(nombre="Cacao Amargo", descripcion="Desc nueva", activo=False),
    )
    assert actualizado.nombre == "Cacao Amargo"
    assert actualizado.descripcion == "Desc nueva"
    assert actualizado.activo is False


def test_actualizar_tipo_insumo_mismo_nombre_no_falla(session: Session):
    creado = services.crear_tipo_insumo(session, schemas.TipoInsumoCreate(nombre="Levadura"))
    actualizado = services.actualizar_tipo_insumo(
        session, creado.id, schemas.TipoInsumoUpdate(nombre="Levadura", descripcion="Fresca")
    )
    assert actualizado.nombre == "Levadura"
    assert actualizado.descripcion == "Fresca"


def test_actualizar_tipo_insumo_nombre_duplicado_falla(session: Session):
    services.crear_tipo_insumo(session, schemas.TipoInsumoCreate(nombre="Leche Entera"))
    creado2 = services.crear_tipo_insumo(session, schemas.TipoInsumoCreate(nombre="Leche Descremada"))
    with pytest.raises(exceptions.NombreDuplicado):
        services.actualizar_tipo_insumo(
            session, creado2.id, schemas.TipoInsumoUpdate(nombre="leche  entera")
        )


def test_actualizar_tipo_insumo_campos_opcionales(session: Session):
    creado = services.crear_tipo_insumo(
        session, schemas.TipoInsumoCreate(nombre="Vainillín", descripcion="Saborizante")
    )
    actualizado = services.actualizar_tipo_insumo(
        session, creado.id, schemas.TipoInsumoUpdate(nombre=None, descripcion="   ")
    )
    assert actualizado.nombre == "Vainillín"
    assert actualizado.descripcion is None

    with pytest.raises(exceptions.NombreVacio):
        schemas.TipoInsumoUpdate(nombre="   ")

    with pytest.raises(exceptions.NombreCorto):
        schemas.TipoInsumoUpdate(nombre="V")


def test_eliminar_tipo_insumo_logico_y_fisico(session: Session):
    t_logico = services.crear_tipo_insumo(session, schemas.TipoInsumoCreate(nombre="Huevos"))
    res_logico = services.eliminar_tipo_insumo(session, t_logico.id, baja_logica=True)
    assert res_logico.activo is False

    t_fisico = services.crear_tipo_insumo(session, schemas.TipoInsumoCreate(nombre="Nuez Moscada"))
    services.eliminar_tipo_insumo(session, t_fisico.id, baja_logica=False)
    with pytest.raises(exceptions.TipoInsumoNoEncontrado):
        services.obtener_tipo_insumo(session, t_fisico.id)


def test_obtener_tipos_insumos_para_csv(session: Session):
    services.crear_tipo_insumo(
        session, schemas.TipoInsumoCreate(nombre="Canela en Polvo", descripcion="Especia aromática")
    )
    filas = services.obtener_tipos_insumos_para_csv(session, busqueda="Canela")
    assert len(filas) == 1
    assert filas[0]["nombre"] == "Canela en Polvo"
    assert filas[0]["descripcion"] == "Especia aromática"
    assert filas[0]["estado"] == "Activo"
