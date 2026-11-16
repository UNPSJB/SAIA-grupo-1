from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from src.rotulado.models import FormatoDeclaracionAditivos


class ItemIngredienteBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    denominacion_rotulo: Optional[str] = Field(default=None, max_length=150)
    porcentaje: float = Field(gt=0, le=100)
    es_aditivo: bool = False
    funcion: Optional[str] = Field(default=None, max_length=80)
    numero_ins: Optional[str] = Field(default=None, max_length=20)
    es_aromatizante: bool = False

    @field_validator("nombre", "denominacion_rotulo", "funcion", "numero_ins", mode="before")
    @classmethod
    def limpiar_espacios(cls, v: Optional[str]) -> Optional[str]:
        if isinstance(v, str):
            v_limpio = " ".join(v.split())
            return v_limpio if v_limpio else None
        return v


class ItemIngredienteCreate(ItemIngredienteBase):
    pass


class ItemIngredienteResponse(ItemIngredienteBase):
    id: int
    orden: int
    texto_declaracion: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ListaIngredientesCreate(BaseModel):
    formato_aditivos: Optional[FormatoDeclaracionAditivos] = (
        FormatoDeclaracionAditivos.INS_Y_NOMBRE
    )
    items: List[ItemIngredienteCreate]
    ajustado_manualmente: bool = False


class ReordenarItemsManual(BaseModel):
    item_ids: List[int] = Field(min_length=1)


class FormatoAditivosUpdate(BaseModel):
    formato_aditivos: FormatoDeclaracionAditivos


class PrevisualizarOrdenRequest(BaseModel):
    formato_aditivos: Optional[FormatoDeclaracionAditivos] = (
        FormatoDeclaracionAditivos.INS_Y_NOMBRE
    )
    items: List[ItemIngredienteCreate]


class PrevisualizarOrdenResponse(BaseModel):
    formato_aditivos: FormatoDeclaracionAditivos
    texto_rotulo: str
    items: List[ItemIngredienteResponse]


class ListaIngredientesResponse(BaseModel):
    id: int
    producto_id: int
    producto_nombre: str
    formato_aditivos: FormatoDeclaracionAditivos
    ajustado_manualmente: bool
    fecha_ajuste_manual: Optional[datetime] = None
    usuario_ajuste_manual: Optional[str] = None
    texto_rotulo: Optional[str] = None
    actualizado_el: datetime
    items: List[ItemIngredienteResponse]

    model_config = ConfigDict(from_attributes=True)


class RotuloIngredientesE13Response(BaseModel):
    producto_id: int
    producto_nombre: str
    disponible: bool
    ajustado_manualmente: bool = False
    formato_aditivos: FormatoDeclaracionAditivos = (
        FormatoDeclaracionAditivos.INS_Y_NOMBRE
    )
    texto_rotulo: Optional[str] = None
    items: List[ItemIngredienteResponse] = []

