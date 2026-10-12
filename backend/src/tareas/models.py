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
    # Operador que la ejecuta: la tarea aparece solo en el checklist de esta persona.
    operador_legajo:Mapped[int]=mapped_column(ForeignKey("personal.legajo"), index=True)

    plan_de_limpieza:Mapped["src.plan_De_limpieza.models.Plan_de_Limpieza"]= relationship("src.plan_De_limpieza.models.Plan_de_Limpieza", back_populates="tareas")
    operador:Mapped["src.personal.models.Personal"]= relationship("src.personal.models.Personal", lazy="joined")

    @property
    def nombre_plan(self):
        return self.plan_de_limpieza.nombre

    @property
    def nombre_operador(self) -> Optional[str]:
        if self.operador:
            return f"{self.operador.nombre} {self.operador.apellido}"
        return None
