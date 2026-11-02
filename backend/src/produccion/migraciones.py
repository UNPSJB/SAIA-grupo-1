from sqlalchemy import Engine, inspect, text


def actualizar_tablas_produccion(engine: Engine) -> None:
    """Pone al dia las tablas de produccion de las bases creadas antes del ABM de productos.

    `create_all` no modifica tablas que ya existen, asi que en esas bases:
      - agrega `productos.unidadMedida`, tomandola de `productos.unidad_medida` si existe o, en las
        bases todavia mas viejas, del ultimo lote de cada producto (los productos sin lotes quedan en unidades);
      - agrega las columnas del ABM que falten (`descripcion`, `activo`, `id_receta`); los productos
        existentes quedan activos;
      - borra `productos.unidad_medida` y `lotes_produccion.unidad_medida`, reemplazadas por `unidadMedida`.
    Se puede correr siempre: si las tablas ya estan al dia (o no existen todavia) no hace nada.
    """
    inspector = inspect(engine)
    if not inspector.has_table("productos"):
        return
    columnas_producto = {c["name"] for c in inspector.get_columns("productos")}
    columnas_lote = (
        {c["name"] for c in inspector.get_columns("lotes_produccion")}
        if inspector.has_table("lotes_produccion")
        else set()
    )

    with engine.begin() as conexion:
        if "unidadMedida" not in columnas_producto:
            conexion.execute(
                text("ALTER TABLE productos ADD COLUMN unidadMedida VARCHAR(10) NOT NULL DEFAULT 'UNIDADES'")
            )
            if "unidad_medida" in columnas_producto:
                conexion.execute(text("UPDATE productos SET unidadMedida = unidad_medida"))
            elif "unidad_medida" in columnas_lote:
                conexion.execute(text(
                    """UPDATE productos SET unidadMedida = COALESCE(
                        (SELECT l.unidad_medida FROM lotes_produccion l WHERE l.producto_id = productos.id
                         ORDER BY l.fecha DESC, l.id DESC LIMIT 1),
                        'UNIDADES')"""
                ))
        if "descripcion" not in columnas_producto:
            conexion.execute(text("ALTER TABLE productos ADD COLUMN descripcion VARCHAR(100)"))
        if "activo" not in columnas_producto:
            conexion.execute(text("ALTER TABLE productos ADD COLUMN activo BOOLEAN NOT NULL DEFAULT 1"))
        if "id_receta" not in columnas_producto:
            conexion.execute(text("ALTER TABLE productos ADD COLUMN id_receta INTEGER REFERENCES documentos (id)"))
        if "unidad_medida" in columnas_producto:
            conexion.execute(text("ALTER TABLE productos DROP COLUMN unidad_medida"))
        if "unidad_medida" in columnas_lote:
            conexion.execute(text("ALTER TABLE lotes_produccion DROP COLUMN unidad_medida"))
