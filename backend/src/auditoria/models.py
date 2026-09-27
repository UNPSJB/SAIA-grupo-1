from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional
from datetime import datetime
from enum import auto, StrEnum
from src.models import ModeloBase


class AccionAuditoria(StrEnum):
    CREAR = auto()
    MODIFICAR = auto()
    ELIMINAR = auto()
    # Ver si se deben agregar mas acciones. 


class Auditoria(ModeloBase):
    __tablename__ = "auditoria"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    # usuario_id: Mapped[int] = mapped_column(index=True) # Ver como hacer la conexion cuando exista usuario
    tabla: Mapped[str] = mapped_column(index=True)
    registro_id: Mapped[int] = mapped_column(index=True)
    accion: Mapped[AccionAuditoria] = mapped_column(index=True)
    campo: Mapped[Optional[str]] = mapped_column(nullable=True)
    valor_previo: Mapped[Optional[str]] = mapped_column(nullable=True)
    valor_posterior: Mapped[Optional[str]] = mapped_column(nullable=True)
    creado_el: Mapped[datetime] = mapped_column(index=True, default=datetime.now)
