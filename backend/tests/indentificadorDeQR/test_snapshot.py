import json
from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.AcercaDeNostros import schemas as acerca_schemas
from src.AcercaDeNostros.services import crearAcercaDeNostros
from src.configuracion import schemas as config_schemas
from src.configuracion.services import actualizar_vista_publica
from src.indentificadorDeQR import snapshot as snapshot_module
from src.indentificadorDeQR.schemas import IdentificadorQRCreate
from src.indentificadorDeQR.services import crear_IdentificadorUnico
from tests.database import app, session

client = TestClient(app)


def test_snapshot_excluye_datos_internos_y_secciones_deshabilitadas(
    session: Session, tmp_path: Path, monkeypatch
) -> None:
    archivo = tmp_path / "vista_publica.json"
    monkeypatch.setattr(snapshot_module, "SNAPSHOT_FILE", archivo)

    ident = crear_IdentificadorUnico(
        session,
        IdentificadorQRCreate(
            ver_grafico=False,
            verAcercaDeNosotros=False,
            verProductos=False,
            ver_dias_sin_incidentes=False,
            ver_total_lotes=False,
            ver_volumen_fabricado=False,
            ver_producto_mas_elaborado=False,
            ver_grafico_totales_productos=False,
            ver_grafico_red_arana=False,
        ),
        urldelQR="http://interno.local/secreto",
    )
    crearAcercaDeNostros(
        session,
        acerca_schemas.AcercaDeNosotrosCreate(descripcion="Empresa Modelo"),
    )

    payload = snapshot_module.regenerar_snapshot_vista_publica(session, snapshot_path=archivo)

    assert archivo.is_file()
    assert payload["qr"] is not None
    assert payload["qr"]["id_alfanumerico"] == ident.id_alfanumerico
    assert "urldelQR" not in payload["qr"]
    assert payload["acerca_de_nosotros"] is None
    assert payload["productos"] == []
    assert payload["cumplimiento_limpieza"] == {}
    assert payload["estadisticas"]["dias_sin_incidentes"] is None
    assert payload["estadisticas"]["totales_productos"] == []


def test_hook_configuracion_regenera_snapshot_y_endpoint_estatico(
    session: Session, tmp_path: Path, monkeypatch
) -> None:
    archivo = tmp_path / "vista_publica.json"
    monkeypatch.setattr(snapshot_module, "SNAPSHOT_FILE", archivo)

    res_missing = client.get("/identificadorQR/publico/snapshot")
    assert res_missing.status_code == 404

    ident = crear_IdentificadorUnico(
        session,
        IdentificadorQRCreate(verAcercaDeNosotros=False),
        urldelQR="http://localhost/vista-publica",
    )
    crearAcercaDeNostros(
        session,
        acerca_schemas.AcercaDeNosotrosCreate(descripcion="Calidad verificada"),
    )

    actualizar_vista_publica(
        session,
        config_schemas.ConfiguracionVistaPublicaUpdate(verAcercaDeNosotros=True),
    )

    assert archivo.is_file()
    res = client.get("/identificadorQR/publico/snapshot")
    assert res.status_code == 200
    assert "max-age=" in res.headers.get("cache-control", "")
    data = json.loads(res.text)
    assert data["qr"]["id_alfanumerico"] == ident.id_alfanumerico
    assert data["qr"]["config"]["verAcercaDeNosotros"] is True
    assert data["acerca_de_nosotros"] == {"descripcion": "Calidad verificada"}
