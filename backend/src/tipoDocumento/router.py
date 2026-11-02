from typing import List, Optional
from fastapi import APIRouter, Depends, Form, Query
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import get_usuario_actual, requiere_admin
from src.tipoDocumento import schemas, services
from src.database import get_db
from src.utils.csv import generar_respuesta_csv

router = APIRouter(prefix="/documentos/tipos", tags=["tipos_documentos"])

@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_tipos_documentos_csv(
    busqueda: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    datos = services.obtener_tipos_para_csv(db, busqueda=busqueda)
    
    columnas = {
        "id": "ID",
        "nombre": "Nombre del Tipo de Documento"
    }
    
    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo="tipos_documentos.csv"
    )

@router.get("/", response_model=List[schemas.TipoDocumento], dependencies=[Depends(get_usuario_actual)])
async def read_tipos_documentos(db: Session = Depends(get_db)):
    return services.listar_tipos_documentos(db)

@router.get("/{tipo_id}", response_model=schemas.TipoDocumento, dependencies=[Depends(get_usuario_actual)])
async def read_tipo_documento(tipo_id: int, db: Session = Depends(get_db)):
    return services.obtener_tipo_documento(db, tipo_id)

@router.post("/", response_model=schemas.TipoDocumento, dependencies=[Depends(requiere_admin)])
async def create_tipo_documento(nombre: str = Form(...), db: Session = Depends(get_db)):
    return services.crear_tipo_documento(db, nombre)

@router.put("/{tipo_id}", response_model=schemas.TipoDocumento, dependencies=[Depends(requiere_admin)])
async def update_tipo_documento(tipo_id: int, nombre: str = Form(...), db: Session = Depends(get_db)):
    return services.actualizar_tipo_documento(db, tipo_id, nombre)

@router.delete("/{tipo_id}", dependencies=[Depends(requiere_admin)])
async def delete_tipo_documento(tipo_id: int, db: Session = Depends(get_db)):
    return services.eliminar_tipo_documento(db, tipo_id)

