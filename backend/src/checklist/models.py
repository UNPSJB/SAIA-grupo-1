from datetime import date, datetime
from enum import StrEnum, auto
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from src.tareas.models import Frecuencia

if TYPE_CHECKING:
    from src.personal.models import Personal
    from src.plan_De_limpieza.models import Plan_de_Limpieza



class EstadoTareaItem(StrEnum):
    PENDIENTE = auto()
    REALIZADO = auto()
    NO_REALIZADO = auto()
    VENCIDO = auto()
    REASIGNADO = auto()


class MotivoNoRealizado(StrEnum):
    EQUIPO_FUERA_DE_USO = "equipo_fuera_de_uso"
    FALTA_DE_INSUMO = "falta_de_insumo"
    OTRO = "otro"


class EstadoGeneralChecklist(StrEnum):
    PENDIENTE = auto()
    COMPLETADO = auto()
    VENCIDO = auto()


DIAS_POR_FRECUENCIA = {
    Frecuencia.DIARIA: 1,
    Frecuencia.SEMANAL: 7,
    Frecuencia.MENSUAL: 30,
}


class Checklist(ModeloBase):
    __tablename__ = "checklists"
    # Cada operador tiene a lo sumo un checklist por día.
    __table_args__ = (UniqueConstraint("fecha", "responsable_legajo"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    fecha: Mapped[date] = mapped_column(Date, index=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    responsable_legajo: Mapped[int] = mapped_column(
        ForeignKey("personal.legajo"), index=True
    )
    tiene_reasignacion_no_leida: Mapped[bool] = mapped_column(
        Boolean, default=False, index=True
    )

    responsable: Mapped["Personal"] = relationship("Personal", lazy="joined")

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
        return sum(
            1
            for item in self.items
            if item.estado in (EstadoTareaItem.REALIZADO, EstadoTareaItem.REASIGNADO)
        )

    @property
    def tareas_reasignadas(self) -> int:
        return sum(
            1 for item in self.items if item.estado == EstadoTareaItem.REASIGNADO
        )

    @property
    def tareas_no_realizadas(self) -> int:
        return sum(1 for item in self.items if item.estado == EstadoTareaItem.NO_REALIZADO)

    @property
    def tareas_pendientes(self) -> int:
        return sum(1 for item in self.items if item.estado == EstadoTareaItem.PENDIENTE)

    @property
    def tareas_vencidas(self) -> int:
        return sum(1 for item in self.items if item.estado == EstadoTareaItem.VENCIDO)

    @property
    def porcentaje_cumplimiento(self) -> float:
        if self.total_tareas == 0:
            return 100.0
        return round((self.tareas_completadas / self.total_tareas) * 100.0, 1)

    @property
    def estado(self) -> EstadoGeneralChecklist:
        if self.total_tareas == 0 or (self.tareas_completadas + self.tareas_no_realizadas) == self.total_tareas:
            return EstadoGeneralChecklist.COMPLETADO

        for item in self.items:
            if item.estado == EstadoTareaItem.PENDIENTE:
                return EstadoGeneralChecklist.PENDIENTE

        return EstadoGeneralChecklist.VENCIDO


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
    descripcion_tarea: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    frecuencia: Mapped[Frecuencia] = mapped_column(index=True)

    _estado: Mapped[EstadoTareaItem] = mapped_column(
        "estado", default=EstadoTareaItem.PENDIENTE, index=True
    )

    @property
    def estado(self) -> EstadoTareaItem:
        if self._estado == EstadoTareaItem.PENDIENTE and self.checklist and self.checklist.fecha:
            fecha_ref = self.fecha_original or self.checklist.fecha
            dias_transcurridos = (date.today() - fecha_ref).days
            dias_limite = DIAS_POR_FRECUENCIA.get(self.frecuencia, 1)
            if dias_transcurridos >= dias_limite:
                return EstadoTareaItem.VENCIDO
        return self._estado

    @estado.setter
    def estado(self, value: EstadoTareaItem) -> None:
        self._estado = value
    responsable_legajo: Mapped[Optional[int]] = mapped_column(
        ForeignKey("personal.legajo", ondelete="SET NULL"), nullable=True, index=True
    )
    fecha_original: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    imagen: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    insumos_utilizados: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fecha_hora_fin: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    motivo_no_realizado: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, index=True
    )
    observacion_no_realizado: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    fecha_hora_no_realizado: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    es_reasignada: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    revisada_por_operador: Mapped[bool] = mapped_column(Boolean, default=True)
    tarea_origen_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("checklist_items.id", ondelete="SET NULL"), nullable=True
    )
    tarea_reemplazo_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("checklist_items.id", ondelete="SET NULL"), nullable=True
    )

    checklist: Mapped["Checklist"] = relationship("Checklist", back_populates="items")
    responsable: Mapped[Optional["Personal"]] = relationship("Personal", lazy="joined")
    plan: Mapped[Optional["Plan_de_Limpieza"]] = relationship("Plan_de_Limpieza", lazy="joined")
    historial: Mapped[List["ChecklistItemHistorial"]] = relationship(
        "ChecklistItemHistorial",
        back_populates="item",
        cascade="all, delete-orphan",
        order_by="ChecklistItemHistorial.id.asc()",
        lazy="selectin",
    )

    @property
    def nombre_responsable(self) -> Optional[str]:
        if self.responsable:
            return f"{self.responsable.nombre} {self.responsable.apellido}"
        return None

    @property
    def nombre_equipo(self) -> Optional[str]:
        if self.plan and self.plan.equipo:
            return self.plan.equipo.nombre
        if self.plan and self.plan.sector:
            return self.plan.sector.nombre
        return None

    @property
    def checklist_fecha(self) -> Optional[date]:
        return self.checklist.fecha if self.checklist else None

    @property
    def dias_restantes(self) -> Optional[int]:
        if self.checklist and self.checklist.fecha:
            fecha_ref = self.fecha_original or self.checklist.fecha
            dias_transcurridos = (date.today() - fecha_ref).days
            dias_limite = DIAS_POR_FRECUENCIA.get(self.frecuencia, 1)
            return max(0, dias_limite - dias_transcurridos)
        return None


