from datetime import datetime

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase



class Plan_de_Calibracion(ModeloBase):

    __tablename__="plan_de_calibracion"

    id:Mapped[int]=mapped_column(primary_key=True,index=True)
    nombre:Mapped[str]= mapped_column(String(50),index=True)
    fecha_mantenimiento:Mapped[datetime]= mapped_column(index=True)
    fecha_vencimiento:Mapped[datetime]= mapped_column(index=True)
    periodicidad_De_cambio:Mapped[int]=mapped_column(Integer, nullable=True)
    descripcion:Mapped[str]

    equipo_id:Mapped[int]=mapped_column(ForeignKey("equipos.id"),unique=True)

    equipo:Mapped["src.equipos.models.Equipo"]= relationship("src.equipos.models.Equipo", back_populates="plan_de_calibracion")
    calibraciones_realizadas:Mapped[list["src.calibracion_realizada.models.Calibracion_Realizada"]]= relationship("src.calibracion_realizada.models.Calibracion_Realizada",back_populates="plan_calibracion")

    @property
    def nombre_equipo(self):
        return self.equipo.nombre