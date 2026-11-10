from fastapi import HTTPException, status


class CategoriaNoEncontrada(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría de incidente no encontrada.",
        )


class CategoriaNombreDuplicado(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una categoría de incidente con ese nombre.",
        )


class CategoriaNombreVacio(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de la categoría no puede estar vacío.",
        )


class CategoriaConIncidentes(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar la categoría porque tiene incidentes asociados.",
        )

