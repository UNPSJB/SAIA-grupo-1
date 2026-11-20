from datetime import date, datetime, timedelta
from enum import StrEnum, auto
import json
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.insumos.models import Insumo
from src.tipoInsumo.models import TipoInsumo, Aditivo
from src.models import ModeloBase
from src.personal.models import Personal
import src.unidadesMedida.models

if TYPE_CHECKING:
    from src.producto.models import Producto
    from src.unidadesMedida.models import UnidadMedida


def _resolver_id_unidad_base(val: object) -> int:
    v_str = (val.value if hasattr(val, "value") else str(val or "")).strip().lower()
    if v_str in ("g", "gr", "gramo", "gramos"):
        return 2
    if v_str in ("l", "lt", "litro", "litros"):
        return 3
    if v_str in ("ml", "cc", "mililitro", "mililitros"):
        return 4
    if v_str in ("u", "un", "unid", "unidad", "unidades"):
        return 5
    return 1

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
    AROMATIZANTE = auto()
    LEUDANTE = auto()
    EMULSIONANTE = auto()
    ACIDULANTE = auto()
    ESTABILIZANTE = auto()
    ESPESANTE = auto()
    HUMECTANTE = auto()
    REGULADOR_ACIDEZ = auto()

class Receta(ModeloBase):

    __tablename__="recetas"

    id:Mapped[int]=mapped_column(primary_key=True,index=True)
    nombre:Mapped[str]= mapped_column(String(50),index=True)
    rendimiento_final:Mapped[float]= mapped_column(index=True)
    tiempo_maximo_dias: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    fecha_creacion:Mapped[datetime]= mapped_column(DateTime, default=datetime.now, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    operario_legajo: Mapped[int] = mapped_column(ForeignKey("personal.legajo"))

    versiones: Mapped[List["VersionReceta"]] = relationship(
            "VersionReceta",
            back_populates="receta",
            foreign_keys="[VersionReceta.receta_id]",
            cascade="all, delete-orphan",
            order_by="desc(VersionReceta.id)",
        )
    producto: Mapped["Producto"] = relationship("Producto",back_populates="receta",order_by="desc(Producto.id)")

    id_producto:Mapped[int] = mapped_column(ForeignKey("productos.id"))
    operario: Mapped["Personal"] = relationship(
             "Personal",
             back_populates="receta",
             foreign_keys=[operario_legajo]
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

    @property
    def nombre_operario(self) -> str:
            if self.operario:
                return f"{self.operario.nombre} {self.operario.apellido}".strip()
            return "Desconocido"

    @property
    def nombre_producto(self) -> str:
        if self.producto:
            return self.producto.nombre
        return "Desconocido"
    
class VersionReceta(ModeloBase):
        __tablename__ = "versiones_receta"
    
        id: Mapped[int] = mapped_column(primary_key=True, index=True)
        receta_id: Mapped[int] = mapped_column(ForeignKey("recetas.id"), index=True, nullable=False)
        version: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
        
        rendimiento_final: Mapped[float] = mapped_column(Float, nullable=False)
        tiempo_maximo_dias: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

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
    tipo_insumo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("tipos_insumos.id"), index=True, nullable=True)
    aditivo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("aditivos.id"), index=True, nullable=True)
    cantidad: Mapped[float] = mapped_column(index=True, nullable=False)
    unidad_medida_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("unidades_medida.id"), index=True, nullable=False, default=1
    )
    es_aditivo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    clase_funcional: Mapped[Optional[str]] = mapped_column(String(100), index=True, nullable=True)
    numero_ins: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    descripcion_pasos: Mapped[str]
    parametros_control_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default=None)

    version_receta: Mapped["VersionReceta"] = relationship(
        "VersionReceta",
        back_populates="detalles",
        foreign_keys=[version_receta_id]
    )

    unidad_medida_rel: Mapped["UnidadMedida"] = relationship(
        "src.unidadesMedida.models.UnidadMedida", lazy="joined"
    )
    tipo_insumo: Mapped[Optional["TipoInsumo"]] = relationship(
        "TipoInsumo",
        foreign_keys=[tipo_insumo_id],
        lazy="joined",
    )
    aditivo: Mapped[Optional["Aditivo"]] = relationship(
        "Aditivo",
        foreign_keys=[aditivo_id],
        lazy="joined",
    )

    @property
    def unidad_medida(self) -> str:
        if self.unidad_medida_rel:
            return self.unidad_medida_rel.nombre.lower()
        return getattr(self, "_unidad_medida_fallback", "kilogramos")

    @unidad_medida.setter
    def unidad_medida(self, val: object) -> None:
        v_str = val.value if hasattr(val, "value") else str(val or "kilogramos")
        self._unidad_medida_fallback = v_str.lower()
        self.unidad_medida_id = _resolver_id_unidad_base(val)

    @property
    def unidad_medida_nombre(self) -> str:
        if self.unidad_medida_rel:
            return self.unidad_medida_rel.nombre
        return ""

    @property
    def unidad_medida_abreviatura(self) -> str:
        if self.unidad_medida_rel:
            return self.unidad_medida_rel.abreviatura
        return ""

    @property
    def nombre_ingrediente(self) -> str:
        if self.tipo_insumo:
            return self.tipo_insumo.nombre
        if self.aditivo:
            return self.aditivo.nombre
        return "Desconocido"

    @property
    def parametros_control(self) -> list:
        if not self.parametros_control_json:
            return []
        try:
            data = json.loads(self.parametros_control_json)
            return data if isinstance(data, list) else []
        except Exception:
            return []


