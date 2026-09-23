from datetime import date, datetime
from enum import StrEnum, auto
from typing import List, Optional
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from src.tareas.models import Frecuencia


class EstadoTareaItem(StrEnum):
    PENDIENTE = auto()
    REALIZADO = auto()


class EstadoGeneralChecklist(StrEnum):
    PENDIENTE = auto()
    COMPLETADO = auto()
    VENCIDO = auto()


DIAS_POR_FRECUENCIA = {
    Frecuencia.DIARIO: 1,
    Frecuencia.SEMANAL: 7,
    Frecuencia.MENSUAL: 30,
}


class Checklist(ModeloBase):
    __tablename__ = "checklists"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    fecha: Mapped[date] = mapped_column(Date, index=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    responsable_legajo: Mapped[int] = mapped_column(
        ForeignKey("personal.legajo"), index=True
    )

    responsable: Mapped["src.personal.models.Personal"] = relationship(lazy="joined")

    items: Mapped[List["ChecklistItem"]] = relationship(
        "ChecklistItem",
        back_populates="checklist",
        cascade="all, delete-orphan",
        order_by="ChecklistItem.id",
        lazy="selectin",
    )

    @property
    def nombre_responsable(self) -> Optional[str]:
        if self.responsable:
            return f"{self.responsable.nombre} {self.responsable.apellido}"
        return None

    @property
    def total_tareas(self) -> int:
        return len(self.items)

    @property
    def tareas_completadas(self) -> int:
        return sum(1 for item in self.items if item.estado == EstadoTareaItem.REALIZADO)

    @property
    def tareas_pendientes(self) -> int:
        return self.total_tareas - self.tareas_completadas

    @property
    def porcentaje_cumplimiento(self) -> float:
        if self.total_tareas == 0:
            return 100.0
        return round((self.tareas_completadas / self.total_tareas) * 100.0, 1)

    @property
    def estado(self) -> EstadoGeneralChecklist:
        if self.total_tareas == 0 or self.tareas_completadas == self.total_tareas:
            return EstadoGeneralChecklist.COMPLETADO

        dias_transcurridos = (date.today() - self.fecha).days
        for item in self.items:
            if item.estado != EstadoTareaItem.REALIZADO:
                dias_limite = DIAS_POR_FRECUENCIA.get(item.frecuencia, 1)
                if dias_transcurridos >= dias_limite:
                    return EstadoGeneralChecklist.VENCIDO

        return EstadoGeneralChecklist.PENDIENTE


class ChecklistItem(ModeloBase):
    __tablename__ = "checklist_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    checklist_id: Mapped[int] = mapped_column(
        ForeignKey("checklists.id", ondelete="CASCADE"), index=True
    )

    plan_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("plan_de_limpieza.id", ondelete="SET NULL"), nullable=True, index=True
    )
    nombre_plan: Mapped[str] = mapped_column(String(50), index=True)

    tarea_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tareas.id", ondelete="SET NULL"), nullable=True, index=True
    )
    nombre_tarea: Mapped[str] = mapped_column(String(50), index=True)
    descripcion_tarea: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    frecuencia: Mapped[Frecuencia] = mapped_column(index=True)

    estado: Mapped[EstadoTareaItem] = mapped_column(
        default=EstadoTareaItem.PENDIENTE, index=True
    )
    responsable_legajo: Mapped[Optional[int]] = mapped_column(
        ForeignKey("personal.legajo", ondelete="SET NULL"), nullable=True, index=True
    )
    imagen: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    insumos_utilizados: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fecha_hora_fin: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    checklist: Mapped["Checklist"] = relationship("Checklist", back_populates="items")
    responsable: Mapped[Optional["src.personal.models.Personal"]] = relationship(lazy="joined")

    @property
    def nombre_responsable(self) -> Optional[str]:
        if self.responsable:
            return f"{self.responsable.nombre} {self.responsable.apellido}"
        return None
