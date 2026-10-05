from datetime import datetime, timedelta
from typing import Dict
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.incidentes import services
from src.incidentes.constants import FOTO_MAX_BYTES
from src.incidentes.models import Incidente
from src.personal.models import Personal
from tests.autenticacion.conftest import autenticacion_real, headers, usuarios  # noqa: F401
from tests.database import app, session  # noqa: F401

client = TestClient(app)

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 32


@pytest.fixture(autouse=True)
def carpeta_de_fotos(tmp_path, monkeypatch):
    monkeypatch.setattr(services, "IMAGENES_DIR", tmp_path)
    return tmp_path


def _crear(persona: Personal, descripcion="Se rompió la heladera", foto=None):
    archivos = {"foto": foto} if foto else None
    return client.post("/incidentes/", data={"descripcion": descripcion}, files=archivos, headers=headers(persona))


# ---------- creación ----------

def test_operador_crea_incidente_sin_foto(usuarios: Dict[str, Personal]):
    r = _crear(usuarios["operador"])
    assert r.status_code == status.HTTP_201_CREATED
    cuerpo = r.json()
    assert cuerpo["descripcion"] == "Se rompió la heladera"
    assert cuerpo["estado"] == "pendiente"
    assert cuerpo["reportado_por_id"] == usuarios["operador"].legajo
    assert cuerpo["nombre_reportante"] == "Juan Perez"
    assert cuerpo["foto_url"] is None
    assert datetime.fromisoformat(cuerpo["creado_el"]) <= datetime.now()


@pytest.mark.parametrize("nombre,contenido,tipo", [("a.png", PNG, "image/png"), ("a.jpg", JPG, "image/jpeg")])
def test_crea_incidente_con_foto_y_se_puede_descargar(
    usuarios: Dict[str, Personal], carpeta_de_fotos, nombre, contenido, tipo
):
    r = _crear(usuarios["operador"], foto=(nombre, contenido, tipo))
    assert r.status_code == status.HTTP_201_CREATED
    assert len(list(carpeta_de_fotos.iterdir())) == 1
    url = r.json()["foto_url"]
    descarga = client.get(url, headers=headers(usuarios["operador"]))
    assert descarga.status_code == status.HTTP_200_OK
    assert descarga.content == contenido


def test_el_usuario_sale_del_token_y_no_del_cliente(usuarios: Dict[str, Personal]):
    r = client.post(
        "/incidentes/",
        data={"descripcion": "x", "reportado_por_id": "2", "estado": "resuelto"},
        headers=headers(usuarios["operador"]),
    )
    assert r.json()["reportado_por_id"] == usuarios["operador"].legajo
    assert r.json()["estado"] == "pendiente"


@pytest.mark.parametrize("descripcion", ["", "   ", "\n\t"])
def test_descripcion_vacia_no_se_registra(usuarios: Dict[str, Personal], session: Session, descripcion):
    r = _crear(usuarios["operador"], descripcion=descripcion)
    assert r.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert session.query(Incidente).count() == 0


def test_descripcion_demasiado_larga(usuarios: Dict[str, Personal]):
    assert _crear(usuarios["operador"], descripcion="a" * 500).status_code == status.HTTP_201_CREATED
    assert _crear(usuarios["operador"], descripcion="a" * 501).status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_formato_de_imagen_invalido_aunque_diga_ser_jpg(usuarios: Dict[str, Personal], carpeta_de_fotos):
    r = _crear(usuarios["operador"], foto=("virus.jpg", b"MZ\x90\x00 programa", "image/jpeg"))
    assert r.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert list(carpeta_de_fotos.iterdir()) == []


def test_formato_gif_no_permitido(usuarios: Dict[str, Personal]):
    r = _crear(usuarios["operador"], foto=("a.gif", b"GIF89a" + b"\x00" * 20, "image/gif"))
    assert r.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_imagen_demasiado_grande(usuarios: Dict[str, Personal], carpeta_de_fotos):
    grande = PNG + b"\x00" * FOTO_MAX_BYTES
    r = _crear(usuarios["operador"], foto=("a.png", grande, "image/png"))
    assert r.status_code == status.HTTP_413_CONTENT_TOO_LARGE
    assert list(carpeta_de_fotos.iterdir()) == []


