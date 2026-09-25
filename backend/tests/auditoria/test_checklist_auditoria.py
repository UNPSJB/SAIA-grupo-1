from datetime import date
from sqlalchemy.orm import Session
from tests.database import session
from src.auditoria.models import AccionAuditoria
from src.auditoria.services import listar_auditorias
from src.checklist import schemas
from src.checklist.services import (
    actualizar_tarea,
    completar_tarea,
    eliminar_checklist,
    generar_checklist,
    restaurar_checklist,
)


def _generar(session: Session):
    return generar_checklist(
        session, schemas.ChecklistGenerar(fecha=date.today(), responsable_legajo=1)
    )


def test_generar_checklist_audita_creacion(session: Session) -> None:
    checklist = _generar(session)

    registros = listar_auditorias(session, "checklists", checklist.id)
    assert len(registros) == 1
    assert registros[0].accion == AccionAuditoria.CREAR


def test_completar_tarea_audita_cambios(session: Session) -> None:
    checklist = _generar(session)
    item = checklist.items[0]

    completar_tarea(
        session,
        checklist.id,
        item.id,
        schemas.CompletarTareaSchema(
            responsable_legajo=1, imagen="http://localhost/evidencia.jpg"
        ),
    )

    registros = listar_auditorias(session, "checklist_items", item.id)
    por_campo = {r.campo: r for r in registros}
    assert por_campo["estado"].valor_previo == "pendiente"
    assert por_campo["estado"].valor_posterior == "realizado"
    assert por_campo["imagen"].valor_previo is None
    assert por_campo["imagen"].valor_posterior == "http://localhost/evidencia.jpg"
    assert all(r.accion == AccionAuditoria.MODIFICAR for r in registros)


def test_actualizar_tarea_solo_audita_campos_que_cambian(session: Session) -> None:
    checklist = _generar(session)
    item = checklist.items[0]

    actualizar_tarea(
        session,
        checklist.id,
        item.id,
        schemas.ChecklistItemUpdate(imagen="http://localhost/a.jpg"),
    )

    registros = listar_auditorias(session, "checklist_items", item.id)
    assert [r.campo for r in registros] == ["imagen"]


def test_baja_y_restauracion_auditan(session: Session) -> None:
    checklist = _generar(session)

    eliminar_checklist(session, checklist.id)
    restaurar_checklist(session, checklist.id)

    registros = listar_auditorias(session, "checklists", checklist.id)
    assert [r.accion for r in registros] == [
        AccionAuditoria.CREAR,
        AccionAuditoria.ELIMINAR,
        AccionAuditoria.MODIFICAR,
    ]
    assert registros[1].valor_previo == "True"
    assert registros[1].valor_posterior == "False"
