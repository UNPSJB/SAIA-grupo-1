from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.configuracion import schemas, services
from src.database import get_db

# los permisos (solo admin) se aplican al registrar el router en main.py
router = APIRouter(prefix="/configuracion", tags=["Configuración"])


@router.get("/vista-publica", response_model=schemas.ConfiguracionVistaPublica)
def obtener_vista_publica(db: Session = Depends(get_db)):
    return services.obtener_vista_publica(db)


@router.put("/vista-publica", response_model=schemas.ConfiguracionVistaPublica)
def actualizar_vista_publica(cambios: schemas.ConfiguracionVistaPublicaUpdate, db: Session = Depends(get_db)):
    return services.actualizar_vista_publica(db, cambios)
