from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.database import app, session
from src.auditoria.models import AccionAuditoria
from src.auditoria import schemas, services

client = TestClient(app)

def test_router_listar_y_leer_auditoria(session: Session):
    reg = services.registrar_auditoria(
        session,
        schemas.AuditoriaCreate(
            tabla="personal",
            registro_id=1,
            accion=AccionAuditoria.MODIFICAR,
            campo="nombre",
            valor_previo="Juan",
            valor_posterior="Juan Carlos",
        ),
    )

    res_list = client.get("/auditoria/")
    assert res_list.status_code == status.HTTP_200_OK
    data = res_list.json()
    assert any(a["id"] == reg.id for a in data)

    res_filtrar = client.get(f"/auditoria/?tabla=personal&registro_id=1")
    assert res_filtrar.status_code == status.HTTP_200_OK
    assert all(a["tabla"] == "personal" for a in res_filtrar.json())

    res_get = client.get(f"/auditoria/{reg.id}")
    assert res_get.status_code == status.HTTP_200_OK
    assert res_get.json()["id"] == reg.id
    assert res_get.json()["campo"] == "nombre"

    res_404 = client.get("/auditoria/99999")
    assert res_404.status_code == status.HTTP_404_NOT_FOUND

def test_leer_auditoria_inexistente_excepcion_custom(session: Session):
    import pytest
    from src.auditoria import exceptions
    with pytest.raises(exceptions.AuditoriaNoEncontrada):
        services.leer_auditoria(session, 99999)

def test_validaciones_schemas_auditoria():
    import pytest
    from src.auditoria import exceptions
    with pytest.raises(exceptions.AccionAuditoriaInvalida):
        schemas.AuditoriaBase.is_valid_accion_auditoria("ACCION_FALSA")

    with pytest.raises(exceptions.TablaAuditoriaVacia):
        schemas.AuditoriaCreate.validar_tabla_no_vacia("   ")
