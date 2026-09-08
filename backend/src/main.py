from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importar el engine y la clase Base de tu base de datos
from src.database import engine
from src.personal.models import ModeloBase  # O Base, según cómo se llame en tu models.py
import src.personal.models  # Obligatorio importarlo para que SQLAlchemy registre la tabla

from src.personal.router import router as personal_router

# 1. Crear automáticamente todas las tablas en SQLite al arrancar
ModeloBase.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sistema de Administración y Gestión",
    version="1.0.0"
)

# 2. Configurar CORS para Vite
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Routers
app.include_router(personal_router, prefix="/personas", tags=["Personas"])
app.include_router(personal_router, prefix="/personal", tags=["Personal"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "API activa"}