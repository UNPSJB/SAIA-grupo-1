from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from src.documentos.constants import TipoDocumento

class VersionDocumentoResponse(BaseModel):
    id: int
    documento_id: int
    version: str
    archivo_nombre_original: str
    tamanio_bytes: int
    responsable_legajo: int
    nombre_responsable: Optional[str] = None
    archivado: bool
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
    total_versiones: int = 1

    model_config = ConfigDict(from_attributes=True)

class DocumentoListItem(BaseModel):
    id: int
    titulo: str
    tipo: TipoDocumento
    descripcion: Optional[str] = None
    activo: bool
    creado_el: datetime
    version_actual: Optional[str] = None
    version_actual_id: Optional[int] = None
    fecha_subida_actual: Optional[datetime] = None
    responsable_nombre: Optional[str] = None
    responsable_legajo: Optional[int] = None
    archivo_nombre_original: Optional[str] = None
    total_versiones: int = 1

    model_config = ConfigDict(from_attributes=True)
