from datetime import date
from enum import Enum
from pydantic import BaseModel, ConfigDict


class OrigenVencimiento(str, Enum):
    PERSONAL = "personal"
    EQUIPO = "equipo"
    DOCUMENTO = "documento"


class EstadoVencimiento(str, Enum):
    VENCIDO = "vencido"
    PROXIMO = "proximo"
    VIGENTE = "vigente"


class VencimientoConsolidadoItem(BaseModel):
    id: str
    origen: OrigenVencimiento
    concepto: str
    responsable: str
    referencia_id: int
    fecha: date
    dias_restantes: int
    estado: EstadoVencimiento

    model_config = ConfigDict(from_attributes=True)

