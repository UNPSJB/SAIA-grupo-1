from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.personal.router import router as personal_router

app = FastAPI(title="SAIA API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# conecto el router de personal bajo /personas
app.include_router(personal_router, prefix="/personas")