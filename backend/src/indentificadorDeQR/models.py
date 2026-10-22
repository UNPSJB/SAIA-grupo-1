from enum import StrEnum, auto
from typing import Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase


class IndentificadorUnico(ModeloBase):
    __tablename__="Identificador_UnicoDeQR"

    id_alfanumerico: Mapped[str]=mapped_column(String(37),index=True,primary_key=True)
    estado:Mapped[bool]=mapped_column(index=True)
    urldelQR:Mapped[str]