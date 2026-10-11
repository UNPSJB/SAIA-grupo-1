from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from sqlalchemy import String, Integer

class TipoCertificado(ModeloBase):
    __tablename__ = "tipos_certificados"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(30), nullable=False, index=True)

    certificados: Mapped["Certificado"] = relationship(back_populates="tipo_relacion")