from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.database import engine
from src.models import ModeloBase
from src.personal.router import router as personal_router

ModeloBase.metadata.create_all(bind=engine)

app = FastAPI(title="SAIA API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permite cualquier origen local
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Monta el router
app.include_router(personal_router, prefix="/personas")

@app.get("/")
def root():
    return {"message": "API SAIA OK"}