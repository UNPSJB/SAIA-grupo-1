from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.autenticacion.dependencies import requiere_admin
from src.database import get_db
from src.personal.models import Personal
from src.rotulado_frontal import exceptions, schemas, services
from src.rotulado_frontal.constants import EstadoConjunto
from src.rotulado_frontal.dependencies import requiere_modulo_octogonos

router = APIRouter()

SOLO_ADMIN = [Depends(requiere_admin)]
OCTOGONOS = [Depends(requiere_admin), Depends(requiere_modulo_octogonos)]


# --- Conjuntos de parametros ---
# la pantalla de parametros sigue disponible con el modulo apagado, asi se puede volver a activar

@router.get("/parametros", response_model=List[schemas.ConjuntoResumen], dependencies=SOLO_ADMIN)
def listar_conjuntos(estado: Optional[EstadoConjunto] = None, db: Session = Depends(get_db)):
    return services.listar_conjuntos(db, estado)


# va antes de /parametros/{conjunto_id} para que "vigente" no se tome como id
@router.get("/parametros/vigente", response_model=schemas.ConjuntoResponse, dependencies=SOLO_ADMIN)
def obtener_vigente(fecha: Optional[date] = None, db: Session = Depends(get_db)):
    return services.obtener_vigente(db, fecha)


@router.get("/parametros/{conjunto_id}", response_model=schemas.ConjuntoResponse, dependencies=SOLO_ADMIN)
def obtener_conjunto(conjunto_id: int, db: Session = Depends(get_db)):
    return services.obtener_conjunto(db, conjunto_id)


@router.post("/parametros", response_model=schemas.ConjuntoResponse, status_code=status.HTTP_201_CREATED)
def crear_conjunto(
    datos: schemas.ConjuntoCreate,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_admin),
):
    return services.crear_conjunto(db, datos, usuario)


@router.post(
    "/parametros/{conjunto_id}/nueva-version",
    response_model=schemas.ConjuntoResponse,
    status_code=status.HTTP_201_CREATED,
)
def nueva_version(
    conjunto_id: int,
    datos: schemas.NuevaVersionIn,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_admin),
):
    return services.nueva_version(db, conjunto_id, datos, usuario)


@router.put("/parametros/{conjunto_id}", response_model=schemas.ConjuntoResponse, dependencies=SOLO_ADMIN)
def actualizar_borrador(conjunto_id: int, datos: schemas.ConjuntoUpdate, db: Session = Depends(get_db)):
    return services.actualizar_borrador(db, conjunto_id, datos)


@router.post("/parametros/{conjunto_id}/publicar", response_model=schemas.ConjuntoResponse, dependencies=SOLO_ADMIN)
def publicar(conjunto_id: int, db: Session = Depends(get_db)):
    return services.publicar(db, conjunto_id)


@router.delete("/parametros/{conjunto_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=SOLO_ADMIN)
def eliminar_borrador(conjunto_id: int, db: Session = Depends(get_db)):
    services.eliminar_borrador(db, conjunto_id)


@router.post("/evaluar", response_model=schemas.EvaluacionOut, dependencies=SOLO_ADMIN)
def evaluar(datos: schemas.EvaluacionIn, db: Session = Depends(get_db)):
    return services.evaluar(db, datos)


# --- Interruptor del modulo ---

# cualquier sesion puede consultarlo, para que el front sepa si mostrar los octogonos
@router.get("/modulo", response_model=schemas.EstadoModuloOut)
def obtener_estado_modulo(db: Session = Depends(get_db)):
    return services.obtener_estado_modulo(db)


@router.put("/modulo", response_model=schemas.EstadoModuloOut)
def cambiar_estado_modulo(
    datos: schemas.EstadoModuloIn,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_admin),
):
    return services.cambiar_estado_modulo(db, datos.activo, usuario)


# --- Calculos por producto (requieren el modulo activo) ---

@router.post(
    "/productos/{producto_id}/calculos",
    response_model=schemas.CalculoOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=OCTOGONOS,
)
def calcular_rotulado(
    producto_id: int,
    datos: schemas.CalculoIn,
    db: Session = Depends(get_db),
    usuario: Personal = Depends(requiere_admin),
):
    return services.calcular_rotulado(db, producto_id, datos, usuario)


@router.get(
    "/productos/{producto_id}/calculos",
    response_model=List[schemas.CalculoOut],
    dependencies=OCTOGONOS,
)
def listar_calculos(producto_id: int, db: Session = Depends(get_db)):
    return services.listar_calculos(db, producto_id)


@router.get(
    "/productos/{producto_id}/calculos/ultimo",
    response_model=schemas.CalculoOut,
    dependencies=OCTOGONOS,
)
def ultimo_calculo(producto_id: int, db: Session = Depends(get_db)):
    calculo = services.ultimo_calculo(db, producto_id)
    if calculo is None:
        raise exceptions.CalculoNoEncontrado()
    return calculo
