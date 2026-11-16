from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import get_usuario_actual, requiere_admin
from src.database import get_db
from src.personal.models import Personal
from src.rotulado import exceptions, schemas, services

router = APIRouter(tags=["Rotulado"])


@router.get(
    "/productos/{producto_id}/ingredientes-rotulo",
    response_model=schemas.ListaIngredientesResponse,
    dependencies=[Depends(get_usuario_actual)],
)
def obtener_ingredientes_rotulo_endpoint(
    producto_id: int,
    db: Session = Depends(get_db),
):
    lista = services.obtener_lista_rotulo(db, producto_id)
    if lista is None:
        raise exceptions.ListaIngredientesNoEncontrada()
    return services.mapear_respuesta_lista(lista)


@router.post(
    "/productos/{producto_id}/ingredientes-rotulo",
    response_model=schemas.ListaIngredientesResponse,
    status_code=status.HTTP_200_OK,
)
def guardar_ingredientes_rotulo_endpoint(
    producto_id: int,
    datos: schemas.ListaIngredientesCreate,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_admin),
):
    lista = services.guardar_lista_rotulo(db, producto_id, datos, usuario)
    return services.mapear_respuesta_lista(lista)


@router.put(
    "/productos/{producto_id}/ingredientes-rotulo/reordenar",
    response_model=schemas.ListaIngredientesResponse,
)
def reordenar_manualmente_endpoint(
    producto_id: int,
    datos: schemas.ReordenarItemsManual,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_admin),
):
    lista = services.reordenar_manualmente(db, producto_id, datos, usuario)
    return services.mapear_respuesta_lista(lista)


@router.post(
    "/productos/{producto_id}/ingredientes-rotulo/restablecer-automatico",
    response_model=schemas.ListaIngredientesResponse,
)
def restablecer_automatico_endpoint(
    producto_id: int,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_admin),
):
    lista = services.restablecer_automatico(db, producto_id, usuario)
    return services.mapear_respuesta_lista(lista)


@router.patch(
    "/productos/{producto_id}/ingredientes-rotulo/formato",
    response_model=schemas.ListaIngredientesResponse,
)
def cambiar_formato_aditivos_endpoint(
    producto_id: int,
    datos: schemas.FormatoAditivosUpdate,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_admin),
):
    lista = services.cambiar_formato_aditivos(
        db, producto_id, datos.formato_aditivos, usuario
    )
    return services.mapear_respuesta_lista(lista)


@router.post(
    "/productos/{producto_id}/ingredientes-rotulo/previsualizar",
    response_model=schemas.PrevisualizarOrdenResponse,
    dependencies=[Depends(requiere_admin)],
)
def previsualizar_orden_endpoint(
    producto_id: int,
    datos: schemas.PrevisualizarOrdenRequest,
    db: Session = Depends(get_db),
):
    services.obtener_producto_o_404(db, producto_id)
    return services.previsualizar_orden(datos)


@router.post(
    "/productos/{producto_id}/ingredientes-rotulo/importar-lote",
    response_model=schemas.PrevisualizarOrdenResponse,
    dependencies=[Depends(requiere_admin)],
)
def importar_desde_lote_endpoint(
    producto_id: int,
    lote_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    return services.importar_desde_lote(db, producto_id, lote_id)


@router.get(
    "/rotulado/productos/{producto_id}/ingredientes",
    response_model=schemas.RotuloIngredientesE13Response,
    dependencies=[Depends(get_usuario_actual)],
)
def obtener_para_rotulado_e13_endpoint(
    producto_id: int,
    db: Session = Depends(get_db),
):
    return services.obtener_para_e13(db, producto_id)


@router.get(
    "/productos/{producto_id}/borrador-rotulo",
    response_model=schemas.BorradorRotuloResponse,
    dependencies=[Depends(get_usuario_actual)],
)
def obtener_borrador_rotulo_endpoint(
    producto_id: int,
    db: Session = Depends(get_db),
):
    borrador = services.obtener_o_crear_borrador(db, producto_id)
    lista = services.obtener_lista_rotulo(db, producto_id)
    return services.mapear_respuesta_borrador(borrador, lista)


@router.put(
    "/productos/{producto_id}/borrador-rotulo",
    response_model=schemas.BorradorRotuloResponse,
)
def actualizar_borrador_rotulo_endpoint(
    producto_id: int,
    datos: schemas.BorradorRotuloUpdate,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_admin),
):
    borrador = services.guardar_borrador(db, producto_id, datos, usuario)
    lista = services.obtener_lista_rotulo(db, producto_id)
    return services.mapear_respuesta_borrador(borrador, lista)


@router.post(
    "/productos/{producto_id}/borrador-rotulo/exportar",
    response_model=schemas.ExportarBorradorResponse,
    dependencies=[Depends(requiere_admin)],
)
def exportar_borrador_rotulo_endpoint(
    producto_id: int,
    datos: schemas.ExportarBorradorRequest,
    db: Session = Depends(get_db),
):
    return services.exportar_borrador(db, producto_id, datos)


@router.post(
    "/productos/{producto_id}/borrador-rotulo/autocompletar",
    response_model=schemas.BorradorRotuloResponse,
    dependencies=[Depends(requiere_admin)],
)
def autocompletar_borrador_rotulo_endpoint(
    producto_id: int,
    datos: schemas.AutocompletarBorradorRequest,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_admin),
):
    borrador = services.autocompletar_datos_borrador(
        db, producto_id, campos=datos.campos, usuario=usuario
    )
    lista = services.obtener_lista_rotulo(db, producto_id)
    return services.mapear_respuesta_borrador(borrador, lista)


