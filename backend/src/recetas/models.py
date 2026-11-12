from datetime import date, datetime
from enum import StrEnum, auto
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.insumos.models import Insumo
from src.models import ModeloBase
from src.personal.models import Personal

class EstadoEtapaRecetaItem(StrEnum):
    PENDIENTE = auto()
    REALIZADO = auto()
    NO_REALIZADO = auto()
    VENCIDO = auto()

class EstadoGeneralRecetaChecklist(StrEnum):
    PENDIENTE = auto()
    COMPLETADO = auto()
    VENCIDO = auto()

class CLASE_FUNCIONAL(StrEnum):
    CONSERVANTE = auto()
    ANTIOXIDANTE = auto()
    COLORANTE = auto()
    EDULCORANTES = auto()

class Receta(ModeloBase):

    __tablename__="recetas"

    id:Mapped[int]=mapped_column(primary_key=True,index=True)
    nombre:Mapped[str]= mapped_column(String(50),index=True)
    rendimiento_final:Mapped[float]= mapped_column(index=True)
    fecha_creacion:Mapped[datetime]= mapped_column(DateTime, default=datetime.now, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    versiones: Mapped[List["VersionReceta"]] = relationship(
            "VersionReceta",
            back_populates="receta",
            foreign_keys="[VersionReceta.receta_id]",
            cascade="all, delete-orphan",
            order_by="desc(VersionReceta.id)",
        )


    @property
    def version_vigente(self) -> Optional["VersionReceta"]:
        hoy = date.today()
        for v in self.versiones:
            if v.es_vigente:
                if v.fecha_vencimiento:
                    vencimiento_date = v.fecha_vencimiento.date() if isinstance(v.fecha_vencimiento, datetime) else v.fecha_vencimiento
                    if vencimiento_date < hoy:
                        return None
                return v
        return None
    
    @property
    def ultima_version_vigente(self) -> Optional["VersionReceta"]:
            for v in self.versiones:
                if v.es_vigente:
                    return v
            for v in self.versiones:
                if v.fecha_vencimiento:
                    return v
            return self.versiones[0] if self.versiones else None
    
    @property
    def version_actual(self) -> Optional["VersionReceta"]:
            return self.version_vigente or (self.versiones[0] if self.versiones else None)

    @property
    def detalles(self) -> List["RecetaDetalle"]:
        v = self.version_actual
        return v.detalles if v else []
    
class VersionReceta(ModeloBase):
        __tablename__ = "versiones_receta"
    
        id: Mapped[int] = mapped_column(primary_key=True, index=True)
        receta_id: Mapped[int] = mapped_column(ForeignKey("recetas.id"), index=True, nullable=False)
        version: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
        
        # Guardamos el rendimiento y unidad de venta en la versión para que el historial sea exacto
        rendimiento_final: Mapped[float] = mapped_column(Float, nullable=False)
        #unidad_venta: Mapped[str] = mapped_column(String(50), nullable=False)

        archivado: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
        es_vigente: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
        
        fecha_vigencia: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, index=True)
        fecha_vencimiento: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, index=True)
        #fecha_archivo: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, index=True)
        
        creado_por_legajo: Mapped[Optional[int]] = mapped_column(ForeignKey("personal.legajo"), nullable=True, index=True)
        creado_por_usuario: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
        creado_el: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)


        detalles: Mapped[List["RecetaDetalle"]] = relationship(
                    "RecetaDetalle",
                    back_populates="version_receta",
                    foreign_keys="[RecetaDetalle.version_receta_id]",
                    cascade="all, delete-orphan",
                )
    
        receta: Mapped["Receta"] = relationship(
            "Receta",
            back_populates="versiones",
            foreign_keys=[receta_id],
        )
        creado_por: Mapped[Optional["Personal"]] = relationship(
            "Personal",
            foreign_keys=[creado_por_legajo],
        )
    
        @property
        def usuario(self) -> str:
            if self.creado_por:
                u = getattr(self.creado_por, "usuario", None)
                if u:
                    return u
                return f"{self.creado_por.nombre} {self.creado_por.apellido}".strip()
            if self.creado_por_usuario:
                return self.creado_por_usuario
            return "admin"
    
       


class RecetaDetalle(ModeloBase):
    __tablename__ = "recetas_detalle"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    version_receta_id: Mapped[int] = mapped_column(ForeignKey("versiones_receta.id"), index=True, nullable=False)
    ingrediente_id: Mapped[int] = mapped_column(ForeignKey("insumos.id"), index=True, nullable=False)
    cantidad: Mapped[float] = mapped_column(index=True, nullable=False)
    unidad_medida: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    es_aditivo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    clase_funcional: Mapped[Optional[CLASE_FUNCIONAL]] = mapped_column(index=True,nullable=True)
    numero_ins: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    operario_legajo: Mapped[int] = mapped_column(ForeignKey("personal.legajo"))
    descripcion_pasos: Mapped[str]
# x unidad de medida por rendimiento final de la receta 
    version_receta: Mapped["VersionReceta"] = relationship(
        "VersionReceta",
        back_populates="detalles",
        foreign_keys=[version_receta_id]
    )

    ingrediente: Mapped["Insumo"] = relationship(
        "Insumo",
        foreign_keys=[ingrediente_id],
    )

    operario: Mapped["Personal"] = relationship(
         "Personal",
         back_populates="recetas_detalles",
         foreign_keys=[operario_legajo]
         )


    @property
    def nombre_operario(self) -> str:
        if self.operario:
            return f"{self.operario.nombre} {self.operario.apellido}".strip()
        return "Desconocido"
    @property
    def nombre_ingrediente(self) -> str:
        if self.ingrediente:
            return self.ingrediente.nombre
        return "Desconocido"


