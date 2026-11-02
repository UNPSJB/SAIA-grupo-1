import pytest
from datetime import date
from sqlalchemy.orm import Session
from tests.database import session
from src.personal.schemas import Capacidades, PersonalCreate, PersonalUpdate
from src.personal.services import crear_personal, actualizar_personal
from src.plan_De_limpieza.schemas import PlanDeLimpiezaCreate
from src.plan_De_limpieza.services import crear_plan, listar_planes
from src.tareas import exceptions
from src.tareas.models import Frecuencia
from src.tareas.schemas import TareaBase, TareaCreate, TareaUpdate
from src.tareas.services import crear_tarea, obtener_tarea, validar_personal, eliminar_tarea

def _persona(session: Session, capacidad: Capacidades):
    return crear_personal(
        session,
        PersonalCreate(
            documento="40000001", nombre="Nueva", apellido="Persona", email="nueva.persona@gmail.com",
            capacidad=capacidad, contrasenia="Clave1234",
        ),
    )

def _tarea(session: Session, personal_id: int) -> TareaCreate:
    return TareaCreate(
        nombre="Lavado",
        descripcion="Lavar con detergente",
        frecuencia=Frecuencia.DIARIA,
        plan_id=listar_planes(session)[0].id,
        personal_id=personal_id,
    )

def test_crear_tarea_asignada_a_un_administrador_puro_falla(session: Session) -> None:
    admin = _persona(session, Capacidades.ADMINISTRAR)
    with pytest.raises(exceptions.PersonalNoOperador):
        crear_tarea(session, _tarea(session, personal_id=admin.legajo))

def test_crear_tarea_asignada_a_alguien_con_ambas_capacidades(session: Session) -> None:
    ambos = _persona(session, Capacidades.AMBAS)
    tarea = crear_tarea(session, _tarea(session, personal_id=ambos.legajo))
    assert tarea.personal_id == ambos.legajo

def test_crear_plan_con_tarea_asignada_a_un_administrador_puro_falla(session: Session) -> None:
    admin = _persona(session, Capacidades.ADMINISTRAR)
    with pytest.raises(exceptions.PersonalNoOperador):
        crear_plan(
            session,
            PlanDeLimpiezaCreate(
                nombre="PlanHeladera",
                fecha_inicio=date.today(),
                equipo_id=1,
                tareas=[
                    TareaBase(nombre="Lavado", descripcion="Lavar", frecuencia=Frecuencia.DIARIA,
                              personal_id=admin.legajo)
                ],
            ),
        )

def test_validar_personal_excepciones_custom(session: Session) -> None:
    with pytest.raises(exceptions.PersonalNoEncontrado):
        validar_personal(session, 99999)

    operador = crear_personal(
        session,
        PersonalCreate(
            documento="40000002", nombre="Inactivo", apellido="Operador", email="inactivo.op@gmail.com",
            capacidad=Capacidades.OPERAR, contrasenia="Clave1234",
        ),
    )
    actualizar_personal(session, operador.legajo, PersonalUpdate(activo=False))

    with pytest.raises(exceptions.PersonalInactivo):
        validar_personal(session, operador.legajo)

def test_obtener_y_eliminar_tarea_inexistente(session: Session) -> None:
    with pytest.raises(exceptions.TareNoEncontrada):
        obtener_tarea(session, 99999)

def test_validaciones_schemas_tareas():
    with pytest.raises(exceptions.FRECUENCIAInvalida):
        TareaBase.is_valid_frecuencia("INVENTADA")

    with pytest.raises(exceptions.NombreConNumeros):
        TareaCreate.validar_nombre("Tarea @#$%")

    with pytest.raises(exceptions.DescripcionInvalidad):
        TareaCreate.validar_descripcion("Desc *&^%")

    with pytest.raises(exceptions.Nombre_Invalido):
        TareaCreate.validar_longitud("A")

    with pytest.raises(exceptions.NombreConNumeros):
        TareaUpdate.validar_nombre("Tarea @#$")

    with pytest.raises(exceptions.DescripcionInvalidad):
        TareaUpdate.validar_descripcion("Desc *&^")

    with pytest.raises(exceptions.Nombre_Invalido):
        TareaUpdate.validar_longitud("X")
