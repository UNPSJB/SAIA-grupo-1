from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.main import app
from tests.database import session

client = TestClient(app)


def test_get_equipos_y_filtros(session: Session) -> None:
    res = client.get("/equipos/")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2

    # Filtrar por activo
    res_activos = client.get("/equipos/?estado=activo")
    assert res_activos.status_code == 200
    assert len(res_activos.json()) == 2

    # Filtrar por inactivo (ninguno todavia)
    res_inactivos = client.get("/equipos/?estado=inactivo")
    assert res_inactivos.status_code == 200
    assert len(res_inactivos.json()) == 0


def test_delete_y_reactivar_equipo_api(session: Session) -> None:
    # Obtener el primer equipo
    res = client.get("/equipos/")
    eq = res.json()[0]
    eq_id = eq["id"]
    assert eq["estado"].lower() == "activo"

    # DELETE /equipos/{id} (baja lógica)
    del_res = client.delete(f"/equipos/{eq_id}")
    assert del_res.status_code == 200

    # Verificar que ahora está inactivo
    get_res = client.get(f"/equipos/{eq_id}")
    assert get_res.status_code == 200
    assert get_res.json()["estado"].lower() == "inactivo"

    # PATCH /equipos/{id}/reactivar
    patch_res = client.patch(f"/equipos/{eq_id}/reactivar")
    assert patch_res.status_code == 200
    assert patch_res.json()["estado"].lower() == "activo"

    # Verificar nuevamente con GET
    get_res2 = client.get(f"/equipos/{eq_id}")
    assert get_res2.status_code == 200
    assert get_res2.json()["estado"].lower() == "activo"
