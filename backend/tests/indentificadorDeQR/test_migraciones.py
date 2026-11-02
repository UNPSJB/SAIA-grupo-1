from pathlib import Path
from sqlalchemy import create_engine, inspect, text
from src.indentificadorDeQR.migraciones import actualizar_tabla_identificador_qr


def test_agrega_ver_productos_desactivado_a_los_qr_existentes(tmp_path: Path) -> None:
    engine = create_engine(f"sqlite:///{tmp_path / 'vieja.sqlite3'}")
    with engine.begin() as conexion:
        conexion.execute(text(
            'CREATE TABLE "Identificador_UnicoDeQR" (id_alfanumerico VARCHAR(37) NOT NULL, estado BOOLEAN NOT NULL, '
            '"urldelQR" VARCHAR NOT NULL, ver_grafico BOOLEAN NOT NULL, "verAcercaDeNosotros" BOOLEAN NOT NULL, '
            'PRIMARY KEY (id_alfanumerico))'
        ))
        conexion.execute(text("INSERT INTO Identificador_UnicoDeQR VALUES ('abc', 1, 'http://x', 1, 1)"))

    actualizar_tabla_identificador_qr(engine)
    actualizar_tabla_identificador_qr(engine)  # correrla de nuevo no rompe nada

    assert "verProductos" in {c["name"] for c in inspect(engine).get_columns("Identificador_UnicoDeQR")}
    with engine.begin() as conexion:
        assert conexion.execute(text("SELECT verProductos FROM Identificador_UnicoDeQR")).scalar() == 0
    engine.dispose()


def test_sin_tabla_no_hace_nada(tmp_path: Path) -> None:
    engine = create_engine(f"sqlite:///{tmp_path / 'vacia.sqlite3'}")
    actualizar_tabla_identificador_qr(engine)
    assert not inspect(engine).has_table("Identificador_UnicoDeQR")
    engine.dispose()
