from fastapi import HTTPException, status

class NutricionException(HTTPException):
    def __init__(self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=status_code, detail=detail)

class ProductoSinRecetaError(NutricionException):
    def __init__(self):
        super().__init__(
            detail="El producto no tiene una receta estructurada asociada para calcular la información nutricional.",
            status_code=status.HTTP_404_NOT_FOUND,
        )

class RecetaSinIngredientesError(NutricionException):
    def __init__(self):
        super().__init__(
            detail="La receta no contiene ingredientes para calcular la información nutricional.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

class RendimientoInvalidoError(NutricionException):
    def __init__(self):
        super().__init__(
            detail="El rendimiento final de la receta debe ser mayor a cero.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

class PorcionInvalidaError(NutricionException):
    def __init__(self):
        super().__init__(
            detail="El tamaño de la porción debe ser mayor a cero.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

class ParametroInvalidoError(NutricionException):
    def __init__(self, nutriente: str):
        super().__init__(
            detail=f"Parámetro no encontrado para el nutriente: {nutriente}",
            status_code=status.HTTP_404_NOT_FOUND,
        )