class ChecklistReceta(ModeloBase):
    __tablename__ = "checklist_receta"
    __table_args__ = (UniqueConstraint("fecha", "responsable_legajo"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    fecha: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    responsable_legajo: Mapped[int] = mapped_column(
        ForeignKey("personal.legajo"), index=True, nullable=False
    )

    responsable: Mapped["Personal"] = relationship("Personal", lazy="joined")

    items: Mapped[List["ChecklistRecetaItem"]] = relationship(
        "ChecklistRecetaItem",
        back_populates="checklist",
        cascade="all, delete-orphan",
        order_by="ChecklistRecetaItem.id",
        lazy="selectin",
    )

    @property
    def nombre_responsable(self) -> Optional[str]:
        if self.responsable:
            return f"{self.responsable.nombre} {self.responsable.apellido}".strip()
        return None

    @property
    def total_etapas(self) -> int:
        return len(self.items)

    @property
    def etapas_completadas(self) -> int:
        return sum(1 for item in self.items if item.estado == EstadoEtapaRecetaItem.REALIZADO)

    @property
    def etapas_no_realizadas(self) -> int:
        return sum(1 for item in self.items if item.estado == EstadoEtapaRecetaItem.NO_REALIZADO)

    @property
    def etapas_pendientes(self) -> int:
        return sum(1 for item in self.items if item.estado == EstadoEtapaRecetaItem.PENDIENTE)

    @property
    def etapas_vencidas(self) -> int:
        return sum(1 for item in self.items if item.estado == EstadoEtapaRecetaItem.VENCIDO)

    @property
    def porcentaje_cumplimiento(self) -> float:
        if self.total_etapas == 0:
            return 100.0
        return round((self.etapas_completadas / self.total_etapas) * 100.0, 1)

    @property
    def estado(self) -> EstadoGeneralRecetaChecklist:
        if self.total_etapas == 0 or (self.etapas_completadas + self.etapas_no_realizadas) == self.total_etapas:
            return EstadoGeneralRecetaChecklist.COMPLETADO

        for item in self.items:
            if item.estado == EstadoEtapaRecetaItem.PENDIENTE:
                return EstadoGeneralRecetaChecklist.PENDIENTE

        return EstadoGeneralRecetaChecklist.VENCIDO


class ChecklistRecetaItem(ModeloBase):
    __tablename__ = "checklist_receta_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    checklist_id: Mapped[int] = mapped_column(
        ForeignKey("checklist_receta.id", ondelete="CASCADE"), index=True, nullable=False
    )

   
    receta_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("recetas.id", ondelete="SET NULL"), nullable=True, index=True
    )
    version_receta_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("versiones_receta.id", ondelete="SET NULL"), nullable=True, index=True
    )
    nombre_receta: Mapped[str] = mapped_column(String(50), index=True)

  
    detalle_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("recetas_detalle.id", ondelete="SET NULL"), nullable=True, index=True
    )
    nombre_etapa: Mapped[str] = mapped_column(String(50), index=True) 
    descripcion_pasos: Mapped[str] = mapped_column(Text, nullable=False)
    
   
    ingrediente_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("insumos.id", ondelete="SET NULL"), nullable=True
    )
    cantidad: Mapped[float] = mapped_column(Float, nullable=False)
    unidad_medida: Mapped[str] = mapped_column(String(20), nullable=False)

    
    _estado: Mapped[EstadoEtapaRecetaItem] = mapped_column(
        "estado", default=EstadoEtapaRecetaItem.PENDIENTE, index=True
    )

    @property
    def estado(self) -> EstadoEtapaRecetaItem:
        # Como es diario (sin frecuencia), si pasa el día del checklist y sigue PENDIENTE, queda VENCIDO
        if self._estado == EstadoEtapaRecetaItem.PENDIENTE and self.checklist and self.checklist.fecha:
            if (date.today() - self.checklist.fecha).days >= 1:
                return EstadoEtapaRecetaItem.VENCIDO
        return self._estado

    @estado.setter
    def estado(self, value: EstadoEtapaRecetaItem) -> None:
        self._estado = value

    responsable_legajo: Mapped[Optional[int]] = mapped_column(
        ForeignKey("personal.legajo", ondelete="SET NULL"), nullable=True, index=True
    )
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fecha_hora_fin: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    motivo_no_realizado: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    observacion_no_realizado: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fecha_hora_no_realizado: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    checklist: Mapped["ChecklistReceta"] = relationship("ChecklistReceta", back_populates="items")
    responsable: Mapped[Optional["Personal"]] = relationship("Personal", lazy="joined")
    ingrediente: Mapped[Optional["Insumo"]] = relationship("Insumo", lazy="joined")

    @property
    def nombre_responsable(self) -> Optional[str]:
        if self.responsable:
            return f"{self.responsable.nombre} {self.responsable.apellido}".strip()
        return None

    @property
    def nombre_ingrediente(self) -> Optional[str]:
        if self.ingrediente:
            return self.ingrediente.nombre
        return None