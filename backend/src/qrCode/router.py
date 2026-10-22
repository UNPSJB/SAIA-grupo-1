import logging
from typing_extensions import Buffer
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from src.database import get_db
from src.qrCode import services,schemas
from src.indentificadorDeQR import services as ident
from src.indentificadorDeQR import schemas as ident_schemas


router=APIRouter(prefix="/quickCode", tags=["quickCode"])

@router.post("/")
async def createQR(quickResponse:schemas.QRCodeCreate,db: Session = Depends(get_db)):
    datos_ident = ident_schemas.IdentificadorQRCreate(
        urldelQR=quickResponse.texto,
        estado=True 
    )
    ident_data = ident.crear_IdentificadorUnico(db,datos_ident,urldelQR=quickResponse.texto)
    imagen=services.CrearCodigoQr(db,quickResponse,ident_data)
    return Response(content=imagen,media_type="image/png")


@router.get("/",response_model=schemas.QRCode)
async def getQR():
    return services.MostrarQR()