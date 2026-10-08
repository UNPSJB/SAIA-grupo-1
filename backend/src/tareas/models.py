from enum import StrEnum, auto

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
    personal_id:Mapped[int] = mapped_column(ForeignKey("personal.legajo"), index=True)
    personal:Mapped["src.personal.models.Personal"]=relationship("src.personal.models.Personal",back_populates="tareas")

    plan_de_limpieza:Mapped["src.plan_De_limpieza.models.Plan_de_Limpieza"]= relationship("src.plan_De_limpieza.models.Plan_de_Limpieza", back_populates="tareas")

    @property
    def nombre_plan(self):
        return self.plan_de_limpieza.nombre

    @property
    def nombre_personal(self):
        return f"{self.personal.nombre} {self.personal.apellido}"