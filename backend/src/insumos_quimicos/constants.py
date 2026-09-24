from enum import Enum

class TipoQuimicoEnum(str, Enum):
    DETERGENTE = "DETERGENTE"
    DESINFECTANTE = "DESINFECTANTE"
    DESENGRASANTE = "DESENGRASANTE"
    SANITIZANTE = "SANITIZANTE"
    OTRO = "OTRO"

class UnidadMedidaEnum(str, Enum):
    LITROS = "L"
    MILILITROS = "ML"
    KILOGRAMOS = "KG"
    GRAMOS = "G"
    UNIDADES = "UN"