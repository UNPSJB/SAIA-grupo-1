from typing import Dict
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session
from src.auditoria.models import AccionAuditoria, Auditoria
from src.incidentes.models import Incidente
from src.personal.models import Personal
from tests.autenticacion.conftest import autenticacion_real, headers, usuarios  # noqa: F401
from tests.database import app, session  # noqa: F401

client = TestClient(app)


def _crear_incidente(persona: Personal, descripcion="Falla detectada en envasadora"):
    return client.post("/incidentes/", data={"descripcion": descripcion}, headers=headers(persona))


def test_admin_cierra_incidente_con_accion_correctiva(session: Session, usuarios: Dict[str, Personal]):
    operador = usuarios["operador"]
    admin = usuarios["administrador"]

    r_crear = _crear_incidente(operador)
    assert r_crear.status_code == status.HTTP_201_CREATED
    inc_id = r_crear.json()["id"]

    accion = "Se sustituyó la válvula reguladora por una nueva y se calibró la presión de línea."
    r_cerrar = client.post(
        f"/incidentes/{inc_id}/cerrar",
        json={"accion_correctiva": accion},
        headers=headers(admin),
    )
    assert r_cerrar.status_code == status.HTTP_200_OK
    datos = r_cerrar.json()
    assert datos["estado"] == "cerrado"
    assert datos["accion_correctiva"] == accion
    assert datos["cerrado_el"] is not None
    assert datos["resuelto_por_id"] == admin.legajo
    assert datos["nombre_resolutor"] == f"{admin.nombre} {admin.apellido}"

    # Verificación del log de auditoría
    auditorias = list(
        session.scalars(
            select(Auditoria).where(Auditoria.tabla == "incidentes", Auditoria.registro_id == inc_id)
        ).all()
    )
    assert len(auditorias) >= 1
    aud_cierre = [a for a in auditorias if a.campo == "estado" and a.valor_posterior == "cerrado"]
    assert len(aud_cierre) == 1
    assert aud_cierre[0].accion == AccionAuditoria.MODIFICAR
    assert aud_cierre[0].valor_previo == "pendiente"


def test_cierre_sin_accion_correctiva_falla(usuarios: Dict[str, Personal]):
    r_crear = _crear_incidente(usuarios["operador"])
    inc_id = r_crear.json()["id"]
    admin = headers(usuarios["administrador"])

    # Vacía
    r = client.post(f"/incidentes/{inc_id}/cerrar", json={"accion_correctiva": "   "}, headers=admin)
    assert r.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    # Sin el campo
    r2 = client.post(f"/incidentes/{inc_id}/cerrar", json={}, headers=admin)
    assert r2.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_cierre_con_accion_demasiado_larga_falla(usuarios: Dict[str, Personal]):
    r_crear = _crear_incidente(usuarios["operador"])
    inc_id = r_crear.json()["id"]
    admin = headers(usuarios["administrador"])

    r = client.post(
        f"/incidentes/{inc_id}/cerrar",
        json={"accion_correctiva": "x" * 1001},
        headers=admin,
    )
    assert r.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_operador_no_puede_cerrar_incidente(usuarios: Dict[str, Personal]):
    r_crear = _crear_incidente(usuarios["operador"])
    inc_id = r_crear.json()["id"]

    r = client.post(
        f"/incidentes/{inc_id}/cerrar",
        json={"accion_correctiva": "Intento de operador"},
        headers=headers(usuarios["operador"]),
    )
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_no_se_puede_cerrar_incidente_ya_cerrado(usuarios: Dict[str, Personal]):
    r_crear = _crear_incidente(usuarios["operador"])
    inc_id = r_crear.json()["id"]
    admin = headers(usuarios["administrador"])

    r1 = client.post(f"/incidentes/{inc_id}/cerrar", json={"accion_correctiva": "Primera solución"}, headers=admin)
    assert r1.status_code == status.HTTP_200_OK

    r2 = client.post(f"/incidentes/{inc_id}/cerrar", json={"accion_correctiva": "Segunda solución"}, headers=admin)
    assert r2.status_code == status.HTTP_400_BAD_REQUEST


def test_admin_reabre_incidente_cerrado_con_motivo(session: Session, usuarios: Dict[str, Personal]):
    r_crear = _crear_incidente(usuarios["operador"])
    inc_id = r_crear.json()["id"]
    admin = headers(usuarios["administrador"])

    # Cierra
    client.post(f"/incidentes/{inc_id}/cerrar", json={"accion_correctiva": "Reparado"}, headers=admin)

    # Reabre con motivo
    motivo = "Se detectó reinicio de pérdidas durante la producción del lote 104."
    r_reabrir = client.post(
        f"/incidentes/{inc_id}/reabrir",
        json={"motivo": motivo},
        headers=admin,
    )
    assert r_reabrir.status_code == status.HTTP_200_OK
    datos = r_reabrir.json()
    assert datos["estado"] == "reabierto"
    assert datos["motivo_reapertura"] == motivo

    # Verificación en auditoría
    auditorias = list(
        session.scalars(
            select(Auditoria).where(Auditoria.tabla == "incidentes", Auditoria.registro_id == inc_id)
        ).all()
    )
    aud_reabrir = [a for a in auditorias if a.campo == "estado" and a.valor_posterior == "reabierto"]
    assert len(aud_reabrir) == 1
    assert aud_reabrir[0].valor_previo == "cerrado"


def test_reabrir_sin_motivo_falla(usuarios: Dict[str, Personal]):
    r_crear = _crear_incidente(usuarios["operador"])
    inc_id = r_crear.json()["id"]
    admin = headers(usuarios["administrador"])

    client.post(f"/incidentes/{inc_id}/cerrar", json={"accion_correctiva": "Reparado"}, headers=admin)

    r = client.post(f"/incidentes/{inc_id}/reabrir", json={"motivo": "   "}, headers=admin)
    assert r.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_reabrir_incidente_abierto_falla(usuarios: Dict[str, Personal]):
    r_crear = _crear_incidente(usuarios["operador"])
    inc_id = r_crear.json()["id"]
    admin = headers(usuarios["administrador"])

    # Está pendiente, no cerrado
    r = client.post(f"/incidentes/{inc_id}/reabrir", json={"motivo": "Motivo"}, headers=admin)
    assert r.status_code == status.HTTP_400_BAD_REQUEST


def test_operador_no_puede_reabrir(usuarios: Dict[str, Personal]):
    r_crear = _crear_incidente(usuarios["operador"])
    inc_id = r_crear.json()["id"]
    admin = headers(usuarios["administrador"])

    client.post(f"/incidentes/{inc_id}/cerrar", json={"accion_correctiva": "Reparado"}, headers=admin)

    r = client.post(
        f"/incidentes/{inc_id}/reabrir",
        json={"motivo": "Motivo"},
        headers=headers(usuarios["operador"]),
    )
    assert r.status_code == status.HTTP_403_FORBIDDEN

