from datetime import date
from sqlalchemy.orm import Session

from tests.database import session
from src.checklist.services import generar_checklist, completar_tarea
from src.checklist.schemas import ChecklistGenerar, CompletarTareaSchema, InsumoUtilizadoPlaceholder
from src.dashboard import services


def test_cumplimiento_actual_sin_checklists(session: Session) -> None:
    resumen = services.obtener_cumplimiento_actual(session, "semana")
    assert resumen.hechas == 0
    assert resumen.pendientes == 0
    assert resumen.porcentaje == 0.0


def test_cumplimiento_actual_con_checklist_parcial(session: Session) -> None:
    checklist = generar_checklist(
        session, ChecklistGenerar(responsable_legajo=1, fecha=date.today())
    )
    primer_item = checklist.items[0]
    completar_tarea(
        session,
        checklist.id,
        primer_item.id,
        CompletarTareaSchema(responsable_legajo=1, insumos_utilizados=[]),
    )

    resumen = services.obtener_cumplimiento_actual(session, "semana")
    assert resumen.hechas == 1
    assert resumen.pendientes == len(checklist.items) - 1
    assert resumen.porcentaje == round(100 / len(checklist.items), 1)


def test_consumo_insumos_agrega_por_nombre(session: Session) -> None:
    checklist = generar_checklist(
        session, ChecklistGenerar(responsable_legajo=1, fecha=date.today())
    )
    items = checklist.items
    completar_tarea(
        session,
        checklist.id,
        items[0].id,
        CompletarTareaSchema(
            responsable_legajo=1,
            insumos_utilizados=[
                InsumoUtilizadoPlaceholder(nombre="Lavandina", cantidad=2, unidad="L"),
            ],
        ),
    )
    if len(items) > 1:
        completar_tarea(
            session,
            checklist.id,
            items[1].id,
            CompletarTareaSchema(
                responsable_legajo=1,
                insumos_utilizados=[
                    InsumoUtilizadoPlaceholder(nombre="lavandina", cantidad=1, unidad="L"),
                ],
            ),
        )

    consumo = services.obtener_consumo_insumos(session, "semana")
    assert len(consumo) == 1
    assert consumo[0].nombre.lower() == "lavandina"
    esperado = 3 if len(items) > 1 else 2
    assert consumo[0].cantidad == esperado


def test_resumen_combina_todo(session: Session) -> None:
    resumen = services.obtener_resumen(session, "mes")
    assert resumen.cumplimiento_actual.porcentaje == 0.0
    assert resumen.consumo_insumos == []


def test_cumplimiento_periodo_dia(session: Session) -> None:
    checklist = generar_checklist(
        session, ChecklistGenerar(responsable_legajo=1, fecha=date.today())
    )
    resumen = services.obtener_cumplimiento_actual(session, "dia")
    assert resumen.hechas == 0
    assert resumen.pendientes == len(checklist.items)
    assert resumen.vencidas == 0


def test_cumplimiento_refleja_tareas_vencidas(session: Session) -> None:
    from datetime import timedelta
    from src.checklist import models
    from src.tareas.models import Frecuencia

    hoy = date.today()
    # Checklist de hace 3 dias con una diaria (vencida) y una semanal (pendiente aun)
    chk_pasado = models.Checklist(
        fecha=hoy - timedelta(days=3),
        responsable_legajo=1,
        activo=True,
        items=[
            models.ChecklistItem(
                nombre_plan="PlanTest",
                nombre_tarea="TareaDiariaPasada",
                frecuencia=Frecuencia.DIARIA,
                estado=models.EstadoTareaItem.PENDIENTE,
            ),
            models.ChecklistItem(
                nombre_plan="PlanTest",
                nombre_tarea="TareaSemanalPasada",
                frecuencia=Frecuencia.SEMANAL,
                estado=models.EstadoTareaItem.PENDIENTE,
            ),
        ],
    )
    session.add(chk_pasado)
    session.commit()

    resumen = services.obtener_cumplimiento_actual(session, "semana")
    assert resumen.vencidas >= 1
    assert resumen.pendientes >= 1


def test_consumo_insumos_filtra_por_unidad(session: Session) -> None:
    checklist = generar_checklist(
        session, ChecklistGenerar(responsable_legajo=1, fecha=date.today())
    )
    items = checklist.items
    completar_tarea(
        session,
        checklist.id,
        items[0].id,
        CompletarTareaSchema(
            responsable_legajo=1,
            insumos_utilizados=[
                InsumoUtilizadoPlaceholder(nombre="Lavandina", cantidad=5, unidad="L"),
                InsumoUtilizadoPlaceholder(nombre="Bobina papel", cantidad=2, unidad="UN"),
            ],
        ),
    )

    unidades = services.obtener_unidades_insumos(session, "semana")
    assert "L" in unidades
    assert "UN" in unidades

    consumo_l = services.obtener_consumo_insumos(session, "semana", unidad="L")
    assert any(c.nombre.lower() == "lavandina" and c.unidad == "L" for c in consumo_l)
    assert not any(c.unidad == "UN" for c in consumo_l)

    consumo_un = services.obtener_consumo_insumos(session, "semana", unidad="UN")
    assert any(c.nombre.lower() == "bobina papel" and c.unidad == "UN" for c in consumo_un)
    assert not any(c.unidad == "L" for c in consumo_un)
