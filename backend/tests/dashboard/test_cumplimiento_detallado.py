from datetime import date, timedelta
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.dashboard import services
from src.dashboard.exceptions import RangoFechasInvalidoException
from tests.database import app, session
import pytest

client = TestClient(app)

def test_cumplimiento_detallado_endpoint_valido(session: Session) -> None:
    hoy = date.today()
    desde = hoy - timedelta(days=30)
    response = client.get(f"/dashboard/cumplimiento-detallado?desde={desde}&hasta={hoy}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "kpis" in data
    assert "tendencia_temporal" in data
    assert "desglose_por_sector" in data
    assert "desglose_por_equipo" in data
    assert "desglose_por_turno" in data
    assert "items_detalle" in data
    assert "total_tareas" in data["kpis"]
    assert "porcentaje_general" in data["kpis"]

def test_cumplimiento_detallado_fecha_invalida(session: Session) -> None:
    hoy = date.today()
    desde = hoy
    hasta = hoy - timedelta(days=5)
    response = client.get(f"/dashboard/cumplimiento-detallado?desde={desde}&hasta={hasta}")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "posterior" in response.json()["detail"].lower()

def test_cumplimiento_detallado_filtro_turno_y_sector(session: Session) -> None:
    response = client.get("/dashboard/cumplimiento-detallado?turno=MAÑANA&sector_id=1")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["turno"] == "MAÑANA"
    assert data["sector_id"] == 1

def test_cumplimiento_detallado_servicio_excepcion_fecha(session: Session) -> None:
    with pytest.raises(RangoFechasInvalidoException):
        services.obtener_cumplimiento_detallado(
            session,
            desde=date(2026, 10, 20),
            hasta=date(2026, 10, 10),
        )

