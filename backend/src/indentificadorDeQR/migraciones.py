from sqlalchemy import Engine, inspect, text


def actualizar_tabla_identificador_qr(engine: Engine) -> None:
    """Agrega `verProductos` a las bases creadas antes del catalogo publico (`create_all` no altera tablas).

    Los QR existentes quedan con el listado de productos desactivado. Si la tabla ya esta al dia
    (o todavia no existe) no hace nada.
    """
    inspector = inspect(engine)
    if not inspector.has_table("Identificador_UnicoDeQR"):
        return
    columnas = {c["name"] for c in inspector.get_columns("Identificador_UnicoDeQR")}
    if "verProductos" not in columnas:
        with engine.begin() as conexion:
            conexion.execute(text("ALTER TABLE Identificador_UnicoDeQR ADD COLUMN verProductos BOOLEAN NOT NULL DEFAULT 0"))
