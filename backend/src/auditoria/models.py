from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime
from enum import auto, StrEnum
from src.models import ModeloBase

class Insumo(ModeloBase):
    __tablename__ = "auditoria"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    # usuario_id: Mapped[int] = mapped_column(index=true, foreign_key="users.id") #Ver como hacer la conexion cuando exista usuario
    tabla: Mapped[str] = mapped_column(index=true)
    registro_id: Mapped[int] = mapped_column(index=true)
    accion: Mapped[str] = mapped_column(index=true)
    campo: Mapped[Optional[str]] = mapped_column(index=true, nullable=true)
    valor_previo: Mapped[Optional[str]] = mapped_column(index=true, nullable=true)
    valor_posterior: Mapped[Optional[str]] = mapped_column(index=true, nullable=true)
    creado_el: Mapped[datetime] = mapped_column(index=true, default=datetime.now)



