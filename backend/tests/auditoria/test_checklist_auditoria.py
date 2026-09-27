import io
from datetime import date
from fastapi import UploadFile
from sqlalchemy.orm import Session
from tests.database import session
from src.auditoria.models import AccionAuditoria
from src.auditoria.services import listar_auditorias
from src.checklist import schemas
from src.checklist.services import (
    completar_tarea,
    eliminar_imagen_tarea,
    generar_checklist,
    guardar_archivo_imagen_tarea,
)


def _generar(session: Session):
    return generar_checklist(
        session, schemas.ChecklistGenerar(fecha=date.today(), responsable_legajo=1)
    )


def _png() -> UploadFile:
    return UploadFile(file=io.BytesIO(b"\x89PNG-fake"), filename="evidencia.png")


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
        schemas.CompletarTareaSchema(responsable_legajo=1),
    )

    registros = listar_auditorias(session, "checklist_items", item.id)
    por_campo = {r.campo: r for r in registros}
    assert por_campo["estado"].valor_previo == "pendiente"
    assert por_campo["estado"].valor_posterior == "realizado"
    assert por_campo["responsable_legajo"].valor_posterior == "1"
    assert all(r.accion == AccionAuditoria.MODIFICAR for r in registros)


def test_subir_y_eliminar_imagen_auditan(session: Session) -> None:
    checklist = _generar(session)
    item = checklist.items[0]

    subido = guardar_archivo_imagen_tarea(session, checklist.id, item.id, _png())
    ruta = subido.imagen
    eliminar_imagen_tarea(session, checklist.id, item.id)

    registros = listar_auditorias(session, "checklist_items", item.id)
    assert [r.campo for r in registros] == ["imagen", "imagen"]
    assert registros[0].valor_previo is None
    assert registros[0].valor_posterior == ruta
    assert registros[1].valor_previo == ruta
    assert registros[1].valor_posterior is None
