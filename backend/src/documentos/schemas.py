from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from src.documentos.constants import TipoDocumento

class VersionDocumentoResponse(BaseModel):
    id: int
    documento_id: int
    version: int
    archivo_nombre_original: str
    tamanio_bytes: int
    archivado: bool
    es_vigente: bool = False
    fecha_vigencia: Optional[date] = None
    creado_el: datetime
    url_descarga: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class DocumentoResponse(BaseModel):
    id: int
    titulo: str
    tipo: TipoDocumento
    descripcion: Optional[str] = None
    activo: bool
    creado_el: datetime
    version_actual: Optional[VersionDocumentoResponse] = None
    version_vigente: Optional[VersionDocumentoResponse] = None
    total_versiones: int = 1

    model_config = ConfigDict(from_attributes=True)

class DocumentoListItem(BaseModel):
    id: int
    titulo: str
    tipo: TipoDocumento
    descripcion: Optional[str] = None
    activo: bool
    creado_el: datetime
    version_actual: Optional[int] = None
    version_actual_id: Optional[int] = None
    fecha_subida_actual: Optional[datetime] = None
    archivo_nombre_original: Optional[str] = None
    es_vigente: bool = False
    fecha_vigencia: Optional[date] = None
    total_versiones: int = 1

    model_config = ConfigDict(from_attributes=True)

class MarcarVigenteRequest(BaseModel):
    fecha_vigencia: date
