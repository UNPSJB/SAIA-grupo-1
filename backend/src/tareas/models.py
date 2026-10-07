from enum import StrEnum, auto
from typing import Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class Frecuencia(StrEnum):
    DIARIA=auto()
    SEMANAL=auto()
    MENSUAL=auto()
    
class Tarea(ModeloBase):

    __tablename__="tareas"

    id:Mapped[int]=mapped_column(primary_key=True,index=True)
    nombre:Mapped[str]= mapped_column(String(50),index=True)
    descripcion:Mapped[str]= mapped_column(index=True)
    frecuencia:Mapped[Frecuencia] = mapped_column(index=True)
    plan_id:Mapped[int]=mapped_column(ForeignKey("plan_de_limpieza.id"))
    # quien tiene asignada la tarea: es a quien le aparece al generar su checklist
    responsable_legajo:Mapped[Optional[int]]=mapped_column(ForeignKey("personal.legajo"), nullable=True, index=True)

    plan_de_limpieza:Mapped["src.plan_De_limpieza.models.Plan_de_Limpieza"]= relationship("src.plan_De_limpieza.models.Plan_de_Limpieza", back_populates="tareas")
    responsable:Mapped[Optional["src.personal.models.Personal"]]= relationship("src.personal.models.Personal", lazy="joined")

    @property
    def nombre_responsable(self):
        if self.responsable:
            return f"{self.responsable.nombre} {self.responsable.apellido}"
        return None

    @property
    def nombre_plan(self):
        return self.plan_de_limpieza.nombre