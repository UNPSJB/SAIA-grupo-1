from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.dashboard import schemas, services
from src.database import get_db

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/resumen", response_model=schemas.DashboardResumen)
def obtener_resumen(periodo: schemas.Periodo = "semana", db: Session = Depends(get_db)):
    return services.obtener_resumen(db, periodo)
