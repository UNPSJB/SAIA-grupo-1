from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Any, List, Literal, Optional




class IdentificadorQRBase(BaseModel):
    id_alfanumerico:str
    estado:bool
    urldelQR:str




class IdentificadorQRCreate(IdentificadorQRBase):
    id_alfanumerico:Optional[str]=None
    estado:Optional[bool]=None
    urldelQR:Optional[str]=None


class IdentifacadorQRUpdate(IdentificadorQRBase):
    estado:Optional[bool] = None


class IdentificadorQR(IdentificadorQRBase):
    id_alfanumerico:str
    model_config = ConfigDict(from_attributes=True)