from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.database import engine
from src.models import ModeloBase
from src.personal.router import router as personal_router

# Crear automáticamente las tablas en SQLite al arrancar
ModeloBase.metadata.create_all(bind=engine)

app = FastAPI(title="SAIA API")

# Habilitar CORS para permitir peticiones desde Vite (puerto 5173)
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

# Montar el router bajo el prefijo /personas
app.include_router(personal_router, prefix="/personas")

@app.get("/")
def root():
    return {"message": "API de SAIA funcionando correctamente"}