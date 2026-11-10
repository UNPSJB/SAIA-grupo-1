from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from src.models import ModeloBase

class MotivoNoRealizado(ModeloBase):
    __tablename__ = "motivos_no_realizado"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
