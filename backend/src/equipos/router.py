import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.equipos import schemas, services
from src.autenticacion.dependencies import get_usuario_actual
from typing import Optional
from src.utils.csv import generar_respuesta_csv

router = APIRouter()

@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_equipos_csv(
    busqueda: Optional[str] = None,
    categoria: Optional[str] = None,
    estado: Optional[str] = None,
    db: Session = Depends(get_db)
):
    
    datos = services.obtener_equipos_para_csv(
        db, busqueda=busqueda, categoria=categoria, estado=estado
    )

    columnas = {
        "id": "ID",
        "nombre": "Nombre del Equipo",
        "ubicacion": "Ubicación / Sector",
        "categoria": "Categoría",
        "plan_de_limpieza": "Plan de Limpieza",
        "estado": "Estado",
    }

    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo="equipos.csv",
    )

@router.post("/", response_model=schemas.Equipo)
async def create_equipo(equipo: schemas.EquipoCreate, db: Session = Depends(get_db)):
    return services.crear_equipo(db, equipo)

@router.get("/", response_model=list[schemas.Equipo])
async def read_equipos(estado: Optional[schemas.Estado] = None, db: Session = Depends(get_db)):
    return services.listar_equipos(db, estado=estado)

@router.get("/{equipo_id}", response_model=schemas.Equipo)
async def read_equipo(equipo_id: int, db: Session = Depends(get_db)):
    return services.obtener_equipo(db, equipo_id)

@router.put("/{equipo_id}", response_model=schemas.Equipo)
async def editar_equipo(equipo_id: int, equipo: schemas.EquipoUpdate, db: Session = Depends(get_db)):
    return services.editar_equipo(db, equipo_id, equipo)

@router.delete("/{equipo_id}", response_model=schemas.Equipo)
async def eliminar_equipo(equipo_id: int, db: Session = Depends(get_db)):
    return services.eliminar_equipo(db, equipo_id)

@router.patch("/{equipo_id}/reactivar", response_model=schemas.Equipo)
async def reactivar_equipo(equipo_id: int, db: Session = Depends(get_db)):
    return services.reactivar_equipo(db, equipo_id)

@router.put("/{equipo_id}/reactivar", response_model=schemas.Equipo)
async def reactivar_equipo_put(equipo_id: int, db: Session = Depends(get_db)):
    return services.reactivar_equipo(db, equipo_id)