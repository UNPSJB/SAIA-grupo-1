from pydantic import BaseModel, Field, ConfigDict, field_validator
from src.tipoDocumento import exceptions

class TipoDocumentoBase(BaseModel):
    nombre: str = Field(max_length=50)

    @field_validator("nombre")
    @classmethod
    def validar_nombre_no_vacio(cls, v: str) -> str:
        if not v.strip():
            raise exceptions.NombreVacio()
        return v.strip()

class TipoDocumentoCreate(TipoDocumentoBase):
    pass

class TipoDocumentoUpdate(TipoDocumentoBase):
    pass

class TipoDocumento(TipoDocumentoBase):
    id: int = Field(ge=0)

    model_config = ConfigDict(from_attributes=True)

