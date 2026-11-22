from datetime import date, datetime
import re
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.utils import exceptions



class PdfBase(BaseModel):
    encabezado:Optional[str]= None
    logo:Optional[str] = None
    pie_dePagina:Optional[str]=None
    tipo_letra:Optional[str] = None

    @field_validator("encabezado", "pie_dePagina")
    @classmethod
    def validar_descripcion(cls, v:Optional[str]) -> Optional[str]:
            if v is None:
              return None
            if v and re.match(r"^[a-zA-ZÁÉÍÓÚáéíóúÑñ0-9\s°.,-]+$", v):  #este RE le permite al usuario ingresar comas, puntos numeros y espacios
                return v
            raise exceptions.Vacio()


class PdfUpdate(PdfBase):
    pass


class PdfResponse(PdfBase):
    id: int
    model_config = ConfigDict(from_attributes=True)