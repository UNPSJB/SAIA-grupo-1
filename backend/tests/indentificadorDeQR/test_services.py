import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session
from src.indentificadorDeQR import exceptions, services
from src.indentificadorDeQR.schemas import IdentifacadorQRUpdate, IdentificadorQRCreate
from src.insumos.models import UnidadMedida
from src.producto.schemas import ProductoCreate
from src.producto.services import actualizar_visibilidad_publica, crear_producto
from tests.database import session


def _qr(session: Session):
    return services.crear_IdentificadorUnico(session, IdentificadorQRCreate(), urldelQR="http://localhost/vista-publica")


def test_el_listado_de_productos_arranca_desactivado(session: Session) -> None:
    assert _qr(session).verProductos is False


def test_actualizar_ver_productos(session: Session) -> None:
    qr = _qr(session)
    assert services.actualizar_ver_productos(session, qr.id_alfanumerico, IdentifacadorQRUpdate(verProductos=True)).verProductos is True
    # si no viene el valor no se toca
    assert services.actualizar_ver_productos(session, qr.id_alfanumerico, IdentifacadorQRUpdate()).verProductos is True
    assert services.actualizar_ver_productos(session, qr.id_alfanumerico, IdentifacadorQRUpdate(verProductos=False)).verProductos is False


def test_actualizar_ver_productos_qr_inexistente(session: Session) -> None:
    with pytest.raises(HTTPException) as error:
        services.actualizar_ver_productos(session, "no-existe", IdentifacadorQRUpdate(verProductos=True))
    assert error.value.status_code == 404


def test_productos_publicos_respeta_el_interruptor_general(session: Session) -> None:
    qr = _qr(session)
    pan = crear_producto(session, ProductoCreate(nombre="Pan de Campo", unidadMedida=UnidadMedida.UNIDADES))
    actualizar_visibilidad_publica(session, [pan.id])

    assert services.listar_productos_publicos(session, qr.id_alfanumerico) == []

    services.actualizar_ver_productos(session, qr.id_alfanumerico, IdentifacadorQRUpdate(verProductos=True))
    assert [p.id for p in services.listar_productos_publicos(session, qr.id_alfanumerico)] == [pan.id]


def test_productos_publicos_con_qr_deshabilitado(session: Session) -> None:
    qr = _qr(session)
    services.actualizar_ver_productos(session, qr.id_alfanumerico, IdentifacadorQRUpdate(verProductos=True))
    services.editar_identificadorQr(session, qr.id_alfanumerico)  # desactiva la vista publica

    with pytest.raises(exceptions.CodigoQRInHabilitado):
        services.listar_productos_publicos(session, qr.id_alfanumerico)
