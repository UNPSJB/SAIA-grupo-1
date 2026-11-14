from pydantic import BaseModel, ConfigDict



class QRCodeBASE(BaseModel):
    version:int
    box_size:int
    boder:int
    color_fill:str
    color_back:str
    texto:str
    ver_grafico:bool=False
    verAcercaDeNosotros:bool=False
    verProductos:bool=False
    ver_dias_sin_incidentes:bool=False
    ver_total_lotes:bool=False
    ver_volumen_fabricado:bool=False
    ver_producto_mas_elaborado:bool=False
    ver_grafico_totales_productos:bool=False
    ver_grafico_red_arana:bool=False



class QRCodeCreate(QRCodeBASE):
    pass



class QRCode(QRCodeBASE):
    identificadorUnico: str
    model_config = ConfigDict(from_attributes=True)