class ChecklistItemHistorial(ModeloBase):
    __tablename__ = "checklist_item_historial"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    item_id: Mapped[int] = mapped_column(
        ForeignKey("checklist_items.id", ondelete="CASCADE"), index=True
    )
    fecha_hora: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    usuario_legajo: Mapped[Optional[int]] = mapped_column(
        ForeignKey("personal.legajo", ondelete="SET NULL"), nullable=True
    )
    usuario_nombre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    accion: Mapped[str] = mapped_column(String(50), index=True)
    detalle: Mapped[str] = mapped_column(Text)

    item: Mapped["ChecklistItem"] = relationship("ChecklistItem", back_populates="historial")


class ReasignacionPendiente(ModeloBase):
    __tablename__ = "reasignaciones_pendientes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    item_origen_id: Mapped[int] = mapped_column(
        ForeignKey("checklist_items.id", ondelete="CASCADE"), index=True
    )
    checklist_origen_id: Mapped[int] = mapped_column(
        ForeignKey("checklists.id", ondelete="CASCADE"), index=True
    )
    nuevo_responsable_legajo: Mapped[int] = mapped_column(
        ForeignKey("personal.legajo", ondelete="CASCADE"), index=True
    )
    plan_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("plan_de_limpieza.id", ondelete="SET NULL"), nullable=True, index=True
    )
    nombre_plan: Mapped[str] = mapped_column(String(50))
    tarea_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tareas.id", ondelete="SET NULL"), nullable=True, index=True
    )
    nombre_tarea: Mapped[str] = mapped_column(String(50))
    descripcion_tarea: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    frecuencia: Mapped[Frecuencia] = mapped_column(index=True)
    fecha_origen: Mapped[date] = mapped_column(Date, index=True)
    motivo: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    admin_legajo: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    admin_nombre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    anterior_responsable_nombre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    procesada: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    item_origen: Mapped["ChecklistItem"] = relationship(
        "ChecklistItem", foreign_keys=[item_origen_id]
    )
