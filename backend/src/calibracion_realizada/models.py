from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from sqlalchemy import ForeignKey, String
from typing import Optional
from datetime import datetime



class Calibracion_Realizada(ModeloBase):

    __tablename__ = "Calibracion_Realizada"

    id: Mapped[int]=mapped_column(primary_key=True,index=True)
    fecha_d_realizacion: Mapped[datetime]= mapped_column(index=True)
    formato_archivo: Mapped[str] = mapped_column(String(500))
    plan_calibracion_id:Mapped[int]=mapped_column(ForeignKey("plan_de_calibracion.id"))

    plan_calibracion:Mapped["src.plan_de_calibracion.models.Plan_de_Calibracion"]= relationship("src.plan_de_calibracion.models.Plan_de_Calibracion", back_populates="calibraciones_realizadas")


    @property
    def nombre_plan_calibracion(self):
     return self.plan_calibracion.nombre