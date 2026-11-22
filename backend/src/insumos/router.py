from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import get_usuario_actual
from src.database import get_db
from src.insumos import schemas, services
from src.utils.csv import generar_respuesta_csv
from src.utils.pdf import generar_respuesta_pdf

router = APIRouter()
operador_router = APIRouter(prefix="/insumos-operador", tags=["Insumos Operaciones"])


@router.get("/exportar-pdf", dependencies=[Depends(get_usuario_actual)])
def exportar_insumos_pdf(
    busqueda: Optional[str] = None,
    unidad: Optional[str] = None,
    vencimiento: Optional[str] = None,
    db: Session = Depends(get_db)
):
    datos = services.obtener_insumos_para_exportar(
        db, busqueda=busqueda, unidad=unidad, vencimiento=vencimiento
    )

    columnas = {
        "id": "ID",
        "nombre": "Nombre del Ingrediente",
        "lote": "Lote",
        "stock": "Stock Actual",
        "cantRecibida": "Cantidad Recibida",
        "medida": "Unidad de Medida",
        "fechaRecepcion": "Fecha de Recepción",
        "fechaVencimiento": "Fecha de Vencimiento",
        "estadoVencimiento": "Estado de Vencimiento",
    }

    return generar_respuesta_pdf(
        db=db,
        datos=datos,
        columnas=columnas,
        titulo_reporte="Listado de Ingredientes",
        nombre_archivo="ingredientes.pdf",
    )

@router.get("/exportar-csv", dependencies=[Depends(get_usuario_actual)])
def exportar_insumos_csv(
    busqueda: Optional[str] = None,
    unidad: Optional[str] = None,
    vencimiento: Optional[str] = None,
    db: Session = Depends(get_db),
):
    datos = services.obtener_insumos_para_exportar(
        db, busqueda=busqueda, unidad=unidad, vencimiento=vencimiento
    )
    columnas = {
        "id": "ID",
        "nombre": "Nombre del Ingrediente",
        "tipoInsumo": "Tipo de Insumo",
        "proveedor": "Proveedor",
        "lote": "Lote",
        "stock": "Stock Actual",
        "cantRecibida": "Cantidad Recibida",
        "medida": "Unidad de Medida",
        "fechaRecepcion": "Fecha de Recepción",
        "fechaVencimiento": "Fecha de Vencimiento",
        "estadoVencimiento": "Estado de Vencimiento",
    }
    return generar_respuesta_csv(
        datos=datos,
        columnas=columnas,
        nombre_archivo="ingredientes.csv",
    )


@router.get("/referencia-sara", response_model=List[schemas.AlimentoReferenciaSARAResponse])
def buscar_alimentos_referencia_sara(
    busqueda: Optional[str] = None,
    categoria: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return services.buscar_alimentos_sara(db, busqueda=busqueda, categoria=categoria)


@router.get("/referencia-sara/{codigo}", response_model=schemas.AlimentoReferenciaSARAResponse)
def obtener_alimento_referencia_sara(codigo: str, db: Session = Depends(get_db)):
    return services.obtener_alimento_sara_por_codigo(db, codigo=codigo)


@router.get("/agrupados", response_model=List[schemas.InsumoAgrupadoPorTipo])
@operador_router.get("/agrupados", response_model=List[schemas.InsumoAgrupadoPorTipo])
def read_insumos_agrupados(
    busqueda: Optional[str] = Query(None), db: Session = Depends(get_db)
):
    return services.listar_insumos_agrupados_por_tipo(db, busqueda=busqueda)


@router.get("/selector", response_model=List[schemas.InsumoSelectorItem])
@operador_router.get("/selector", response_model=List[schemas.InsumoSelectorItem])
def read_insumos_selector(
    tipo_id: int = Query(...), db: Session = Depends(get_db)
):
    return services.listar_insumos_para_selector(db, tipo_id=tipo_id)


@router.post(
    "/recepcion",
    response_model=schemas.Insumo,
    status_code=status.HTTP_201_CREATED,
)
@operador_router.post(
    "/recepcion",
    response_model=schemas.Insumo,
    status_code=status.HTTP_201_CREATED,
)
def recepcion_insumo(
    datos: schemas.RecepcionInsumoRequest, db: Session = Depends(get_db)
):
    return services.recibir_lote_insumo(db, datos)


@router.post("/{insumo_id}/desechar", response_model=schemas.Insumo)
@operador_router.post("/{insumo_id}/desechar", response_model=schemas.Insumo)
def desechar_insumo_vencido(insumo_id: int, db: Session = Depends(get_db)):
    return services.desechar_insumo(db, insumo_id)


@router.get("/{insumo_id}/trazabilidad", response_model=schemas.InsumoDetalleTrazabilidad)
@operador_router.get("/{insumo_id}/trazabilidad", response_model=schemas.InsumoDetalleTrazabilidad)
def trazabilidad_insumo(insumo_id: int, db: Session = Depends(get_db)):
    return services.obtener_trazabilidad_insumo(db, insumo_id)


@router.post("/", response_model=schemas.Insumo)
def create_insumo(insumo: schemas.InsumoCreate, db: Session = Depends(get_db)):
    return services.crear_insumo(db, insumo)


@router.get("/", response_model=list[schemas.Insumo])
def read_insumos(db: Session = Depends(get_db)):
    return services.listar_insumos(db)


@router.get("/{insumo_id}/nutricion", response_model=schemas.DatosNutricionalesInsumoResponse)
def read_nutricion_insumo(insumo_id: int, db: Session = Depends(get_db)):
    return services.obtener_nutricion_insumo(db, insumo_id)


@router.put("/{insumo_id}/nutricion", response_model=schemas.DatosNutricionalesInsumoResponse)
def update_nutricion_insumo(
    insumo_id: int,
    datos: schemas.DatosNutricionalesInsumoUpdate,
    db: Session = Depends(get_db),
    usuario_actual = Depends(get_usuario_actual),
):
    nombre_usuario = (
        getattr(usuario_actual, "nombre", None)
        or getattr(usuario_actual, "legajo", None)
        or "Administrador"
    )
    return services.guardar_nutricion_insumo(
        db, insumo_id, datos, usuario=str(nombre_usuario)
    )


@router.get("/{insumo_id}", response_model=schemas.Insumo)
def read_insumo(insumo_id: int, db: Session = Depends(get_db)):
    return services.leer_insumo(db, insumo_id)


@router.patch("/{insumo_id}", response_model=schemas.Insumo)
def update_insumo(
    insumo_id: int, insumo: schemas.InsumoUpdate, db: Session = Depends(get_db)
):
    return services.modificar_insumo(db, insumo_id, insumo)


@router.delete("/{insumo_id}", response_model=schemas.Insumo)
def delete_insumo(insumo_id: int, db: Session = Depends(get_db)):
    return services.eliminar_insumo(db, insumo_id)


@router.patch("/{insumo_id}/stock", response_model=schemas.Insumo)
def update_insumo_stock(
    insumo_id: int, insumo: schemas.InsumoUpdateStock, db: Session = Depends(get_db)
):
    return services.modificar_stock(db, insumo_id, insumo)
