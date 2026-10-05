from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI
from src.autenticacion.dependencies import get_usuario_actual, requiere_admin
from src.autenticacion.services import asegurar_admin_dev
from src.database import engine, SessionLocal
from src.models import ModeloBase

# Importamos la configuración validada por Pydantic
from src.config import settings

# Importamos configuracion de logger
from src.logger import setup_logging

# Importamos los routers desde nuestros modulos
from src.insumos.router import router as insumos_router
from src.equipos.router import router as equipos_router
from src.personal.router import router as personal_router
from src.elementosDeLimpieza.router import router as elementoDeLimpieza_router
from src.plan_De_limpieza.router import router as planLimpieza_router
from src.tareas.router import router as tarea_router
from src.auditoria.router import router as auditoria_router
from src.checklist.router import router as checklist_router
from src.dashboard.router import router as dashboard_router
from src.autenticacion.router import router as autenticacion_router
from fastapi.middleware.cors import CORSMiddleware
from .insumos_quimicos.router import router as insumos_quimicos_router


ENV = settings.ENV.upper()
ROOT_PATH = getattr(settings, f"ROOT_PATH_{ENV}", "")

setup_logging()

@asynccontextmanager
async def db_creation_lifespan(app: FastAPI):
    ModeloBase.metadata.create_all(bind=engine)
    if ENV == "DEV":
        # Usuario admin/admin compartido por el equipo (cada integrante tiene su propia base)
        with SessionLocal() as db:
            asegurar_admin_dev(db)
    yield


app = FastAPI(root_path=ROOT_PATH, lifespan=db_creation_lifespan)

origins = [
    "http://localhost:5173", # para recibir requests desde app React (puerto: 5173)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Permisos por router (ver src/autenticacion/dependencies.py):
#  - SOLO_ADMIN: todo el router exige capacidad ADMINISTRAR o AMBAS.
#  - SESION: alcanza con estar logueado; el router decide el resto endpoint por endpoint
#    (insumos_quimicos y checklist, que los operadores también usan).
SOLO_ADMIN = [Depends(requiere_admin)]
SESION = [Depends(get_usuario_actual)]

# asociamos los routers a nuestra app
app.include_router(insumos_router, prefix="/insumos", tags=["Insumos"], dependencies=SOLO_ADMIN)
app.include_router(equipos_router, prefix="/equipos", tags=["Equipos"], dependencies=SOLO_ADMIN)
app.include_router(personal_router, prefix="/personal", tags=["Personal"], dependencies=SOLO_ADMIN)
app.include_router(elementoDeLimpieza_router, dependencies=SOLO_ADMIN)
app.include_router(insumos_quimicos_router, dependencies=SESION)
app.include_router(auditoria_router, dependencies=SOLO_ADMIN)
app.include_router(planLimpieza_router, dependencies=SOLO_ADMIN)
app.include_router(tarea_router, dependencies=SOLO_ADMIN)
app.include_router(checklist_router)
app.include_router(dashboard_router, dependencies=SOLO_ADMIN)
# /autenticacion/login es público; /autenticacion/me se protege dentro de su router
app.include_router(autenticacion_router, prefix="/autenticacion", tags=["Autenticación"])
