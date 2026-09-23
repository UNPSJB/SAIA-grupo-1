class InsumoQuimicoException(Exception):
    """Excepción base para insumos químicos."""
    pass

class InsumoQuimicoNotFoundException(InsumoQuimicoException):
    def __init__(self, insumo_id: int):
        super().__init__(f"El insumo químico con ID {insumo_id} no fue encontrado.")

class InsumoQuimicoDuplicateNameException(InsumoQuimicoException):
    def __init__(self, nombre: str):
        super().__init__(f"Ya existe un insumo químico registrado con el nombre '{nombre}'.")

class InsumoQuimicoInvalidStockException(InsumoQuimicoException):
    def __init__(self):
        super().__init__("El stock no puede ser menor a cero.")