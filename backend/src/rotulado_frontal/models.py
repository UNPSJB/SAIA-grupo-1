from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import (
    JSON, Boolean, Date, DateTime, Enum as SQLEnum, ForeignKey, Integer, String, UniqueConstraint,
    event, inspect, select,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase
from src.rotulado_frontal.constants import EstadoConjunto, EstadoFisico
from src.rotulado_frontal import exceptions


class ConjuntoParametrosRotulado(ModeloBase):
    """Umbrales, formulas y reglas de aplicabilidad del rotulado frontal, con su version,
    fecha de vigencia y norma de origen. Una vez publicado no cambia mas."""
    __tablename__ = "conjuntos_parametros_rotulado"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    version: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    fecha_vigencia: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    norma_origen: Mapped[str] = mapped_column(String(200), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    estado: Mapped[EstadoConjunto] = mapped_column(
        SQLEnum(EstadoConjunto), default=EstadoConjunto.BORRADOR, nullable=False, index=True
    )
    # de que version se clono, para seguir la historia de cambios
    basado_en_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("conjuntos_parametros_rotulado.id"), nullable=True
    )
    creado_por_legajo: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    publicado_en: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    reglas: Mapped[List["ReglaRotulado"]] = relationship(
        back_populates="conjunto",
        cascade="all, delete-orphan",
        order_by="ReglaRotulado.orden",
        lazy="selectin",
    )


class ReglaRotulado(ModeloBase):
    """Un sello (octogono): sus condiciones de exceso (se combinan con OR) y las condiciones
    de aplicabilidad (todas deben cumplirse para evaluarlo). Ambas se guardan como JSON
    estructurado y validado, nunca como codigo a ejecutar."""
    __tablename__ = "reglas_rotulado"
    __table_args__ = (UniqueConstraint("conjunto_id", "codigo", name="uq_regla_codigo_por_conjunto"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conjunto_id: Mapped[int] = mapped_column(
        ForeignKey("conjuntos_parametros_rotulado.id", ondelete="CASCADE"), index=True, nullable=False
    )
    codigo: Mapped[str] = mapped_column(String(40), nullable=False)
    leyenda: Mapped[str] = mapped_column(String(60), nullable=False)
    condiciones: Mapped[list] = mapped_column(JSON, nullable=False)
    aplicabilidad: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    orden: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    activa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    conjunto: Mapped[ConjuntoParametrosRotulado] = relationship(back_populates="reglas")


class CalculoRotulado(ModeloBase):
    """Resultado de aplicar un conjunto de parametros a un producto. Solo se insertan filas:
    guarda la version usada y una copia de los valores de entrada, para que los calculos
    historicos no cambien aunque despues se publiquen parametros nuevos."""
    __tablename__ = "calculos_rotulado"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), index=True, nullable=False)
    conjunto_parametros_id: Mapped[int] = mapped_column(
        ForeignKey("conjuntos_parametros_rotulado.id"), index=True, nullable=False
    )
    version_parametros: Mapped[str] = mapped_column(String(20), nullable=False)
    estado_fisico: Mapped[EstadoFisico] = mapped_column(SQLEnum(EstadoFisico), nullable=False)
    valores_entrada: Mapped[dict] = mapped_column(JSON, nullable=False)
    sellos: Mapped[list] = mapped_column(JSON, nullable=False)
    resultado: Mapped[list] = mapped_column(JSON, nullable=False)
    calculado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    calculado_por_legajo: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    conjunto: Mapped[ConjuntoParametrosRotulado] = relationship(lazy="joined")

    @property
    def norma_origen(self) -> str:
        return self.conjunto.norma_origen

    @property
    def fecha_vigencia_parametros(self) -> date:
        return self.conjunto.fecha_vigencia


class EstadoModulo(ModeloBase):
    """Interruptor de modulos opcionales (por ahora, el de octogonos)."""
    __tablename__ = "estado_modulos"

    clave: Mapped[str] = mapped_column(String(40), primary_key=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    actualizado_por_legajo: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    actualizado_en: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


# --- Inmutabilidad a nivel ORM ---
# Los servicios ya lo validan; esto evita que cualquier otro camino (otro servicio, un script)
# altere un conjunto publicado o un calculo ya hecho.

@event.listens_for(ConjuntoParametrosRotulado, "before_update")
def _bloquear_update_conjunto_publicado(mapper, connection, target):
    historial = inspect(target).attrs.estado.history
    estado_previo = historial.deleted[0] if historial.deleted else target.estado
    if estado_previo == EstadoConjunto.PUBLICADO:
        raise exceptions.ConjuntoPublicadoInmutable()


@event.listens_for(ConjuntoParametrosRotulado, "before_delete")
def _bloquear_delete_conjunto_publicado(mapper, connection, target):
    if target.estado == EstadoConjunto.PUBLICADO:
        raise exceptions.ConjuntoPublicadoInmutable()


def _bloquear_si_conjunto_publicado(mapper, connection, target):
    # se consulta por conexion porque una regla huerfana ya no tiene la relacion cargada
    estado = connection.execute(
        select(ConjuntoParametrosRotulado.estado).where(ConjuntoParametrosRotulado.id == target.conjunto_id)
    ).scalar()
    if estado == EstadoConjunto.PUBLICADO:
        raise exceptions.ConjuntoPublicadoInmutable()


event.listen(ReglaRotulado, "before_insert", _bloquear_si_conjunto_publicado)
event.listen(ReglaRotulado, "before_update", _bloquear_si_conjunto_publicado)
event.listen(ReglaRotulado, "before_delete", _bloquear_si_conjunto_publicado)


@event.listens_for(CalculoRotulado, "before_update")
@event.listens_for(CalculoRotulado, "before_delete")
def _bloquear_cambios_calculo(mapper, connection, target):
    raise exceptions.CalculoInmutable()
