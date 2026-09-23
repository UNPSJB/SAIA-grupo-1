from datetime import date, timedelta
import pytest
from sqlalchemy.orm import Session
from tests.database import session
from src.checklist import exceptions, models, schemas
from src.checklist.services import (
    actualizar_tarea,
    completar_tarea,
    eliminar_checklist,
    generar_checklist,
    listar_checklists,
    obtener_checklist,
    restaurar_checklist,
    undelete_checklist,
)
from src.plan_De_limpieza.models import Plan_de_Limpieza
from src.tareas.models import Frecuencia


def test_generar_checklist_automatico(session: Session) -> None:
    hoy = date.today()
    checklist = generar_checklist(
        session, schemas.ChecklistGenerar(fecha=hoy, responsable_legajo=1)
    )

    assert checklist.id is not None
    assert checklist.fecha == hoy
    assert checklist.activo is True
    assert checklist.responsable_legajo == 1
    assert checklist.nombre_responsable == "Juan Perez"
    assert checklist.total_tareas >= 1
    assert checklist.estado == models.EstadoGeneralChecklist.PENDIENTE
    assert checklist.porcentaje_cumplimiento == 0.0

    for item in checklist.items:
        assert item.estado == models.EstadoTareaItem.PENDIENTE
        assert item.nombre_plan == "PlanFreezer"
        assert item.nombre_tarea in ["Desinfeccion", "Descongelar"]
        assert item.frecuencia in [Frecuencia.DIARIO, Frecuencia.SEMANAL]
        assert item.responsable_legajo is None
        assert item.fecha_hora_fin is None


def test_generar_checklist_responsable_invalido(session: Session) -> None:
    hoy = date.today()
    with pytest.raises(exceptions.ResponsableNoEncontrado):
        generar_checklist(
            session, schemas.ChecklistGenerar(fecha=hoy, responsable_legajo=9999)
        )


def test_inmutabilidad_checklist(session: Session) -> None:
    hoy = date.today()
    checklist = generar_checklist(
        session, schemas.ChecklistGenerar(fecha=hoy, responsable_legajo=1)
    )
    primer_item = checklist.items[0]
    nombre_original = primer_item.nombre_tarea
    plan_original = primer_item.nombre_plan

    tarea_original = session.query(Plan_de_Limpieza).first().tareas[0]
    tarea_original.nombre = "NuevoNombre"
    session.commit()

    checklist_recargado = obtener_checklist(session, checklist.id)
    assert checklist_recargado.items[0].nombre_tarea == nombre_original
    assert checklist_recargado.items[0].nombre_plan == plan_original


def test_completar_tarea(session: Session) -> None:
    hoy = date.today()
    checklist = generar_checklist(
        session, schemas.ChecklistGenerar(fecha=hoy, responsable_legajo=1)
    )
    item = checklist.items[0]

    datos_completar = schemas.CompletarTareaSchema(
        responsable_legajo=1,
        imagen="http://localhost:8000/imagenes/evidencia.jpg",
        insumos_utilizados=[
            schemas.InsumoUtilizadoPlaceholder(nombre="Alcohol 70%", cantidad=150.0, unidad="mililitros"),
            schemas.InsumoUtilizadoPlaceholder(nombre="Bobina papel", cantidad=2.0, unidad="unidades"),
        ],
    )

    item_completado = completar_tarea(session, checklist.id, item.id, datos_completar)

    assert item_completado.estado == models.EstadoTareaItem.REALIZADO
    assert item_completado.responsable_legajo == 1
    assert item_completado.nombre_responsable == "Juan Perez"
    assert item_completado.imagen == "http://localhost:8000/imagenes/evidencia.jpg"
    assert item_completado.fecha_hora_fin is not None

    schema_item = schemas.ChecklistItem.model_validate(item_completado)
    assert len(schema_item.insumos_utilizados) == 2
    assert schema_item.insumos_utilizados[0].nombre == "Alcohol 70%"

    with pytest.raises(exceptions.TareaYaCompletada):
        completar_tarea(session, checklist.id, item.id, datos_completar)


def test_actualizar_tarea_campos_permitidos(session: Session) -> None:
    hoy = date.today()
    checklist = generar_checklist(
        session, schemas.ChecklistGenerar(fecha=hoy, responsable_legajo=1)
    )
    item = checklist.items[0]

    datos_actualizar = schemas.ChecklistItemUpdate(
        responsable_legajo=1,
        imagen="http://servidor/nueva_foto.png",
        insumos_utilizados=[
            schemas.InsumoUtilizadoPlaceholder(nombre="Lavandina", cantidad=1.5, unidad="litros")
        ],
        estado=models.EstadoTareaItem.REALIZADO,
    )

    item_actualizado = actualizar_tarea(session, checklist.id, item.id, datos_actualizar)
    assert item_actualizado.responsable_legajo == 1
    assert item_actualizado.imagen == "http://servidor/nueva_foto.png"
    assert item_actualizado.estado == models.EstadoTareaItem.REALIZADO
    assert item_actualizado.fecha_hora_fin is not None

    schema_item = schemas.ChecklistItem.model_validate(item_actualizado)
    assert len(schema_item.insumos_utilizados) == 1
    assert schema_item.insumos_utilizados[0].nombre == "Lavandina"

    datos_reset = schemas.ChecklistItemUpdate(
        estado=models.EstadoTareaItem.PENDIENTE
    )
    item_reset = actualizar_tarea(session, checklist.id, item.id, datos_reset)
    assert item_reset.estado == models.EstadoTareaItem.PENDIENTE
    assert item_reset.fecha_hora_fin is None
    assert item_reset.responsable_legajo == 1


