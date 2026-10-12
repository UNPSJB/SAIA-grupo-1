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
from src.tareas.services import crear_tarea, editar_tarea


def _plan_id(session: Session) -> int:
    return listar_planes(session)[0].id


def _tarea(session: Session, operador_legajo: int) -> TareaCreate:
    return TareaCreate(
        nombre="Lavado",
        descripcion="Lavar con detergente",
        frecuencia=Frecuencia.DIARIA,
        plan_id=_plan_id(session),
        operador_legajo=operador_legajo,
    )


def test_crear_tarea_asignada_a_un_operador(session: Session) -> None:
    tarea = crear_tarea(session, _tarea(session, operador_legajo=2))
    assert tarea.operador_legajo == 2
    assert tarea.nombre_operador == "Ana Dominguez"


def test_crear_tarea_sin_operador_falla() -> None:
    with pytest.raises(ValueError):
        TareaCreate(nombre="Lavado", descripcion="Lavar", frecuencia=Frecuencia.DIARIA, plan_id=1)


def test_crear_tarea_operador_inexistente_falla(session: Session) -> None:
    with pytest.raises(exceptions.OperadorInvalido):
        crear_tarea(session, _tarea(session, operador_legajo=9999))


def test_crear_tarea_asignada_a_un_administrador_falla(session: Session) -> None:
    admin = crear_personal(
        session,
        PersonalCreate(
            documento="40000001", nombre="Admin", apellido="Uno", email="admin.uno@gmail.com",
            capacidad=Capacidades.ADMINISTRAR, contrasenia="Clave1234",
        ),
    )
    with pytest.raises(exceptions.OperadorInvalido):
        crear_tarea(session, _tarea(session, operador_legajo=admin.legajo))


def test_crear_tarea_asignada_a_un_operador_inactivo_falla(session: Session) -> None:
    actualizar_personal(session, 2, PersonalUpdate(activo=False))
    with pytest.raises(exceptions.OperadorInvalido):
        crear_tarea(session, _tarea(session, operador_legajo=2))


def test_editar_tarea_sin_operador_conserva_el_asignado(session: Session) -> None:
    tarea = crear_tarea(session, _tarea(session, operador_legajo=2))
    editada = editar_tarea(
        session, tarea.id, TareaUpdate(nombre="Lavado profundo", frecuencia=Frecuencia.DIARIA)
    )
    assert editada.nombre == "Lavado profundo"
    assert editada.operador_legajo == 2


def test_editar_tarea_reasigna_operador(session: Session) -> None:
    tarea = crear_tarea(session, _tarea(session, operador_legajo=2))
    editada = editar_tarea(
        session, tarea.id, TareaUpdate(frecuencia=Frecuencia.DIARIA, operador_legajo=1)
    )
    assert editada.operador_legajo == 1


def test_crear_plan_con_tarea_de_operador_invalido_falla(session: Session) -> None:
    with pytest.raises(exceptions.OperadorInvalido):
        crear_plan(
            session,
            PlanDeLimpiezaCreate(
                nombre="PlanHeladera",
                fecha_inicio=date.today(),
                equipo_id=1,
                tareas=[
                    TareaBase(nombre="Lavado", descripcion="Lavar", frecuencia=Frecuencia.DIARIA, operador_legajo=9999)
                ],
            ),
        )
