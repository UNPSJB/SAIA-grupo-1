from typing import List, TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from sqlalchemy import String, Integer

if TYPE_CHECKING:
    from src.certificado.models import Certificado

class TipoCertificado(ModeloBase):
    __tablename__ = "tipos_certificados"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    certificados: Mapped[List["Certificado"]] = relationship("src.certificado.models.Certificado", back_populates="tipo_relacion")
