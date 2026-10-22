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

    
    BASE_URL_VERIFICACION = "http://192.168.1.42:8000/identificadorQR/verificar"
    
    contenido_qr = f"{BASE_URL_VERIFICACION}/{nuevo_identificador.id_alfanumerico}"

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

