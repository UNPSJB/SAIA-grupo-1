from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from src.models import ModeloBase


class IndentificadorUnico(ModeloBase):
    __tablename__="Identificador_UnicoDeQR"

    id_alfanumerico: Mapped[str]=mapped_column(String(37),index=True,primary_key=True)
    estado:Mapped[bool]=mapped_column(index=True)
    urldelQR:Mapped[str]
    ver_grafico : Mapped[bool]=mapped_column(index=True)
    verAcercaDeNosotros: Mapped[bool]=mapped_column(index=True)
    verProductos: Mapped[bool]=mapped_column(default=False)
    ver_dias_sin_incidentes: Mapped[bool] = mapped_column(default=False)
    ver_total_lotes: Mapped[bool] = mapped_column(default=False)
    ver_volumen_fabricado: Mapped[bool] = mapped_column(default=False)
    ver_producto_mas_elaborado: Mapped[bool] = mapped_column(default=False)
    ver_grafico_totales_productos: Mapped[bool] = mapped_column(default=False)
    ver_grafico_red_arana: Mapped[bool] = mapped_column(default=False)