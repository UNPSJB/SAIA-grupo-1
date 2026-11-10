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


class OctogonoItem(BaseModel):
    id: str
    texto: str
    tipo: str = "octogono"


class FilaTablaNutricional(BaseModel):
    nutriente: str
    por_100g: Optional[str] = None
    por_porcion: Optional[str] = None
    porcentaje_vd: Optional[str] = None
    es_subitem: bool = False


class BorradorRotuloUpdate(BaseModel):
    denominacion_venta: Optional[str] = None
    contenido_neto: Optional[str] = None
    rnpa_rppa: Optional[str] = None
    rne: Optional[str] = None
    razon_social: Optional[str] = None
    direccion_origen: Optional[str] = None
    pais_origen: Optional[str] = "Industria Argentina"
    es_importado: Optional[bool] = None
    razon_social_importador: Optional[str] = None
    domicilio_importador: Optional[str] = None
    lote: Optional[str] = None
    fecha_duracion: Optional[str] = None
    instrucciones_conservacion: Optional[str] = None
    modo_empleo: Optional[str] = None
    porcion: Optional[str] = None
    porciones_por_envase: Optional[str] = None
    valor_energetico_kcal: Optional[float] = None
    valor_energetico_kj: Optional[float] = None
    carbohidratos: Optional[float] = None
    azucares_totales: Optional[float] = None
    azucares_anadidos: Optional[float] = None
    proteinas: Optional[float] = None
    grasas_totales: Optional[float] = None
    grasas_saturadas: Optional[float] = None
    grasas_trans: Optional[float] = None
    fibra_alimentaria: Optional[float] = None
    sodio: Optional[float] = None
    tabla_marcada_incompleta: bool = False
    tiene_exceso_azucares: bool = False
    tiene_exceso_sodio: bool = False
    tiene_exceso_grasas_saturadas: bool = False
    tiene_exceso_grasas_totales: bool = False
    tiene_exceso_calorias: bool = False
    contiene_edulcorantes: bool = False
    contiene_cafeina: bool = False
    modo_calculo_octogonos: str = "automatico"
    lote_editado_manualmente: Optional[bool] = None
    ingredientes_editado_manualmente: Optional[bool] = None
    denominacion_editada_manualmente: Optional[bool] = None
    contenido_neto_editado_manualmente: Optional[bool] = None
    sellos_editados_manualmente: Optional[bool] = None
    tabla_editada_manualmente: Optional[bool] = None

class BorradorRotuloResponse(BaseModel):
    id: int
    producto_id: int
    producto_nombre: str
    denominacion_venta: Optional[str] = None
    contenido_neto: Optional[str] = None
    rnpa_rppa: Optional[str] = None
    rne: Optional[str] = None
    razon_social: Optional[str] = None
    direccion_origen: Optional[str] = None
    pais_origen: str = "Industria Argentina"
    es_importado: bool = False
    razon_social_importador: Optional[str] = None
    domicilio_importador: Optional[str] = None
    lote: Optional[str] = None
    fecha_duracion: Optional[str] = None
    instrucciones_conservacion: Optional[str] = None
    modo_empleo: Optional[str] = None
    lista_ingredientes_texto: Optional[str] = None
    tiene_lista_ingredientes: bool = False
    porcion: Optional[str] = None
    porciones_por_envase: Optional[str] = None
    valor_energetico_kcal: Optional[float] = None
    valor_energetico_kj: Optional[float] = None
    carbohidratos: Optional[float] = None
    azucares_totales: Optional[float] = None
    azucares_anadidos: Optional[float] = None
    proteinas: Optional[float] = None
    grasas_totales: Optional[float] = None
    grasas_saturadas: Optional[float] = None
    grasas_trans: Optional[float] = None
    fibra_alimentaria: Optional[float] = None
    sodio: Optional[float] = None
    tabla_marcada_incompleta: bool = False
    tiene_exceso_azucares: bool = False
    tiene_exceso_sodio: bool = False
    tiene_exceso_grasas_saturadas: bool = False
    tiene_exceso_grasas_totales: bool = False
    tiene_exceso_calorias: bool = False
    contiene_edulcorantes: bool = False
    contiene_cafeina: bool = False
    modo_calculo_octogonos: str = "automatico"
    lote_editado_manualmente: bool = False
    ingredientes_editado_manualmente: bool = False
    denominacion_editada_manualmente: bool = False
    contenido_neto_editado_manualmente: bool = False
    sellos_editados_manualmente: bool = False
    tabla_editada_manualmente: bool = False
    porcentaje_completitud: int = 0
    campos_obligatorios_totales: int = 0
    campos_obligatorios_completados: int = 0
    octogonos: List[OctogonoItem] = []
    tiene_octogonos: bool = False
    mensaje_octogonos: str
    datos_faltantes: List[str] = []
    tabla_nutricional_incompleta: bool = False
    motivos_tabla_incompleta: List[str] = []
    filas_tabla_nutricional: List[FilaTablaNutricional] = []
    leyenda_obligatoria: str
    es_completo_para_tramite: bool = False
    actualizado_el: datetime
    usuario_actualizacion: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AutocompletarBorradorRequest(BaseModel):
    campos: Optional[List[str]] = None


class ExportarBorradorRequest(BaseModel):
    incluir_leyenda: bool = True
    formato: Optional[str] = "html"


class ExportarBorradorResponse(BaseModel):
    producto_id: int
    producto_nombre: str
    contenido_html: str
    leyenda_incluida: bool
    timestamp: datetime


