import os
import json
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from src.insumos.constants import ALIMENTOS_SARA_2_INICIALES
from src.insumos.models import AlimentoReferenciaSARA

COLUMNAS_NUTRICIONALES_INSUMOS = [
    ("energia_kcal", "REAL"),
    ("energia_kj", "REAL"),
    ("carbohidratos", "REAL"),
    ("azucares_totales", "REAL"),
    ("azucares_anadidos", "REAL"),
    ("proteinas", "REAL"),
    ("grasas_totales", "REAL"),
    ("grasas_saturadas", "REAL"),
    ("grasas_trans", "REAL"),
    ("fibra_alimentaria", "REAL"),
    ("sodio_mg", "REAL"),
    ("es_aditivo", "BOOLEAN DEFAULT 0"),
    ("fuente_datos", "VARCHAR(50)"),
    ("fuente_detalle", "VARCHAR(255)"),
    ("alimento_referencia_id", "VARCHAR(50)"),
    ("fecha_carga_nutricional", "DATETIME"),
    ("usuario_carga_nutricional", "VARCHAR(100)"),
    ("modificado_manualmente", "BOOLEAN DEFAULT 0"),
    ("fecha_modificacion_nutricional", "DATETIME"),
    ("usuario_modificacion_nutricional", "VARCHAR(100)"),
    ("valores_referencia_json", "TEXT"),
]

def migrar_columnas_nutricionales_insumos(db: Session) -> None:
    engine = db.get_bind()
    with engine.connect() as conn:
        res = conn.execute(text("PRAGMA table_info(insumos)"))
        cols_existentes = {row[1] for row in res.fetchall()}
        if cols_existentes:
            for col_nombre, col_tipo in COLUMNAS_NUTRICIONALES_INSUMOS:
                if col_nombre not in cols_existentes:
                    conn.execute(text(f"ALTER TABLE insumos ADD COLUMN {col_nombre} {col_tipo}"))

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS alimentos_referencia_sara (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    codigo VARCHAR(50) UNIQUE NOT NULL,
                    nombre VARCHAR(150) NOT NULL,
                    categoria VARCHAR(100) NOT NULL,
                    energia_kcal REAL NOT NULL,
                    energia_kj REAL NOT NULL,
                    carbohidratos REAL NOT NULL,
                    azucares_totales REAL NOT NULL DEFAULT 0.0,
                    azucares_anadidos REAL NOT NULL DEFAULT 0.0,
                    proteinas REAL NOT NULL,
                    grasas_totales REAL NOT NULL,
                    grasas_saturadas REAL NOT NULL DEFAULT 0.0,
                    grasas_trans REAL NOT NULL DEFAULT 0.0,
                    fibra_alimentaria REAL NOT NULL DEFAULT 0.0,
                    sodio_mg REAL NOT NULL,
                    fuente VARCHAR(100) NOT NULL,
                    es_aditivo BOOLEAN NOT NULL DEFAULT 0
                )
                """
            )
        )
        conn.commit()

    asegurar_alimentos_sara(db)

def asegurar_alimentos_sara(db: Session) -> None:
    todos_los_items = list(ALIMENTOS_SARA_2_INICIALES)

    data_json = os.path.join(os.path.dirname(__file__), "data", "sara_alimentos.json")
    if os.path.exists(data_json):
        try:
            with open(data_json, "r", encoding="utf-8") as f:
                extras = json.load(f)
                todos_los_items.extend(extras)
        except Exception:
            pass

    codigos_en_bd = set(db.scalars(select(AlimentoReferenciaSARA.codigo)).all())

    para_insertar = []
    codigos_vistos = set()
    for item in todos_los_items:
        cod = item["codigo"]
        if cod not in codigos_en_bd and cod not in codigos_vistos:
            codigos_vistos.add(cod)
            para_insertar.append(AlimentoReferenciaSARA(**item))

    if para_insertar:
        db.add_all(para_insertar)
        db.commit()
