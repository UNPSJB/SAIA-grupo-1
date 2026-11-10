import logging
from fastapi.responses import RedirectResponse
from typing_extensions import Buffer
from fastapi import APIRouter, Depends, HTTPException, Response
from typing import List
from src.autenticacion.dependencies import requiere_admin
from src.producto import schemas as producto_schemas
from sqlalchemy.orm import Session
from src.database import get_db
from src.indentificadorDeQR import services,schemas


router=APIRouter(prefix="/identificadorQR",tags=["identificadorQR"])




@router.post("/",response_model=schemas.IdentificadorQR)
async def createIdentificador(ident: schemas.IdentificadorQRCreate, db: Session = Depends(get_db)):
    return services.crear_IdentificadorUnico(db, ident)


@router.get("/verificar/{identificador_id}")
def verificar_y_redirigir(identificador_id: str, db: Session = Depends(get_db)):
    identificador = services.verificar_identificadorQR(db, identificador_id)
    

    return identificador


@router.put("/{identificador_id}", response_model=schemas.IdentificadorQR)
async def editar_identificadorQR(identificador_id: str, db: Session = Depends(get_db)):
    return services.editar_identificadorQr(db, identificador_id)

@router.put("/{identificador_id}/ver-grafico", response_model=schemas.IdentificadorQR)
async def actualizar_estado_grafico(identificador_id: str, ident_update: schemas.IdentifacadorQRUpdate, db: Session = Depends(get_db)):
    return services.actualizar_ver_grafico(db, identificador_id, ident_update)

@router.put("/{identificador_id}/ver-acercaDeNosotros", response_model=schemas.IdentificadorQR)
async def actualizar_estado_acercaDeNosotros(identificador_id: str, ident_update: schemas.IdentifacadorQRUpdate, db: Session = Depends(get_db)):
    return services.actualizar_ver_acercaDeNosotros(db, identificador_id, ident_update)

@router.put("/{identificador_id}/ver-productos", response_model=schemas.IdentificadorQR, dependencies=[Depends(requiere_admin)])
async def actualizar_estado_productos(identificador_id: str, ident_update: schemas.IdentifacadorQRUpdate, db: Session = Depends(get_db)):
    return services.actualizar_ver_productos(db, identificador_id, ident_update)

# publico (sin login): lo consulta la vista que se abre con el QR
@router.get("/{identificador_id}/productos", response_model=List[producto_schemas.ProductoPublico])
def listar_productos_publicos(identificador_id: str, db: Session = Depends(get_db)):
    return services.listar_productos_publicos(db, identificador_id)