def test_imagen_justo_en_el_limite(usuarios: Dict[str, Personal]):
    justo = PNG + b"\x00" * (FOTO_MAX_BYTES - len(PNG))
    assert _crear(usuarios["operador"], foto=("a.png", justo, "image/png")).status_code == status.HTTP_201_CREATED


def test_sin_token_da_401(session: Session, autenticacion_real: None):
    r = client.post("/incidentes/", data={"descripcion": "x"})
    assert r.status_code == status.HTTP_401_UNAUTHORIZED


def test_admin_que_solo_administra_no_puede_crear(usuarios: Dict[str, Personal]):
    assert _crear(usuarios["administrador"]).status_code == status.HTTP_403_FORBIDDEN


def test_usuario_con_ambas_capacidades_puede_crear(usuarios: Dict[str, Personal]):
    assert _crear(usuarios["ambos"]).status_code == status.HTTP_201_CREATED


# ---------- visibilidad ----------

def test_operador_solo_ve_sus_incidentes_y_admin_ve_todos(session: Session, usuarios: Dict[str, Personal]):
    otro_operador = session.get(Personal, 2)  # Ana
    propio = _crear(usuarios["operador"], "mío").json()
    ajeno = _crear(otro_operador, "de Ana").json()

    mis = client.get("/incidentes/", headers=headers(usuarios["operador"])).json()
    assert [i["id"] for i in mis] == [propio["id"]]

    todos = client.get("/incidentes/", headers=headers(usuarios["administrador"])).json()
    assert {i["id"] for i in todos} == {propio["id"], ajeno["id"]}

    # un operador no puede ampliar su vista con el filtro de reportante: se ignora y sigue viendo lo suyo
    r = client.get(
        f"/incidentes/?reportado_por_id={otro_operador.legajo}", headers=headers(usuarios["operador"])
    ).json()
    assert [i["id"] for i in r] == [propio["id"]]


def test_operador_no_puede_ver_detalle_ni_foto_de_un_incidente_ajeno(session: Session, usuarios: Dict[str, Personal]):
    ajeno = _crear(session.get(Personal, 2), foto=("a.png", PNG, "image/png")).json()
    h = headers(usuarios["operador"])
    assert client.get(f"/incidentes/{ajeno['id']}", headers=h).status_code == status.HTTP_404_NOT_FOUND
    assert client.get(f"/incidentes/{ajeno['id']}/foto", headers=h).status_code == status.HTTP_404_NOT_FOUND
    assert client.get(f"/incidentes/{ajeno['id']}", headers=headers(usuarios["administrador"])).status_code == 200


def test_foto_de_incidente_sin_foto_da_404(usuarios: Dict[str, Personal]):
    incidente = _crear(usuarios["operador"]).json()
    r = client.get(f"/incidentes/{incidente['id']}/foto", headers=headers(usuarios["operador"]))
    assert r.status_code == status.HTTP_404_NOT_FOUND


# ---------- filtros ----------

def test_filtros_de_estado_fecha_y_reportante(session: Session, usuarios: Dict[str, Personal]):
    admin = headers(usuarios["administrador"])
    ana = session.get(Personal, 2)
    a = _crear(usuarios["operador"], "a").json()
    b = _crear(ana, "b").json()
    c = _crear(usuarios["operador"], "c").json()

    # se retrocede la fecha de "a" a hace 10 días
    session.get(Incidente, a["id"]).creado_el = datetime.now() - timedelta(days=10)
    session.commit()
    client.patch(f"/incidentes/{c['id']}/estado", json={"estado": "resuelto"}, headers=admin)

    def ids(query):
        return {i["id"] for i in client.get(f"/incidentes/?{query}", headers=admin).json()}

    assert ids("estado=resuelto") == {c["id"]}
    assert ids("estado=pendiente") == {a["id"], b["id"]}
    assert ids(f"reportado_por_id={ana.legajo}") == {b["id"]}
    hoy = datetime.now().date()
    assert ids(f"desde={hoy}") == {b["id"], c["id"]}
    assert ids(f"hasta={hoy - timedelta(days=5)}") == {a["id"]}
    # "hasta" es inclusivo: incluye los incidentes creados hoy
    assert ids(f"desde={hoy}&hasta={hoy}") == {b["id"], c["id"]}
    assert ids(f"estado=pendiente&reportado_por_id={usuarios['operador'].legajo}") == {a["id"]}


