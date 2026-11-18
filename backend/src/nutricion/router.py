from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from src.database import get_db
from src.autenticacion.dependencies import requiere_admin, get_usuario_actual
from src.personal.models import Personal
from src.nutricion import services
from src.nutricion.schemas import (
    ParametroRedondeoNutricionalResponse,
    ParametroRedondeoUpdate,
    InsumoNutricionalUpdate,
    InformacionNutricionalResponse,
    CalcularNutricionRequest,
    VerificacionReferenciaResponse,
)

router = APIRouter(tags=["Nutrición"])

def resolver_nombre_usuario(usuario: Optional[Personal]) -> str:
    if not usuario:
        return "Admin"
    nombre = getattr(usuario, "nombre", "")
    apellido = getattr(usuario, "apellido", "")
    completo = f"{nombre} {apellido}".strip()
    if completo:
        return completo
    if hasattr(usuario, "usuario") and usuario.usuario:
        return usuario.usuario
    if hasattr(usuario, "legajo") and usuario.legajo:
        return f"Legajo #{usuario.legajo}"
    return "Admin"

@router.get(
    "/nutricion/parametros",
    response_model=List[ParametroRedondeoNutricionalResponse],
    dependencies=[Depends(get_usuario_actual)],
)
def listar_parametros_redondeo(db: Session = Depends(get_db)):
    return services.listar_parametros(db)

@router.put(
    "/nutricion/parametros/{nutriente}",
    response_model=ParametroRedondeoNutricionalResponse,
    dependencies=[Depends(requiere_admin)],
)
def actualizar_parametro_redondeo(
    nutriente: str,
    datos: ParametroRedondeoUpdate,
    db: Session = Depends(get_db),
):
    return services.actualizar_parametro(db, nutriente, datos)

@router.post(
    "/nutricion/parametros/restablecer",
    response_model=List[ParametroRedondeoNutricionalResponse],
    dependencies=[Depends(requiere_admin)],
)
def restablecer_parametros(db: Session = Depends(get_db)):
    return services.restablecer_parametros_defecto(db)

@router.put(
    "/nutricion/insumos/{insumo_id}",
    dependencies=[Depends(requiere_admin)],
)
def actualizar_datos_insumo(
    insumo_id: int,
    datos: InsumoNutricionalUpdate,
    db: Session = Depends(get_db),
):
    insumo = services.actualizar_nutricion_insumo(db, insumo_id, datos)
    return {
        "id": insumo.id,
        "nombre": insumo.nombre,
        "energia_kcal": insumo.energia_kcal,
        "energia_kj": insumo.energia_kj,
        "carbohidratos": insumo.carbohidratos,
        "azucares_totales": insumo.azucares_totales,
        "azucares_anadidos": insumo.azucares_anadidos,
        "proteinas": insumo.proteinas,
        "grasas_totales": insumo.grasas_totales,
        "grasas_saturadas": insumo.grasas_saturadas,
        "grasas_trans": insumo.grasas_trans,
        "fibra_alimentaria": insumo.fibra_alimentaria,
        "sodio_mg": insumo.sodio_mg,
    }

@router.get(
    "/nutricion/insumos/{insumo_id}",
    dependencies=[Depends(get_usuario_actual)],
)
def obtener_datos_insumo(
    insumo_id: int,
    db: Session = Depends(get_db),
):
    insumo = services.obtener_nutricion_insumo(db, insumo_id)
    return {
        "id": insumo.id,
        "nombre": insumo.nombre,
        "energia_kcal": insumo.energia_kcal,
        "energia_kj": insumo.energia_kj,
        "carbohidratos": insumo.carbohidratos,
        "azucares_totales": insumo.azucares_totales,
        "azucares_anadidos": insumo.azucares_anadidos,
        "proteinas": insumo.proteinas,
        "grasas_totales": insumo.grasas_totales,
        "grasas_saturadas": insumo.grasas_saturadas,
        "grasas_trans": insumo.grasas_trans,
        "fibra_alimentaria": insumo.fibra_alimentaria,
        "sodio_mg": insumo.sodio_mg,
    }

@router.post(
    "/nutricion/productos/{producto_id}/calcular",
    response_model=InformacionNutricionalResponse,
    dependencies=[Depends(requiere_admin)],
)
def calcular_nutricion_producto(
    producto_id: int,
    datos: Optional[CalcularNutricionRequest] = None,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_admin),
):
    u_nombre = resolver_nombre_usuario(usuario)
    return services.calcular_informacion_nutricional(
        db=db,
        producto_id=producto_id,
        receta_id=datos.receta_id if datos else None,
        tamano_porcion_g=datos.tamano_porcion_g if datos else None,
        porciones_por_envase=datos.porciones_por_envase if datos else None,
        descripcion_porcion=datos.descripcion_porcion if datos else None,
        usuario_actual=u_nombre,
    )

@router.post(
    "/productos/{producto_id}/calcular-nutricion",
    response_model=InformacionNutricionalResponse,
    dependencies=[Depends(requiere_admin)],
)
def calcular_nutricion_producto_alias(
    producto_id: int,
    datos: Optional[CalcularNutricionRequest] = None,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_admin),
):
    u_nombre = resolver_nombre_usuario(usuario)
    return services.calcular_informacion_nutricional(
        db=db,
        producto_id=producto_id,
        receta_id=datos.receta_id if datos else None,
        tamano_porcion_g=datos.tamano_porcion_g if datos else None,
        porciones_por_envase=datos.porciones_por_envase if datos else None,
        descripcion_porcion=datos.descripcion_porcion if datos else None,
        usuario_actual=u_nombre,
    )

@router.get(
    "/nutricion/productos/{producto_id}",
    response_model=InformacionNutricionalResponse,
    dependencies=[Depends(get_usuario_actual)],
)
def obtener_nutricion_producto(
    producto_id: int,
    db: Session = Depends(get_db),
):
    return services.obtener_informacion_nutricional_producto(db, producto_id)

@router.get(
    "/productos/{producto_id}/informacion-nutricional",
    response_model=InformacionNutricionalResponse,
    dependencies=[Depends(get_usuario_actual)],
)
def obtener_nutricion_producto_alias(
    producto_id: int,
    db: Session = Depends(get_db),
):
    return services.obtener_informacion_nutricional_producto(db, producto_id)

@router.get(
    "/nutricion/productos/{producto_id}/verificar-referencia",
    response_model=VerificacionReferenciaResponse,
    dependencies=[Depends(get_usuario_actual)],
)
def verificar_referencia_producto(
    producto_id: int,
    db: Session = Depends(get_db),
):
    info = services.obtener_informacion_nutricional_producto(db, producto_id)
    return services.verificar_tolerancia_referencia_catedra(info)
