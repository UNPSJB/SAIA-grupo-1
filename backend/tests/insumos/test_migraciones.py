from pathlib import Path
from sqlalchemy import create_engine, inspect, text
from src.insumos.migraciones import actualizar_tabla_insumos

# la tabla tal como la creaba create_all antes de la baja logica (nombre con indice unico, sin activo)
TABLA_VIEJA = [
    """CREATE TABLE insumos (
        id INTEGER NOT NULL, nombre VARCHAR NOT NULL, lote VARCHAR NOT NULL,
        "fechaRecepcion" DATETIME NOT NULL, "fechaVencimiento" DATETIME,
        "cantRecibida" FLOAT NOT NULL, stock FLOAT NOT NULL, medida VARCHAR(10) NOT NULL,
        PRIMARY KEY (id))""",
    "CREATE UNIQUE INDEX ix_insumos_nombre ON insumos (nombre)",
    """INSERT INTO insumos VALUES
        (1, 'Harina', 'L1', '2026-10-01', NULL, 10, 5, 'KILOGRAMOS'),
        (2, 'Sal', 'L2', '2026-10-01', NULL, 3, 3, 'KILOGRAMOS')""",
]


def _engine(tmp_path: Path):
    return create_engine(f"sqlite:///{tmp_path / 'vieja.sqlite3'}")


def _indice_nombre(engine) -> dict:
    return next(i for i in inspect(engine).get_indexes("insumos") if i["column_names"] == ["nombre"])


def test_actualiza_una_base_vieja_sin_perder_datos(tmp_path: Path) -> None:
    engine = _engine(tmp_path)
    with engine.begin() as conexion:
        for sentencia in TABLA_VIEJA:
            conexion.execute(text(sentencia))

    actualizar_tabla_insumos(engine)
    actualizar_tabla_insumos(engine)  # correrla de nuevo no rompe nada

    assert not _indice_nombre(engine)["unique"]
    with engine.begin() as conexion:
        filas = conexion.execute(text("SELECT id, nombre, stock, activo FROM insumos ORDER BY id")).all()
        assert [tuple(f) for f in filas] == [(1, "Harina", 5, 1), (2, "Sal", 3, 1)]
        # ya se puede tener un insumo dado de baja y otro activo con el mismo nombre
        conexion.execute(text(
            "INSERT INTO insumos VALUES (3, 'Harina', 'L3', '2026-10-02', NULL, 1, 1, 'KILOGRAMOS', 1)"
        ))
    engine.dispose()


def test_sin_tabla_de_insumos_no_hace_nada(tmp_path: Path) -> None:
    engine = _engine(tmp_path)
    actualizar_tabla_insumos(engine)
    assert not inspect(engine).has_table("insumos")
    engine.dispose()
