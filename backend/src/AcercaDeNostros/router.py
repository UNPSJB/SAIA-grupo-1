from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.AcercaDeNostros import schemas, services




router = APIRouter(prefix="/acercaDeNosotros", tags=["acercaDeNosotros"])

@router.post("/",response_model=schemas.AcercaDeNosotros)
async def createAcercaDeNosotros(descrip:schemas.AcercaDeNosotrosCreate, db: Session = Depends(get_db)):
    return services.crearAcercaDeNostros(db,descrip)

@router.put("/{id}", response_model=schemas.AcercaDeNosotros)
async def updateAcercaDeNosotros(id: int, descrip: schemas.AcercaDeNosotrosCreate, db: Session = Depends(get_db)):
     return services.actualizarAcercaDeNostros(db, id, descrip)
        
@router.get("/", response_model=schemas.AcercaDeNosotros | None)
def obtener_acerca_de_nosotros_route(db: Session = Depends(get_db)):
    return services.obtener_acerca_de_nosotros(db)