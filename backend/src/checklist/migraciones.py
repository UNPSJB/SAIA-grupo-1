from sqlalchemy import Engine, inspect, text


def actualizar_tablas_checklist(engine: Engine) -> None:
    inspector = inspect(engine)
    if not inspector.has_table("checklists"):
        return

    cols_checklists = {c["name"] for c in inspector.get_columns("checklists")}
    with engine.begin() as conexion:
        if "tiene_reasignacion_no_leida" not in cols_checklists:
            conexion.execute(
                text("ALTER TABLE checklists ADD COLUMN tiene_reasignacion_no_leida BOOLEAN NOT NULL DEFAULT 0")
            )
            conexion.execute(
                text("CREATE INDEX IF NOT EXISTS ix_checklists_tiene_reasignacion_no_leida ON checklists (tiene_reasignacion_no_leida)")
            )

    if not inspector.has_table("checklist_items"):
        return

    cols_items = {c["name"] for c in inspector.get_columns("checklist_items")}
    with engine.begin() as conexion:
        if "fecha_original" not in cols_items:
            conexion.execute(text("ALTER TABLE checklist_items ADD COLUMN fecha_original DATE"))
        if "motivo_no_realizado" not in cols_items:
            conexion.execute(text("ALTER TABLE checklist_items ADD COLUMN motivo_no_realizado VARCHAR(100)"))
            conexion.execute(text("CREATE INDEX IF NOT EXISTS ix_checklist_items_motivo_no_realizado ON checklist_items (motivo_no_realizado)"))
        if "observacion_no_realizado" not in cols_items:
            conexion.execute(text("ALTER TABLE checklist_items ADD COLUMN observacion_no_realizado TEXT"))
        if "fecha_hora_no_realizado" not in cols_items:
            conexion.execute(text("ALTER TABLE checklist_items ADD COLUMN fecha_hora_no_realizado DATETIME"))
        if "es_reasignada" not in cols_items:
            conexion.execute(text("ALTER TABLE checklist_items ADD COLUMN es_reasignada BOOLEAN NOT NULL DEFAULT 0"))
            conexion.execute(text("CREATE INDEX IF NOT EXISTS ix_checklist_items_es_reasignada ON checklist_items (es_reasignada)"))
        if "revisada_por_operador" not in cols_items:
            conexion.execute(text("ALTER TABLE checklist_items ADD COLUMN revisada_por_operador BOOLEAN NOT NULL DEFAULT 1"))
        if "tarea_origen_id" not in cols_items:
            conexion.execute(text("ALTER TABLE checklist_items ADD COLUMN tarea_origen_id INTEGER"))
        if "tarea_reemplazo_id" not in cols_items:
            conexion.execute(text("ALTER TABLE checklist_items ADD COLUMN tarea_reemplazo_id INTEGER"))

