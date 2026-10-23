from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class NotificacionBase(BaseModel):
    titulo: str
    mensaje: str
    tipo: str
    entidad_tipo: Optional[str] = None
    entidad_id: Optional[int] = None


class NotificacionCreate(NotificacionBase):
    usuario_id: int
    clave_duplicado: Optional[str] = None


class NotificacionOut(NotificacionBase):
    id: int
    usuario_id: int
    fecha: datetime
    leida: bool
    leida_el: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class NotificacionesListadoResponse(BaseModel):
    items: List[NotificacionOut]
    total_no_leidas: int
    total_registros: int


class MarcarTodasLeidasResponse(BaseModel):
    marcadas: int

