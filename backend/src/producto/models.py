from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.alergenos.models import Alergeno,productos_alergenos
from src.recetas.models import Receta
from src.models import ModeloBase

import src.unidadesMedida.models

if TYPE_CHECKING:
    from src.unidadesMedida.models import UnidadMedida

class Producto(ModeloBase):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(50), index=True, unique=True, nullable=True)
    descripcion: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    unidad_medida_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("unidades_medida.id"), index=True, nullable=False, default=1
    )
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    visible_publico: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    receta: Mapped[Optional["Receta"]] = relationship("Receta",back_populates="producto")
    unidad_medida_rel: Mapped["UnidadMedida"] = relationship(
        "UnidadMedida", lazy="joined"
    )

    

    tamano_porcion_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    _porciones_por_envase: Mapped[Optional[float]] = mapped_column("porciones_por_envase", Float, nullable=True, default=None)
    descripcion_porcion: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default=None)
    medida_casera: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default=None)
    equivalencia_gramos_unidad: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    cantidad_por_envase: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    peso_unidad_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    aplica_rotulado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    documento_receta_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=None)
    conservacion: Mapped[str] = mapped_column (String(500),nullable=True, default=None)

    alergenos_precaucion: Mapped[List["Alergeno"]] = relationship(
    "Alergeno",
    secondary=productos_alergenos,
    lazy="selectin",  # o "joined", según cómo consultes productos
)

    @property
    def porciones_por_envase(self) -> Optional[float]:
        if self.peso_unidad_g and self.peso_unidad_g > 0 and self.tamano_porcion_g and self.tamano_porcion_g > 0:
            return round(float(self.peso_unidad_g) / float(self.tamano_porcion_g), 2)
        return self._porciones_por_envase

    @porciones_por_envase.setter
    def porciones_por_envase(self, val: Optional[float]) -> None:
        if self.peso_unidad_g and self.peso_unidad_g > 0 and self.tamano_porcion_g and self.tamano_porcion_g > 0:
            self._porciones_por_envase = round(float(self.peso_unidad_g) / float(self.tamano_porcion_g), 2)
        else:
            self._porciones_por_envase = val

    @property
    def id_receta(self) -> Optional[int]:
        if self.receta:
            if isinstance(self.receta, list):
                return getattr(self.receta[0], "id", None) if self.receta else self.documento_receta_id
            return getattr(self.receta, "id", None)
        return self.documento_receta_id

    @property
    def unidadMedida(self) -> str:
        if self.unidad_medida_rel:
            return self.unidad_medida_rel.nombre.lower()
        return getattr(self, "_unidad_medida_fallback", "kilogramos")

    @unidadMedida.setter
    def unidadMedida(self, val: object) -> None:
        v_str = (val.value if hasattr(val, "value") else str(val or "kilogramos")).strip().lower()
        self._unidad_medida_fallback = v_str
        if v_str in ("g", "gr", "gramo", "gramos"):
            self.unidad_medida_id = 2
        elif v_str in ("l", "lt", "litro", "litros"):
            self.unidad_medida_id = 3
        elif v_str in ("ml", "cc", "mililitro", "mililitros"):
            self.unidad_medida_id = 4
        elif v_str in ("u", "un", "unid", "unidad", "unidades"):
            self.unidad_medida_id = 5
        else:
            self.unidad_medida_id = 1

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
