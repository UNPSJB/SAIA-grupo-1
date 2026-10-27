import logging
from fastapi.responses import RedirectResponse
from typing_extensions import Buffer
from fastapi import APIRouter, Depends, HTTPException, Response
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
async def actualizar_estado_grafico(
    identificador_id: str, 
    ident_update: schemas.IdentifacadorQRUpdate, 
    db: Session = Depends(get_db)
):
    return services.actualizar_ver_grafico(db, identificador_id, ident_update)