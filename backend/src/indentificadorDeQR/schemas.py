from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Any, List, Literal, Optional




class IdentificadorQRBase(BaseModel):
    id_alfanumerico:str
    estado:bool
    urldelQR:str
    ver_grafico:bool
    verAcercaDeNosotros:bool




class IdentificadorQRCreate(IdentificadorQRBase):
    id_alfanumerico:Optional[str]=None
    estado:Optional[bool]=None
    urldelQR:Optional[str]=None
    ver_grafico:Optional[bool]= True
    verAcercaDeNosotros:Optional[bool]=True


class IdentifacadorQRUpdate(BaseModel):
    estado: Optional[bool] = None
    ver_grafico: Optional[bool] = None
    verAcercaDeNosotros:Optional[bool]=None
    urldelQR: Optional[str] = None


class IdentificadorQR(IdentificadorQRBase):
    id_alfanumerico:str
    model_config = ConfigDict(from_attributes=True)