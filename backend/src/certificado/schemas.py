from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
from datetime import datetime, timedelta
from src.certificado import exceptions

class CertificadoBase(BaseModel):
    id_tipo: int = Field(ge=0)
    fechaVencimiento: datetime
    
class CertificadoCreate(CertificadoBase):
    foto_url: Optional[str] = None
    legajo_persona: int = Field(ge=0)

    @field_validator("fechaVencimiento")
    @classmethod
    def validar_fecha_vencimiento(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None:
            # Si viene con zona horaria, se la quitamos para poder comparar
            fecha_comparar = v.replace(tzinfo=None) if v.tzinfo is not None else v
                
            manana = (datetime.now() + timedelta(days=15)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
                
            if fecha_comparar < manana:
                raise exceptions.FechaVencimientoInvalida()
        
        return v

class CertificadoUpdate(CertificadoBase):
    id_tipo: Optional[int] = None
    fechaVencimiento: Optional[datetime] = None
    foto_url: Optional[str] = None

    @field_validator("fechaVencimiento")
    @classmethod
    def validar_fecha_vencimiento(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None:
            # Si viene con zona horaria, se la quitamos para poder comparar
            fecha_comparar = v.replace(tzinfo=None) if v.tzinfo is not None else v
                
            manana = (datetime.now() + timedelta(days=15)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
                
            if fecha_comparar < manana:
                raise exceptions.FechaVencimientoInvalida()
                    
        return v

class Certificado(CertificadoBase):
    id: int
    legajo_persona: int
    foto_url: Optional[str] = None

    tipo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)