class ChecklistReceta(ModeloBase):
    __tablename__ = "checklist_receta"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    fecha: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    responsable_legajo: Mapped[int] = mapped_column(
        ForeignKey("personal.legajo"), index=True, nullable=False
    )
    id_producto: Mapped[Optional[int]] = mapped_column(ForeignKey("productos.id"), index=True, nullable=True)
    receta_id: Mapped[Optional[int]] = mapped_column(ForeignKey("recetas.id"), index=True, nullable=True)
    version_receta_id: Mapped[Optional[int]] = mapped_column(ForeignKey("versiones_receta.id"), index=True, nullable=True)
    cantidad_objetivo: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    tiempo_maximo_dias: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    lote_produccion_id: Mapped[Optional[int]] = mapped_column(ForeignKey("lotes_produccion.id"), index=True, nullable=True)

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
    def fecha_vencimiento(self) -> date:
        dias = self.tiempo_maximo_dias if self.tiempo_maximo_dias and self.tiempo_maximo_dias > 0 else 1
        return self.fecha + timedelta(days=dias)

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
    orden: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

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
    tipo_insumo_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tipos_insumos.id", ondelete="SET NULL"), nullable=True
    )
    lote_insumo_usado_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("insumos.id", ondelete="SET NULL"), nullable=True
    )
    cantidad: Mapped[float] = mapped_column(Float, nullable=False)
    unidad_medida_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("unidades_medida.id"), index=True, nullable=False, default=1
    )
    parametros_control_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default=None)
    valores_registrados_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default=None)

    _estado: Mapped[EstadoEtapaRecetaItem] = mapped_column(
        "estado", default=EstadoEtapaRecetaItem.PENDIENTE, index=True
    )

    @property
    def estado(self) -> EstadoEtapaRecetaItem:
        if self._estado == EstadoEtapaRecetaItem.PENDIENTE and self.checklist and self.checklist.fecha:
            dias_limite = (
                self.checklist.tiempo_maximo_dias
                if getattr(self.checklist, "tiempo_maximo_dias", None) and self.checklist.tiempo_maximo_dias > 0
                else 1
            )
            if (date.today() - self.checklist.fecha).days >= dias_limite:
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
    unidad_medida_rel: Mapped["UnidadMedida"] = relationship("src.unidadesMedida.models.UnidadMedida", lazy="joined")
    responsable: Mapped[Optional["Personal"]] = relationship("Personal", lazy="joined")
    ingrediente: Mapped[Optional["Insumo"]] = relationship("Insumo", foreign_keys=[ingrediente_id], lazy="joined")
    tipo_insumo: Mapped[Optional["TipoInsumo"]] = relationship("TipoInsumo", foreign_keys=[tipo_insumo_id], lazy="joined")
    lote_usado: Mapped[Optional["Insumo"]] = relationship("Insumo", foreign_keys=[lote_insumo_usado_id], lazy="joined")

    @property
    def unidad_medida(self) -> str:
        if self.unidad_medida_rel:
            return self.unidad_medida_rel.nombre.lower()
        return getattr(self, "_unidad_medida_fallback", "kilogramos")

    @unidad_medida.setter
    def unidad_medida(self, val: object) -> None:
        v_str = val.value if hasattr(val, "value") else str(val or "kilogramos")
        self._unidad_medida_fallback = v_str.lower()
        self.unidad_medida_id = _resolver_id_unidad_base(val)

    @property
    def unidad_medida_nombre(self) -> str:
        if self.unidad_medida_rel:
            return self.unidad_medida_rel.nombre
        return ""

    @property
    def unidad_medida_abreviatura(self) -> str:
        if self.unidad_medida_rel:
            return self.unidad_medida_rel.abreviatura
        return ""

    @property
    def nombre_responsable(self) -> Optional[str]:
        if self.responsable:
            return f"{self.responsable.nombre} {self.responsable.apellido}".strip()
        return None

    @property
    def nombre_ingrediente(self) -> Optional[str]:
        if self.tipo_insumo:
            return self.tipo_insumo.nombre
        if self.ingrediente:
            return self.ingrediente.nombre
        return None

    @property
    def parametros_control(self) -> list:
        if not self.parametros_control_json:
            return []
        try:
            data = json.loads(self.parametros_control_json)
            return data if isinstance(data, list) else []
        except Exception:
            return []

    @property
    def valores_registrados(self) -> list:
        if not self.valores_registrados_json:
            return []
        try:
            data = json.loads(self.valores_registrados_json)
            return data if isinstance(data, list) else []
        except Exception:
            return []