def test_rango_de_fechas_invertido(usuarios: Dict[str, Personal]):
    r = client.get("/incidentes/?desde=2026-10-10&hasta=2026-10-01", headers=headers(usuarios["administrador"]))
    assert r.status_code == status.HTTP_400_BAD_REQUEST


def test_el_filtro_de_estado_tambien_aplica_al_operador(usuarios: Dict[str, Personal]):
    i = _crear(usuarios["operador"]).json()
    _crear(usuarios["operador"])
    client.patch(f"/incidentes/{i['id']}/estado", json={"estado": "en_revision"}, headers=headers(usuarios["administrador"]))
    r = client.get("/incidentes/?estado=en_revision", headers=headers(usuarios["operador"])).json()
    assert [x["id"] for x in r] == [i["id"]]


# ---------- acciones de administrador ----------

def test_operador_no_puede_editar_cambiar_estado_ni_eliminar(usuarios: Dict[str, Personal]):
    i = _crear(usuarios["operador"]).json()
    h = headers(usuarios["operador"])
    assert client.put(f"/incidentes/{i['id']}", json={"descripcion": "x"}, headers=h).status_code == 403
    assert client.patch(f"/incidentes/{i['id']}/estado", json={"estado": "resuelto"}, headers=h).status_code == 403
    assert client.delete(f"/incidentes/{i['id']}", headers=h).status_code == 403


def test_admin_cambia_entre_todos_los_estados(usuarios: Dict[str, Personal]):
    i = _crear(usuarios["operador"]).json()
    admin = headers(usuarios["administrador"])
    for estado in ["en_revision", "resuelto", "reabierto", "descartado", "pendiente"]:
        r = client.patch(f"/incidentes/{i['id']}/estado", json={"estado": estado}, headers=admin)
        assert r.status_code == 200 and r.json()["estado"] == estado


def test_estado_inexistente_da_422(usuarios: Dict[str, Personal]):
    i = _crear(usuarios["operador"]).json()
    r = client.patch(f"/incidentes/{i['id']}/estado", json={"estado": "volando"}, headers=headers(usuarios["administrador"]))
    assert r.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_admin_edita_descripcion_y_se_valida_vacia(usuarios: Dict[str, Personal]):
    i = _crear(usuarios["operador"]).json()
    admin = headers(usuarios["administrador"])
    r = client.put(f"/incidentes/{i['id']}", json={"descripcion": "  corregida  "}, headers=admin)
    assert r.status_code == 200 and r.json()["descripcion"] == "corregida"
    assert client.put(f"/incidentes/{i['id']}", json={"descripcion": "  "}, headers=admin).status_code == 422


def test_admin_elimina_y_se_borra_la_foto(usuarios: Dict[str, Personal], carpeta_de_fotos):
    i = _crear(usuarios["operador"], foto=("a.png", PNG, "image/png")).json()
    assert len(list(carpeta_de_fotos.iterdir())) == 1
    admin = headers(usuarios["administrador"])
    assert client.delete(f"/incidentes/{i['id']}", headers=admin).status_code == status.HTTP_204_NO_CONTENT
    assert list(carpeta_de_fotos.iterdir()) == []
    assert client.get(f"/incidentes/{i['id']}", headers=admin).status_code == status.HTTP_404_NOT_FOUND


def test_incidente_inexistente_da_404(usuarios: Dict[str, Personal]):
    admin = headers(usuarios["administrador"])
    assert client.get("/incidentes/999", headers=admin).status_code == 404
    assert client.patch("/incidentes/999/estado", json={"estado": "resuelto"}, headers=admin).status_code == 404
    assert client.delete("/incidentes/999", headers=admin).status_code == 404
