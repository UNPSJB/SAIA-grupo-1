from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase




class AcercaDeNosotros(ModeloBase):
    __tablename__="acerca_De_nosotros"

    id:Mapped[int]=mapped_column(primary_key=True,index=True)
    descripcion:Mapped[str]=mapped_column(String(400),index=True)