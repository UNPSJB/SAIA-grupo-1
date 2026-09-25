from datetime import datetime
from typing import List

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class Plan_de_Limpieza(ModeloBase):

    __tablename__= "plan_de_limpieza"

    id:Mapped[int]=mapped_column(primary_key=True,index=True)
    nombre: Mapped[str] = mapped_column(String(20), index=True)
    equipo_id:Mapped[int]=mapped_column(ForeignKey("equipos.id"),unique=True)
    equipo:Mapped["src.equipos.models.Equipo"]= relationship("src.equipos.models.Equipo", back_populates="plan_de_Limpieza")
    tareas:Mapped[List["src.tareas.models.Tarea"]] = relationship("src.tareas.models.Tarea", back_populates="plan_de_limpieza")
    fecha_creacion:Mapped[datetime]= mapped_column(index=True)

    @property
    def nombre_equipo(self):
        return self.equipo.nombre