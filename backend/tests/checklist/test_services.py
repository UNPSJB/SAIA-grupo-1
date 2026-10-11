import io
from datetime import date, timedelta
import pytest
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile as StarletteUploadFile
from tests.database import session
from src.checklist import exceptions, models, schemas
from src.checklist.services import (
    completar_tarea,
    eliminar_imagen_tarea,
    generar_checklist,
    guardar_archivo_imagen_tarea,
    listar_checklists,
    obtener_checklist,
    obtener_tarea,
    tarea_corresponde_a_fecha,
)
from src.plan_De_limpieza.models import Plan_de_Limpieza
from src.tareas.models import Frecuencia, Tarea


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
        assert item.frecuencia in [Frecuencia.DIARIA, Frecuencia.SEMANAL]
        assert item.responsable_legajo == 1
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
        insumos_utilizados=[
            schemas.InsumoUtilizadoPlaceholder(nombre="Alcohol 70%", cantidad=150.0, unidad="mililitros"),
            schemas.InsumoUtilizadoPlaceholder(nombre="Bobina papel", cantidad=2.0, unidad="unidades"),
        ],
    )

    item_completado = completar_tarea(session, checklist.id, item.id, datos_completar)

    assert item_completado.estado == models.EstadoTareaItem.REALIZADO
    assert item_completado.responsable_legajo == 1
    assert item_completado.nombre_responsable == "Juan Perez"
    assert item_completado.fecha_hora_fin is not None

    schema_item = schemas.ChecklistItem.model_validate(item_completado)
    assert len(schema_item.insumos_utilizados) == 2
    assert schema_item.insumos_utilizados[0].nombre == "Alcohol 70%"

    with pytest.raises(exceptions.TareaYaCompletada):
        completar_tarea(session, checklist.id, item.id, datos_completar)


def test_obtener_tarea(session: Session) -> None:
    hoy = date.today()
    checklist = generar_checklist(
        session, schemas.ChecklistGenerar(fecha=hoy, responsable_legajo=1)
    )
    item = checklist.items[0]
    obtenido = obtener_tarea(session, checklist.id, item.id)
    assert obtenido.id == item.id
    assert obtenido.checklist_id == checklist.id

    with pytest.raises(exceptions.TareaChecklistNoEncontrada):
        obtener_tarea(session, checklist.id, 99999)



def test_guardar_y_eliminar_archivo_imagen_tarea(session: Session) -> None:
    hoy = date.today()
    checklist = generar_checklist(
        session, schemas.ChecklistGenerar(fecha=hoy, responsable_legajo=1)
    )
    item = checklist.items[0]

    archivo = StarletteUploadFile(
        filename="foto_test.png",
        file=io.BytesIO(b"fake image content"),
        headers={"content-type": "image/png"},
    )
    item_con_img = guardar_archivo_imagen_tarea(session, checklist.id, item.id, archivo)
    assert item_con_img.imagen is not None
    assert item_con_img.imagen.startswith("/checklist/imagenes/")

    item_sin_img = eliminar_imagen_tarea(session, checklist.id, item.id)
    assert item_sin_img.imagen is None


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
                frecuencia=Frecuencia.DIARIA,
                estado=models.EstadoTareaItem.PENDIENTE,
            )
        ],
    )
    session.add(checklist_diario_vencido)
    session.commit()
    session.refresh(checklist_diario_vencido)

    assert checklist_diario_vencido.estado == models.EstadoGeneralChecklist.VENCIDO


def test_checklist_vencido_no_admite_modificaciones(session: Session) -> None:
    hoy = date.today()
    checklist_vencido = models.Checklist(
        fecha=hoy - timedelta(days=2),
        activo=True,
        responsable_legajo=1,
        items=[
            models.ChecklistItem(
                nombre_plan="PlanTest",
                nombre_tarea="TareaDiaria",
                frecuencia=Frecuencia.DIARIA,
                estado=models.EstadoTareaItem.PENDIENTE,
            )
        ],
    )
    session.add(checklist_vencido)
    session.commit()
    session.refresh(checklist_vencido)

    with pytest.raises(exceptions.ChecklistNoModificable):
        completar_tarea(
            session,
            checklist_vencido.id,
            checklist_vencido.items[0].id,
            schemas.CompletarTareaSchema(responsable_legajo=1),
        )

    archivo = StarletteUploadFile(
        filename="foto.png",
        file=io.BytesIO(b"abc"),
        headers={"content-type": "image/png"},
    )
    with pytest.raises(exceptions.ChecklistNoModificable):
        guardar_archivo_imagen_tarea(
            session,
            checklist_vencido.id,
            checklist_vencido.items[0].id,
            archivo,
        )


def test_listar_checklists_rango_fechas(session: Session) -> None:
    hoy = date.today()
    checklist = generar_checklist(
        session, schemas.ChecklistGenerar(fecha=hoy, responsable_legajo=1)
    )

    resultados_ok = listar_checklists(session, fecha_desde=hoy, fecha_hasta=hoy)
    assert any(c.id == checklist.id for c in resultados_ok)

    resultados_vacio = listar_checklists(
        session,
        fecha_desde=hoy - timedelta(days=20),
        fecha_hasta=hoy - timedelta(days=10),
    )
    assert not any(c.id == checklist.id for c in resultados_vacio)

    with pytest.raises(exceptions.RangoFechasInvalido):
        listar_checklists(
            session,
            fecha_desde=hoy,
            fecha_hasta=hoy - timedelta(days=1),
        )


