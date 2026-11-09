from sqlalchemy import Engine, inspect, text


def actualizar_tablas_rotulado(engine: Engine) -> None:
    inspector = inspect(engine)

    if not inspector.has_table("listas_ingredientes_rotulo"):
        with engine.begin() as conexion:
            conexion.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS listas_ingredientes_rotulo (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        producto_id INTEGER NOT NULL UNIQUE REFERENCES productos(id) ON DELETE CASCADE,
                        formato_aditivos VARCHAR(30) NOT NULL DEFAULT 'ins_y_nombre',
                        ajustado_manualmente BOOLEAN NOT NULL DEFAULT 0,
                        fecha_ajuste_manual DATETIME,
                        usuario_ajuste_manual VARCHAR(100),
                        texto_rotulo TEXT,
                        actualizado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )
            )
            conexion.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_listas_ingredientes_rotulo_id ON listas_ingredientes_rotulo (id)"
                )
            )
            conexion.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_listas_ingredientes_rotulo_producto_id ON listas_ingredientes_rotulo (producto_id)"
                )
            )

    if not inspector.has_table("items_ingredientes_rotulo"):
        with engine.begin() as conexion:
            conexion.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS items_ingredientes_rotulo (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        lista_id INTEGER NOT NULL REFERENCES listas_ingredientes_rotulo(id) ON DELETE CASCADE,
                        orden INTEGER NOT NULL,
                        nombre VARCHAR(100) NOT NULL,
                        denominacion_rotulo VARCHAR(150) NOT NULL,
                        porcentaje FLOAT NOT NULL,
                        es_aditivo BOOLEAN NOT NULL DEFAULT 0,
                        funcion VARCHAR(80),
                        numero_ins VARCHAR(20),
                        es_aromatizante BOOLEAN NOT NULL DEFAULT 0,
                        texto_declaracion VARCHAR(255)
                    )
                    """
                )
            )
            conexion.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_items_ingredientes_rotulo_id ON items_ingredientes_rotulo (id)"
                )
            )
            conexion.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_items_ingredientes_rotulo_lista_id ON items_ingredientes_rotulo (lista_id)"
                )
            )
            conexion.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_items_ingredientes_rotulo_orden ON items_ingredientes_rotulo (orden)"
                )
            )

