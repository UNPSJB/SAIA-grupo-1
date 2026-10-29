from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.vencimientos import schemas, services
from src.autenticacion.dependencies import get_usuario_actual
from src.utils.csv import generar_respuesta_csv

router = APIRouter(prefix="/vencimientos", tags=["Vencimientos"])

@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_vencimientos_csv(
    origen: Optional[schemas.OrigenVencimiento] = Query(default=None),
    estado: Optional[schemas.EstadoVencimiento] = Query(default=None),
    q: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
   
    datos = services.obtener_vencimientos_consolidados_para_csv(
        db=db,
        origen=origen,
        estado=estado,
        q=q,
    )

    columnas = {
        "id": "ID",
        "estado": "Estado de Urgencia",
        "origen": "Tipo de Vencimiento",
        "concepto": "Qué Vence",
        "responsable": "Responsable / Entidad",
        "fecha": "Fecha de Vencimiento",
        "plazo": "Plazo Descriptivo",
        "dias_restantes": "Días Restantes",
    }

    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo="vencimientos_consolidados.csv",
    )

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