def test_completar_tarea_responsable_invalido(session: Session) -> None:
    hoy = date.today()
    checklist = generar_checklist(
        session, schemas.ChecklistGenerar(fecha=hoy, responsable_legajo=1)
    )
    item = checklist.items[0]

    with pytest.raises(exceptions.ResponsableNoEncontrado):
        completar_tarea(
            session,
            checklist.id,
            item.id,
            schemas.CompletarTareaSchema(responsable_legajo=9999),
        )


def test_estado_y_porcentaje_cumplimiento(session: Session) -> None:
    hoy = date.today()
    checklist = generar_checklist(
        session, schemas.ChecklistGenerar(fecha=hoy, responsable_legajo=1)
    )

    total = checklist.total_tareas
    assert checklist.porcentaje_cumplimiento == 0.0

    for item in checklist.items:
        completar_tarea(
            session,
            checklist.id,
            item.id,
            schemas.CompletarTareaSchema(responsable_legajo=1),
        )

    session.refresh(checklist)
    assert checklist.tareas_completadas == total
    assert checklist.porcentaje_cumplimiento == 100.0
    assert checklist.estado == models.EstadoGeneralChecklist.COMPLETADO


def test_estado_vencido_vs_pendiente_por_frecuencia(session: Session) -> None:
    hoy = date.today()

    checklist_4_dias = models.Checklist(
        fecha=hoy - timedelta(days=4),
        activo=True,
        responsable_legajo=1,
        items=[
            models.ChecklistItem(
                nombre_plan="PlanTest",
                nombre_tarea="TareaSemanal",
                frecuencia=Frecuencia.SEMANAL,
                estado=models.EstadoTareaItem.PENDIENTE,
            )
        ],
    )
    session.add(checklist_4_dias)
    session.commit()
    session.refresh(checklist_4_dias)

    assert checklist_4_dias.estado == models.EstadoGeneralChecklist.PENDIENTE

    checklist_7_dias = models.Checklist(
        fecha=hoy - timedelta(days=7),
        activo=True,
        responsable_legajo=1,
        items=[
            models.ChecklistItem(
                nombre_plan="PlanTest",
                nombre_tarea="TareaSemanal",
                frecuencia=Frecuencia.SEMANAL,
                estado=models.EstadoTareaItem.PENDIENTE,
            )
        ],
    )
    session.add(checklist_7_dias)
    session.commit()
    session.refresh(checklist_7_dias)

    assert checklist_7_dias.estado == models.EstadoGeneralChecklist.VENCIDO

    checklist_diario_vencido = models.Checklist(
        fecha=hoy - timedelta(days=1),
        activo=True,
        responsable_legajo=1,
        items=[
            models.ChecklistItem(
                nombre_plan="PlanTest",
                nombre_tarea="TareaDiaria",
                frecuencia=Frecuencia.DIARIO,
                estado=models.EstadoTareaItem.PENDIENTE,
            )
        ],
    )
    session.add(checklist_diario_vencido)
    session.commit()
    session.refresh(checklist_diario_vencido)

    assert checklist_diario_vencido.estado == models.EstadoGeneralChecklist.VENCIDO


def test_baja_logica_checklist(session: Session) -> None:
    hoy = date.today()
    checklist = generar_checklist(
        session, schemas.ChecklistGenerar(fecha=hoy, responsable_legajo=1)
    )
    checklist_id = checklist.id

    checklists_antes = listar_checklists(session)
    assert any(c.id == checklist_id for c in checklists_antes)

    checklist_eliminado = eliminar_checklist(session, checklist_id)
    assert checklist_eliminado.activo is False

    checklists_despues = listar_checklists(session)
    assert not any(c.id == checklist_id for c in checklists_despues)

    with pytest.raises(exceptions.ChecklistNoEncontrado):
        obtener_checklist(session, checklist_id)


def test_restaurar_checklist_undelete(session: Session) -> None:
    hoy = date.today()
    checklist = generar_checklist(
        session, schemas.ChecklistGenerar(fecha=hoy, responsable_legajo=1)
    )
    checklist_id = checklist.id

    eliminar_checklist(session, checklist_id)
    assert not any(c.id == checklist_id for c in listar_checklists(session))
    assert any(c.id == checklist_id for c in listar_checklists(session, incluir_inactivos=True))

    restaurado = restaurar_checklist(session, checklist_id)
    assert restaurado.activo is True
    assert any(c.id == checklist_id for c in listar_checklists(session))

    eliminar_checklist(session, checklist_id)
    restaurado_alias = undelete_checklist(session, checklist_id)
    assert restaurado_alias.activo is True


def test_restaurar_checklist_ya_activo(session: Session) -> None:
    hoy = date.today()
    checklist = generar_checklist(
        session, schemas.ChecklistGenerar(fecha=hoy, responsable_legajo=1)
    )
    with pytest.raises(exceptions.ChecklistYaActivo):
        restaurar_checklist(session, checklist.id)


def test_restaurar_checklist_no_encontrado(session: Session) -> None:
    with pytest.raises(exceptions.ChecklistNoEncontrado):
        restaurar_checklist(session, 99999)
