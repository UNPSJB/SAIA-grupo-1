from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import requiere_operador
from src.database import get_db
from src.personal.models import Personal
from src.produccion import schemas, services

lotes_router = APIRouter(prefix="/lotes", tags=["Producción"])
productos_router = APIRouter(prefix="/productos", tags=["Producción"])


@lotes_router.post("/", response_model=schemas.LoteProduccion, status_code=status.HTTP_201_CREATED)
def registrar_lote_endpoint(
    datos: schemas.LoteProduccionCreate,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_operador),
):
    return services.registrar_lote(db, usuario.legajo, datos)


@lotes_router.get("/", response_model=List[schemas.LoteProduccion])
def listar_lotes_endpoint(
    producto_id: Optional[int] = Query(None),
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    return services.listar_lotes(db, producto_id, desde, hasta)


@lotes_router.get("/{lote_id}", response_model=schemas.LoteProduccion)
def leer_lote_endpoint(lote_id: int, db: Session = Depends(get_db)):
    return services.leer_lote(db, lote_id)


@productos_router.get("/", response_model=List[schemas.Producto])
def listar_productos_endpoint(db: Session = Depends(get_db)):
    return services.listar_productos(db)