def test_listar_checklists_filtro_estado(session: Session) -> None:
    hoy = date.today()
    checklist = generar_checklist(
        session, schemas.ChecklistGenerar(fecha=hoy, responsable_legajo=1)
    )

    pendientes = listar_checklists(session, estado="pendiente")
    assert any(c.id == checklist.id for c in pendientes)

    completados = listar_checklists(session, estado="completado")
    assert not any(c.id == checklist.id for c in completados)

    vencidos = listar_checklists(session, estado="vencido")
    assert not any(c.id == checklist.id for c in vencidos)


def test_generar_checklist_fecha_pasada_falla(session: Session) -> None:
    pasado = date.today() - timedelta(days=1)
    with pytest.raises(exceptions.ChecklistFechaPasada):
        generar_checklist(
            session, schemas.ChecklistGenerar(fecha=pasado, responsable_legajo=1)
        )


def test_generar_tareas_cuando_se_saltean_dias(session: Session) -> None:
    hoy = date.today()
    fecha_inicio = hoy - timedelta(days=8)

    from src.equipos.services import listar_equipos
    equipo = listar_equipos(session)[0]

    plan = Plan_de_Limpieza(
        nombre="PlanSalteoDias",
        fecha_inicio=fecha_inicio,
        equipo_id=equipo.id,
    )
    session.add(plan)
    session.flush()

    tarea_semanal = Tarea(
        nombre="LimpiezaSemanalEspecial",
        descripcion="Procedimiento semanal",
        frecuencia=Frecuencia.SEMANAL,
        plan_id=plan.id,
        personal_id=1,
    )
    session.add(tarea_semanal)
    session.commit()

    # Dia 0 del plan (hace 8 dias): simular checklist previo directamente en la base
    chk_pasado = models.Checklist(
        fecha=fecha_inicio,
        responsable_legajo=1,
        activo=True,
        items=[
            models.ChecklistItem(
                plan_id=plan.id,
                nombre_plan=plan.nombre,
                tarea_id=tarea_semanal.id,
                nombre_tarea=tarea_semanal.nombre,
                frecuencia=Frecuencia.SEMANAL,
                estado=models.EstadoTareaItem.REALIZADO,
            )
        ],
    )
    session.add(chk_pasado)
    session.commit()

    # Verificamos logica de correspondencia en dias intermedios:
    # Dia 1 (hace 7 dias): no corresponde porque ya se hizo en ciclo 0
    assert not tarea_corresponde_a_fecha(
        Frecuencia.SEMANAL, fecha_inicio, fecha_inicio + timedelta(days=1), db=session, tarea_id=tarea_semanal.id
    )
    # Dias 2 al 7 no hubo checklist.
    # Hoy (dia 8 del plan, ciclo 1): pasaron 8 dias sin ejecutarse, DEBE corresponder!
    assert tarea_corresponde_a_fecha(
        Frecuencia.SEMANAL, fecha_inicio, hoy, db=session, tarea_id=tarea_semanal.id
    )

    # Al generar el checklist de hoy, la tarea semanal DEBE generarse en el checklist
    chk_hoy = generar_checklist(
        session, schemas.ChecklistGenerar(responsable_legajo=1)
    )
    nombres_hoy = [item.nombre_tarea for item in chk_hoy.items]
    assert "LimpiezaSemanalEspecial" in nombres_hoy


def test_checklist_no_vence_mientras_haya_tareas_pendientes_no_vencidas(session: Session) -> None:
    hoy = date.today()
    # Checklist creado hace 2 dias con una tarea diaria y una tarea semanal
    checklist = models.Checklist(
        fecha=hoy - timedelta(days=2),
        responsable_legajo=1,
        activo=True,
        items=[
            models.ChecklistItem(
                nombre_plan="PlanTest",
                nombre_tarea="TareaDiaria",
                frecuencia=Frecuencia.DIARIA,
                estado=models.EstadoTareaItem.PENDIENTE,
            ),
            models.ChecklistItem(
                nombre_plan="PlanTest",
                nombre_tarea="TareaSemanal",
                frecuencia=Frecuencia.SEMANAL,
                estado=models.EstadoTareaItem.PENDIENTE,
            ),
        ],
    )
    session.add(checklist)
    session.commit()
    session.refresh(checklist)

    # La diaria vencio (2 >= 1 dias), pero la semanal NO vencio (2 < 7 dias).
    # Por lo tanto, el checklist NO pasa a vencido: permanece PENDIENTE.
    assert checklist.estado == models.EstadoGeneralChecklist.PENDIENTE

    # Se puede completar la tarea semanal sin que lance ChecklistNoModificable
    tarea_semanal = next(it for it in checklist.items if it.nombre_tarea == "TareaSemanal")
    item_completado = completar_tarea(
        session,
        checklist.id,
        tarea_semanal.id,
        schemas.CompletarTareaSchema(responsable_legajo=1),
    )
    assert item_completado.estado == models.EstadoTareaItem.REALIZADO

    session.refresh(checklist)
    # Ahora que la semanal fue completada, la unica pendiente es la diaria que esta vencida.
    # Como ya no quedan tareas pendientes no vencidas, ahora si pasa a VENCIDO.
    assert checklist.estado == models.EstadoGeneralChecklist.VENCIDO





