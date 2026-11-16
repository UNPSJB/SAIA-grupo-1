from typing import Optional

from pydantic import BaseModel, field_validator, model_validator

from src.configuracion.constants import ErrorCode


class ConfiguracionVistaPublica(BaseModel):
    """Estado actual de la vista pública; sin identificador activo, todo queda en falso."""

    habilitada: bool
    id_alfanumerico: Optional[str] = None
    urldelQR: Optional[str] = None
    ver_grafico: bool = False
    verAcercaDeNosotros: bool = False
    verProductos: bool = False


class ConfiguracionVistaPublicaUpdate(BaseModel):
    # habilitar requiere generar un QR (/quickCode); acá solo se puede deshabilitar
    habilitada: Optional[bool] = None
    ver_grafico: Optional[bool] = None
    verAcercaDeNosotros: Optional[bool] = None
    verProductos: Optional[bool] = None

    @field_validator("habilitada")
    @classmethod
    def solo_deshabilitar(cls, v: Optional[bool]) -> Optional[bool]:
        if v is True:
            raise ValueError(ErrorCode.HABILITAR_DESDE_QR)
        return v

    @model_validator(mode="after")
    def al_menos_un_cambio(self) -> "ConfiguracionVistaPublicaUpdate":
        if all(valor is None for valor in self.model_dump().values()):
            raise ValueError(ErrorCode.SIN_CAMBIOS)
        return self
