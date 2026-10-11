from src.exceptions import BadRequest, NotFound, PermissionDenied

class DocumentoNoEncontrado(NotFound):
    DETAIL = "Documento no encontrado"

class VersionNoEncontrada(NotFound):
    DETAIL = "Versión no encontrada"

class ArchivoNoEncontrado(NotFound):
    DETAIL = "Archivo del documento no encontrado"

class FormatoArchivoInvalido(BadRequest):
    DETAIL = "El archivo debe ser un documento PDF válido"

class ArchivoVacio(BadRequest):
    DETAIL = "El archivo cargado está vacío"

class ArchivoDemasiadoGrande(BadRequest):
    DETAIL = "El archivo excede el tamaño máximo permitido de 20 MB"

class VersionDuplicada(BadRequest):
    DETAIL = "Ya existe esa versión para el documento indicado"

class SoloAdministradorPuedeSubir(PermissionDenied):
    DETAIL = "Solo una persona con permiso de administrar puede subir documentos o nuevas versiones"

class ResponsableNoEncontrado(BadRequest):
    DETAIL = "El responsable asignado no existe"

class ResponsableInactivo(BadRequest):
    DETAIL = "El responsable asignado no se encuentra activo"
