from sqlalchemy import Engine, inspect, text


def actualizar_tablas_produccion(engine: Engine) -> None:
    """Pone al dia las tablas de produccion de las bases creadas cuando la unidad de medida era del lote.

    `create_all` no modifica tablas que ya existen, asi que en esas bases:
      - agrega `productos.unidad_medida`, tomando la del ultimo lote de cada producto
        (los productos sin lotes quedan en unidades);
      - borra `lotes_produccion.unidad_medida`, que ahora viene del producto.
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
        if "unidad_medida" not in columnas_producto:
            conexion.execute(
                text("ALTER TABLE productos ADD COLUMN unidad_medida VARCHAR(10) NOT NULL DEFAULT 'UNIDADES'")
            )
            if "unidad_medida" in columnas_lote:
                conexion.execute(text(
                    """UPDATE productos SET unidad_medida = COALESCE(
                        (SELECT l.unidad_medida FROM lotes_produccion l WHERE l.producto_id = productos.id
                         ORDER BY l.fecha DESC, l.id DESC LIMIT 1),
                        'UNIDADES')"""
                ))
        if "unidad_medida" in columnas_lote:
            conexion.execute(text("ALTER TABLE lotes_produccion DROP COLUMN unidad_medida"))
