from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Any, List, Literal, Optional
from qrcode import constants

from src.indentificadorDeQR.schemas import IdentificadorQR



class QRCodeBASE(BaseModel):
    version:int
    box_size:int
    boder:int
    color_fill:str
    color_back:str
    texto:str
    ver_grafico:bool=True
    verAcercaDeNosotros:bool=True



class QRCodeCreate(QRCodeBASE):
    pass



class QRCode(QRCodeBASE):
    identificadorUnico: str
    model_config = ConfigDict(from_attributes=True)