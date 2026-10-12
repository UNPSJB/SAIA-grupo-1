import pytest
from datetime import date
from sqlalchemy.orm import Session
from tests.database import session
from src.personal.schemas import Capacidades, PersonalCreate
from src.personal.services import crear_personal
from src.plan_De_limpieza.schemas import PlanDeLimpiezaCreate
from src.plan_De_limpieza.services import crear_plan, listar_planes
from src.tareas import exceptions
from src.tareas.models import Frecuencia
from src.tareas.schemas import TareaBase, TareaCreate
from src.tareas.services import crear_tarea


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
