import io
import json
from datetime import date, timedelta
from typing import Tuple
import qrcode
from sqlalchemy.orm import Session

from src.indentificadorDeQR import services as ident_services
from src.indentificadorDeQR.schemas import IdentificadorQRCreate
from src.qrCode import schemas
from qrcode import constants


def CrearCodigoQr(db:Session,quickResponse:schemas.QRCodeCreate,nuevo_identificador):

    
    base_url = quickResponse.texto
    
    if "?" in base_url:
        partes = base_url.split("?")
        contenido_qr = f"{partes[0]}/{nuevo_identificador.id_alfanumerico}?{partes[1]}"
    else:
        contenido_qr = f"{base_url}/{nuevo_identificador.id_alfanumerico}"

    qr=qrcode.QRCode(
        version=quickResponse.version,
        error_correction= constants.ERROR_CORRECT_H,
        box_size=quickResponse.box_size,
        border=quickResponse.boder
    )

    qr.add_data(contenido_qr)
    qr.make(fit=True)

    img=qr.make_image(fill_color=quickResponse.color_fill,back_color=quickResponse.color_back)
    buffer = io.BytesIO()  #creo un buffer para convertir la img en bytes
    img.save(buffer,format="PNG") #guarda la img en formato png en el buffer
    img_bytes= buffer.getvalue() #el getvalue extrae la imagen guardada en el buffer (lo extrae en forma de bytes)

    return img_bytes

