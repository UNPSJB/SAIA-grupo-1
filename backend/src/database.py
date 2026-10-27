from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from src.config import settings

engine = create_engine(settings.DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def asegurar_migraciones_esquema(db_engine):
    from sqlalchemy import inspect
    inspector = inspect(db_engine)
    tablas = inspector.get_table_names()
    if "insumos_quimicos" in tablas:
        columnas = [col["name"] for col in inspector.get_columns("insumos_quimicos")]
        if "proveedor" not in columnas:
            with db_engine.begin() as conn:
                conn.execute(text("ALTER TABLE insumos_quimicos ADD COLUMN proveedor VARCHAR(150)"))

    if "versiones_documento" in tablas:
        columnas_doc = [col["name"] for col in inspector.get_columns("versiones_documento")]
        if "fecha_vencimiento" not in columnas_doc:
            with db_engine.begin() as conn:
                conn.execute(text("ALTER TABLE versiones_documento ADD COLUMN fecha_vencimiento DATE"))

def migrar_esquema(motor):
    with motor.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE incidentes ADD COLUMN tipo VARCHAR(30) DEFAULT 'otro'"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE incidentes ADD COLUMN categoria_id INTEGER REFERENCES categorias_incidentes(id)"))
        except Exception:
            pass
        try:
            conn.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS categorias_incidentes (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        nombre VARCHAR(60) NOT NULL UNIQUE,
                        descripcion TEXT
                    )
                    """
                )
            )
        except Exception:
            pass

        categorias_iniciales = [
            ("Equipamiento / Maquinaria", "Fallas, roturas o anomalías en equipos productivos o de apoyo"),
            ("Higiene y Limpieza", "Deficiencias o desvíos en limpieza, desinfección o sanitización"),
            ("Edilicio e Infraestructura", "Daños estructurales, goteras, puertas, aberturas o pisos"),
            ("Materia Prima e Insumos", "No conformidades o problemas en insumos y materia prima recibida"),
            ("Control de Plagas", "Avistamiento de plagas, trampas dañadas o desvíos asociados"),
            ("Conducta y Buenas Prácticas", "Incumplimiento de procedimientos o buenas prácticas de manufactura"),
            ("Otro", "Otros desvíos u observaciones generales"),
        ]

        for nombre, desc in categorias_iniciales:
            try:
                conn.execute(
                    text(
                        "INSERT OR IGNORE INTO categorias_incidentes (nombre, descripcion) VALUES (:nombre, :desc)"
                    ),
                    {"nombre": nombre, "desc": desc},
                )
            except Exception:
                pass

def get_db():
    db = SessionLocal()
    db.execute(text("PRAGMA foreign_keys = ON"))
    try:
        yield db
    finally:
        db.close()
