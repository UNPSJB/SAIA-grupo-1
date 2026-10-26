from pathlib import Path
from sqlalchemy import create_engine, inspect, text
from src.produccion.migraciones import actualizar_tablas_produccion

# las tablas tal como las creaba create_all cuando la unidad de medida era del lote
TABLAS_VIEJAS = [
    "CREATE TABLE productos (id INTEGER NOT NULL, nombre VARCHAR(100) NOT NULL, PRIMARY KEY (id))",
    """CREATE TABLE lotes_produccion (
        id INTEGER NOT NULL, codigo VARCHAR(20) NOT NULL, producto_id INTEGER NOT NULL, fecha DATE NOT NULL,
        cantidad FLOAT NOT NULL, unidad_medida VARCHAR(10) NOT NULL, responsable_legajo INTEGER NOT NULL,
        creado_en DATETIME NOT NULL, PRIMARY KEY (id), FOREIGN KEY(producto_id) REFERENCES productos (id))""",
    "INSERT INTO productos VALUES (1, 'Pan'), (2, 'Tarta'), (3, 'Alfajor')",
    # el pan cambio de unidad: se toma la del lote mas reciente. El alfajor no tiene lotes.
    """INSERT INTO lotes_produccion VALUES
        (1, 'L-20261020-01', 1, '2026-10-20', 10, 'UNIDADES', 1, '2026-10-20 08:00:00'),
        (2, 'L-20261021-01', 1, '2026-10-21', 12, 'KILOGRAMOS', 1, '2026-10-21 08:00:00'),
        (3, 'L-20261021-02', 2, '2026-10-21', 5, 'LITROS', 1, '2026-10-21 09:00:00')""",
]


def _engine(tmp_path: Path):
    return create_engine(f"sqlite:///{tmp_path / 'vieja.sqlite3'}")


def _columnas(engine, tabla: str) -> set:
    return {c["name"] for c in inspect(engine).get_columns(tabla)}


def test_pasa_la_unidad_del_lote_al_producto_sin_perder_datos(tmp_path: Path) -> None:
    engine = _engine(tmp_path)
    with engine.begin() as conexion:
        for sentencia in TABLAS_VIEJAS:
            conexion.execute(text(sentencia))

    actualizar_tablas_produccion(engine)
    actualizar_tablas_produccion(engine)  # correrla de nuevo no rompe nada

    assert "unidad_medida" not in _columnas(engine, "lotes_produccion")
    with engine.begin() as conexion:
        productos = conexion.execute(text("SELECT id, nombre, unidad_medida FROM productos ORDER BY id")).all()
        assert [tuple(p) for p in productos] == [(1, "Pan", "KILOGRAMOS"), (2, "Tarta", "LITROS"), (3, "Alfajor", "UNIDADES")]
        lotes = conexion.execute(text("SELECT id, cantidad FROM lotes_produccion ORDER BY id")).all()
        assert [tuple(l) for l in lotes] == [(1, 10), (2, 12), (3, 5)]
    engine.dispose()


def test_sin_tabla_de_lotes_solo_agrega_la_unidad_al_producto(tmp_path: Path) -> None:
    engine = _engine(tmp_path)
    with engine.begin() as conexion:
        conexion.execute(text(TABLAS_VIEJAS[0]))
        conexion.execute(text("INSERT INTO productos VALUES (1, 'Pan')"))

    actualizar_tablas_produccion(engine)

    with engine.begin() as conexion:
        assert conexion.execute(text("SELECT unidad_medida FROM productos")).scalar() == "UNIDADES"
    engine.dispose()


def test_sin_tablas_de_produccion_no_hace_nada(tmp_path: Path) -> None:
    engine = _engine(tmp_path)
    actualizar_tablas_produccion(engine)
    assert not inspect(engine).has_table("productos")
    engine.dispose()
