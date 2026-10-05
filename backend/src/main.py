from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.database import engine, SessionLocal
from src.models import ModeloBase
from src.config import settings
from src.logger import setup_logging

# Autenticación y modelos clave
from src.autenticacion.router import router as autenticacion_router
from src.autenticacion.services import asegurar_admin_dev
from src.certificado.models import Certificado  # Carga explícita para mappers

# Routers de la app
from src.insumos.router import router as insumos_router
from src.equipos.router import router as equipos_router
from src.personal.router import router as personal_router
from src.elementosDeLimpieza.router import router as elementoDeLimpieza_router
from src.plan_De_limpieza.router import router as planLimpieza_router
from src.tareas.router import router as tarea_router
from src.auditoria.router import router as auditoria_router
from src.checklist.router import router as checklist_router
from src.dashboard.router import router as dashboard_router
from src.certificado.router import router as certificado_router
from src.insumos_quimicos.router import router as insumos_quimicos_router

ENV = str(getattr(settings, "ENV", "DEV")).upper()
ROOT_PATH = str(getattr(settings, f"ROOT_PATH_{ENV}", ""))

setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Genera las tablas que no existan
    ModeloBase.metadata.create_all(bind=engine)

    # Crea el usuario admin si no existe en desarrollo
    db = SessionLocal()
    try:
        asegurar_admin_dev(db)
    finally:
        db.close()

    yield


app = FastAPI(root_path=ROOT_PATH, lifespan=lifespan)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusión del router de autenticación (/autenticacion/login, /autenticacion/me)
app.include_router(autenticacion_router)

# Routers del resto del sistema
app.include_router(insumos_router, prefix="/insumos", tags=["Insumos"])
app.include_router(equipos_router, prefix="/equipos", tags=["Equipos"])
app.include_router(personal_router, prefix="/personal", tags=["Personal"])
app.include_router(elementoDeLimpieza_router)
app.include_router(insumos_quimicos_router)
app.include_router(auditoria_router)
app.include_router(planLimpieza_router)
app.include_router(tarea_router)
app.include_router(checklist_router)
app.include_router(dashboard_router)
app.include_router(certificado_router)