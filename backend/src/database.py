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

def get_db():
    db = SessionLocal()
    db.execute(text("PRAGMA foreign_keys = ON"))
    try:
        yield db
    finally:
        db.close()
