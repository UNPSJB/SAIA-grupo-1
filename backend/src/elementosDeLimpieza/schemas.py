from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class ElementoDeLimpiezaBase(BaseModel):
    nombre: str = Field(min_length=1 ,max_length=20)
    frecuenciaDeCambio: Optional[float] = Field(default=None)

class ElementoDeLimpiezaCreate(ElementoDeLimpiezaBase):
    pass

class ElementoDeLimpiezaUpdate(ElementoDeLimpiezaBase):
    nombre: Optional[str] = Field(None, min_length=1, max_length=20)
    frecuenciaDeCambio: Optional[float] = None

class ElementoDeLimpieza(ElementoDeLimpiezaBase):
    id: int = Field(ge=0)

    model_config = ConfigDict(from_attributes=True)