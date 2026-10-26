from sqlalchemy import Engine, inspect, text


def actualizar_tabla_insumos(engine: Engine) -> None:
    """Pone al dia la tabla `insumos` de las bases creadas antes de la baja logica.

    `create_all` no modifica tablas que ya existen, asi que en esas bases:
      - agrega la columna `activo` (todos los insumos existentes quedan activos);
      - cambia el indice unico del nombre por uno comun (el nombre ahora se valida solo entre activos).
    Se puede correr siempre: si la tabla ya esta al dia (o no existe todavia) no hace nada.
    """
    inspector = inspect(engine)
    if not inspector.has_table("insumos"):
        return
    columnas = {c["name"] for c in inspector.get_columns("insumos")}
    indices_unicos_del_nombre = [
        i["name"] for i in inspector.get_indexes("insumos") if i["unique"] and i["column_names"] == ["nombre"]
    ]

    with engine.begin() as conexion:
        if "activo" not in columnas:
            conexion.execute(text("ALTER TABLE insumos ADD COLUMN activo BOOLEAN NOT NULL DEFAULT 1"))
        if indices_unicos_del_nombre:
            for nombre_indice in indices_unicos_del_nombre:
                conexion.execute(text(f'DROP INDEX "{nombre_indice}"'))
            conexion.execute(text("CREATE INDEX IF NOT EXISTS ix_insumos_nombre ON insumos (nombre)"))
