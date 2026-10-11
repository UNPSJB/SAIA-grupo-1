from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.database import get_db
from src.vencimientos import schemas, services

router = APIRouter(prefix="/vencimientos", tags=["Vencimientos"])


@router.get("/", response_model=List[schemas.VencimientoConsolidadoItem])
def listar_vencimientos(
    origen: Optional[schemas.OrigenVencimiento] = Query(
        default=None,
        description="Filtrar por origen/tipo de vencimiento: personal, equipo o documento",
    ),
    estado: Optional[schemas.EstadoVencimiento] = Query(
        default=None,
        description="Filtrar por urgencia: vencido, proximo o vigente",
    ),
    q: Optional[str] = Query(
        default=None,
        description="Búsqueda por concepto, persona, equipo o documento",
    ),
    db: Session = Depends(get_db),
):
    return services.listar_vencimientos_consolidados(
        db=db,
        origen=origen,
        estado=estado,
        q=q,
    )

