from sqlalchemy.orm import Mapped, mapped_column
from src.models import ModeloBase
from sqlalchemy import String, Integer

class TipoDocumento(ModeloBase):
    __tablename__ = "tipos_documentos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

