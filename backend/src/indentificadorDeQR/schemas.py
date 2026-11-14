from typing import Optional
from pydantic import BaseModel, ConfigDict




class IdentificadorQRBase(BaseModel):
    id_alfanumerico:str
    estado:bool
    urldelQR:str
    ver_grafico:bool
    verAcercaDeNosotros:bool
    verProductos:bool=False
    ver_dias_sin_incidentes:bool=False
    ver_total_lotes:bool=False
    ver_volumen_fabricado:bool=False
    ver_producto_mas_elaborado:bool=False
    ver_grafico_totales_productos:bool=False
    ver_grafico_red_arana:bool=False




class IdentificadorQRCreate(IdentificadorQRBase):
    id_alfanumerico:Optional[str]=None
    estado:Optional[bool]=None
    urldelQR:Optional[str]=None
    ver_grafico:Optional[bool]= False
    verAcercaDeNosotros:Optional[bool]=False
    verProductos:Optional[bool]=False
    ver_dias_sin_incidentes:Optional[bool]=False
    ver_total_lotes:Optional[bool]=False
    ver_volumen_fabricado:Optional[bool]=False
    ver_producto_mas_elaborado:Optional[bool]=False
    ver_grafico_totales_productos:Optional[bool]=False
    ver_grafico_red_arana:Optional[bool]=False


class IdentifacadorQRUpdate(BaseModel):
    estado: Optional[bool] = None
    ver_grafico: Optional[bool] = None
    verAcercaDeNosotros:Optional[bool]=None
    verProductos:Optional[bool]=None
    ver_dias_sin_incidentes:Optional[bool]=None
    ver_total_lotes:Optional[bool]=None
    ver_volumen_fabricado:Optional[bool]=None
    ver_producto_mas_elaborado:Optional[bool]=None
    ver_grafico_totales_productos:Optional[bool]=None
    ver_grafico_red_arana:Optional[bool]=None
    urldelQR: Optional[str] = None


class IdentificadorQR(IdentificadorQRBase):
    id_alfanumerico:str
    model_config = ConfigDict(from_attributes=True)