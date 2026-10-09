from datetime import datetime, timedelta
from typing import Dict
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.incidentes.models import Incidente
from src.personal.models import Personal
from tests.autenticacion.conftest import autenticacion_real, headers, usuarios  # noqa: F401
from tests.database import app, session  # noqa: F401

client = TestClient(app)


def _crear_incidente(persona: Personal, descripcion="Incidente abierto de prueba"):
    return client.post("/incidentes/", data={"descripcion": descripcion}, headers=headers(persona))


def test_admin_obtiene_incidentes_abiertos_y_excluye_cerrados(session: Session, usuarios: Dict[str, Personal]):
    operador = usuarios["operador"]
    admin = usuarios["administrador"]

    r1 = _crear_incidente(operador, "Incidente abierto activo")
    assert r1.status_code == status.HTTP_201_CREATED
    id1 = r1.json()["id"]

    r2 = _crear_incidente(operador, "Incidente que sera resuelto")
    assert r2.status_code == status.HTTP_201_CREATED
    id2 = r2.json()["id"]
    r2_cerrar = client.post(
        f"/incidentes/{id2}/cerrar",
        json={"accion_correctiva": "Reparación completa efectuada"},
        headers=headers(admin),
    )
    assert r2_cerrar.status_code == status.HTTP_200_OK

    r3 = _crear_incidente(operador, "Incidente que sera descartado")
    assert r3.status_code == status.HTTP_201_CREATED
    id3 = r3.json()["id"]
    r3_desc = client.patch(
        f"/incidentes/{id3}/estado",
        json={"estado": "descartado"},
        headers=headers(admin),
    )
    assert r3_desc.status_code == status.HTTP_200_OK

    r_abiertos = client.get("/incidentes/abiertos", headers=headers(admin))
    assert r_abiertos.status_code == status.HTTP_200_OK
    abiertos = r_abiertos.json()
    ids_abiertos = [i["id"] for i in abiertos]

    assert id1 in ids_abiertos
    assert id2 not in ids_abiertos
    assert id3 not in ids_abiertos

    item1 = next(i for i in abiertos if i["id"] == id1)
    assert "horas_abierto" in item1
    assert "dias_abierto" in item1
    assert item1["nivel_urgencia"] in ["RECIENTE", "ATENCION", "CRITICO"]


def test_ordenamiento_estricto_antiguedad_ascendente(session: Session, usuarios: Dict[str, Personal]):
    operador = usuarios["operador"]
    admin = usuarios["administrador"]

    r1 = _crear_incidente(operador, "Incidente primero en tiempo")
    id1 = r1.json()["id"]

    r2 = _crear_incidente(operador, "Incidente segundo en tiempo")
    id2 = r2.json()["id"]

    inc1 = session.get(Incidente, id1)
    inc1.creado_el = datetime.now() - timedelta(days=4)
    session.commit()

    r_abiertos = client.get("/incidentes/abiertos", headers=headers(admin))
    assert r_abiertos.status_code == status.HTTP_200_OK
    abiertos = r_abiertos.json()

    pos1 = next(idx for idx, i in enumerate(abiertos) if i["id"] == id1)
    pos2 = next(idx for idx, i in enumerate(abiertos) if i["id"] == id2)

    assert pos1 < pos2

    item1 = abiertos[pos1]
    assert item1["dias_abierto"] >= 4
    assert item1["nivel_urgencia"] == "CRITICO"


def test_operador_no_puede_acceder_a_endpoints_abiertos(usuarios: Dict[str, Personal]):
    operador = headers(usuarios["operador"])

    r_list = client.get("/incidentes/abiertos", headers=operador)
    assert r_list.status_code == status.HTTP_403_FORBIDDEN

    r_met = client.get("/incidentes/abiertos/metricas", headers=operador)
    assert r_met.status_code == status.HTTP_403_FORBIDDEN


def test_metricas_incidentes_abiertos(session: Session, usuarios: Dict[str, Personal]):
    operador = usuarios["operador"]
    admin = usuarios["administrador"]

    r1 = _crear_incidente(operador, "Incidente critico")
    id1 = r1.json()["id"]
    inc1 = session.get(Incidente, id1)
    inc1.creado_el = datetime.now() - timedelta(days=5)
    session.commit()

    r2 = _crear_incidente(operador, "Incidente fresco")
    assert r2.status_code == status.HTTP_201_CREATED

    r_met = client.get("/incidentes/abiertos/metricas", headers=headers(admin))
    assert r_met.status_code == status.HTTP_200_OK
    metricas = r_met.json()

    assert metricas["total_abiertos"] >= 2
    assert metricas["por_antiguedad"]["mas_72h"] >= 1
    assert metricas["por_antiguedad"]["menos_24h"] >= 1
    assert metricas["mas_antiguo_horas"] is not None
    assert metricas["mas_antiguo_horas"] >= 100.0


def test_resolver_incidente_lo_remueve_de_abiertos(usuarios: Dict[str, Personal]):
    operador = usuarios["operador"]
    admin = usuarios["administrador"]

    r = _crear_incidente(operador, "Incidente a ser removido al resolver")
    inc_id = r.json()["id"]

    r_antes = client.get("/incidentes/abiertos", headers=headers(admin))
    assert inc_id in [i["id"] for i in r_antes.json()]

    r_cerrar = client.post(
        f"/incidentes/{inc_id}/cerrar",
        json={"accion_correctiva": "Solución de emergencia aplicada y verificada"},
        headers=headers(admin),
    )
    assert r_cerrar.status_code == status.HTTP_200_OK

    r_despues = client.get("/incidentes/abiertos", headers=headers(admin))
    assert inc_id not in [i["id"] for i in r_despues.json()]


def test_reabrir_incidente_cerrado_lo_reincorpora_a_abiertos(usuarios: Dict[str, Personal]):
    operador = usuarios["operador"]
    admin = usuarios["administrador"]

    r = _crear_incidente(operador, "Incidente cerrado que sera reabierto")
    inc_id = r.json()["id"]

    client.post(
        f"/incidentes/{inc_id}/cerrar",
        json={"accion_correctiva": "Reparación inicial completada"},
        headers=headers(admin),
    )

    r_cerrado = client.get("/incidentes/abiertos", headers=headers(admin))
    assert inc_id not in [i["id"] for i in r_cerrado.json()]

    r_reabrir = client.post(
        f"/incidentes/{inc_id}/reabrir",
        json={"motivo": "El problema reapareció durante el turno siguiente"},
        headers=headers(admin),
    )
    assert r_reabrir.status_code == status.HTTP_200_OK
    assert r_reabrir.json()["estado"] == "reabierto"

    r_reincorporado = client.get("/incidentes/abiertos", headers=headers(admin))
    assert r_reincorporado.status_code == status.HTTP_200_OK
    ids_abiertos = [i["id"] for i in r_reincorporado.json()]
    assert inc_id in ids_abiertos

    inc_item = next(i for i in r_reincorporado.json() if i["id"] == inc_id)
    assert inc_item["estado"] == "reabierto"
