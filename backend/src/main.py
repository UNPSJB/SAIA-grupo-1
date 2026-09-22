from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.personal.router import router as personal_router
from src.insumos.router import router as insumos_router
from src.equipos.router import router as equipos_router

app = FastAPI(title="SAIA API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(personal_router, prefix="/personal", tags=["personal"])
app.include_router(insumos_router, prefix="/insumos", tags=["insumos"])
app.include_router(equipos_router, prefix="/equipos", tags=["equipos"])