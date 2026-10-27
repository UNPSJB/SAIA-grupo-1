import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.elementosDeLimpieza import schemas, services
from typing import Optional
from src.autenticacion.dependencies import get_usuario_actual
from src.utils.csv import generar_respuesta_csv

router = APIRouter(prefix="/elementosDeLimpieza", tags=["elementosDeLimpieza"])

@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_elementos_csv(
    busqueda: Optional[str] = None,
    estado: Optional[str] = None,
    db: Session = Depends(get_db)
):
    
    datos = services.obtener_elementos_para_csv(db, busqueda=busqueda, estado=estado)

    columnas = {
        "id": "ID",
        "nombre": "Nombre del Elemento",
        "frecuenciaDeCambio": "Frecuencia de Cambio",
        "proximoRecambio": "Próximo Recambio",
        "estado": "Estado",
    }

    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo="elementos_de_limpieza.csv",
    )

@router.post("/", response_model=schemas.ElementoDeLimpieza)
async def create_elementoDeLimpieza(equipo: schemas.ElementoDeLimpiezaCreate, db: Session = Depends(get_db)):
    return services.crear_elementoDeLimpieza(db, equipo)

@router.get("/", response_model=list[schemas.ElementoDeLimpieza])
async def read_elementosDeLimpieza(db: Session = Depends(get_db)):
    return services.listar_elementosDeLimpiezas(db)

@router.get("/{elementoDeLimpieza_id}", response_model=schemas.ElementoDeLimpieza)
async def read_elementoDeLimpieza(elementoDeLimpieza_id: int, db: Session = Depends(get_db)):
    return services.obtener_elementoDeLimpieza(db, elementoDeLimpieza_id)

@router.put("/{elementoDeLimpieza_id}", response_model=schemas.ElementoDeLimpiezaUpdate)
async def update_elementoDeLimpieza(elementoDeLimpieza_id: int, elementoDeLimpieza: schemas.ElementoDeLimpiezaUpdate, db: Session = Depends(get_db)):
    return services.editar_elementoDeLimpieza(db, elementoDeLimpieza_id, elementoDeLimpieza)

@router.delete("/{elementoDeLimpieza_id}", response_model=schemas.ElementoDeLimpieza)
async def delete_elementoDeLimpieza(elementoDeLimpieza_id: int, db: Session = Depends(get_db)):
    return services.eliminar_elementoDeLimpieza(db, elementoDeLimpieza_id)

@router.post("/{elementoDeLimpieza_id}/cambiar", response_model=schemas.ElementoDeLimpieza)
async def efectuar_cambio(elementoDeLimpieza_id: int, db: Session = Depends(get_db)):
    return services.registrar_cambio_fecha(db, elementoDeLimpieza_id)