from datetime import date
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import get_usuario_actual
from src.database import get_db
from src.informes import pdf, services
from src.personal.models import Personal

router = APIRouter(prefix="/informes", tags=["Informes"])


@router.get(
    "/inspeccion",
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}, "description": "Informe en PDF"}},
)
def generar_informe_inspeccion(
    desde: date = Query(..., description="Inicio del período (inclusive)"),
    hasta: date = Query(..., description="Fin del período (inclusive)"),
    db: Session = Depends(get_db),
    usuario: Personal = Depends(get_usuario_actual),
):
    emitido_por = f"{usuario.nombre} {usuario.apellido}"
    datos = services.obtener_datos_informe(db, desde, hasta, emitido_por)
    nombre_archivo = f"informe-inspeccion_{desde.isoformat()}_{hasta.isoformat()}.pdf"
    return Response(
        content=pdf.generar_pdf(datos),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )
