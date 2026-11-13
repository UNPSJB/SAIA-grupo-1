from fastapi import Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.rotulado_frontal import exceptions, services


def requiere_modulo_octogonos(db: Session = Depends(get_db)) -> None:
    """Corta solo los endpoints de octogonos; el resto de la app no depende de este modulo."""
    if not services.modulo_activo(db):
        raise exceptions.ModuloDesactivado()
