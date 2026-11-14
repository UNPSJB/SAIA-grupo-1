from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from src.database import get_db
from src.qrCode import services, schemas
from src.indentificadorDeQR import services as ident
from src.indentificadorDeQR import schemas as ident_schemas


router=APIRouter(prefix="/quickCode", tags=["quickCode"])

@router.post("/")
async def createQR(quickResponse:schemas.QRCodeCreate,db: Session = Depends(get_db)):
    datos_ident = ident_schemas.IdentificadorQRCreate(
        urldelQR=quickResponse.texto,
        estado=True,
        ver_grafico=quickResponse.ver_grafico,
        verAcercaDeNosotros=quickResponse.verAcercaDeNosotros,
        verProductos=quickResponse.verProductos,
        ver_dias_sin_incidentes=quickResponse.ver_dias_sin_incidentes,
        ver_total_lotes=quickResponse.ver_total_lotes,
        ver_volumen_fabricado=quickResponse.ver_volumen_fabricado,
        ver_producto_mas_elaborado=quickResponse.ver_producto_mas_elaborado,
        ver_grafico_totales_productos=quickResponse.ver_grafico_totales_productos,
        ver_grafico_red_arana=quickResponse.ver_grafico_red_arana,
    )
    ident_data = ident.crear_IdentificadorUnico(db,datos_ident,urldelQR=quickResponse.texto)
    imagen=services.CrearCodigoQr(db,quickResponse,ident_data)
    return Response(content=imagen,media_type="image/png",headers={"X-Identificador-Unico": str(ident_data.id_alfanumerico)})


@router.get("/",response_model=schemas.QRCode)
async def getQR():
    return services.MostrarQR()