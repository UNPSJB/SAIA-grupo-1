import io
from datetime import date, timedelta
import pytest
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.datastructures import Headers
from tests.database import session
from src.checklist import exceptions, models, schemas
from src.checklist.services import (
    completar_tarea,
    eliminar_imagen_tarea,
    generar_checklist,
    guardar_archivo_imagen_tarea,
    listar_checklists,
    marcar_tarea_no_realizada,
    obtener_checklist,
    obtener_tarea,
    reasignar_tarea,
    tarea_corresponde_a_fecha,
)
from src.exceptions import PermissionDenied
from src.personal.models import Personal
from src.personal.schemas import Capacidades
from src.auditoria.models import AccionAuditoria
from src.auditoria.services import listar_auditorias
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

    plan = session.query(Plan_de_Limpieza).first()
    assert plan is not None
    tarea_original = plan.tareas[0]
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

    archivo = UploadFile(
        filename="foto_test.png",
        file=io.BytesIO(b"fake image content"),
        headers=Headers({"content-type": "image/png"}),
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

    assert checklist_vencido.estado == models.EstadoGeneralChecklist.VENCIDO
    assert checklist_vencido.items[0].estado == models.EstadoTareaItem.VENCIDO
    assert checklist_vencido.tareas_vencidas == 1
    assert checklist_vencido.tareas_pendientes == 0

    with pytest.raises(exceptions.ChecklistNoModificable):
        completar_tarea(
            session,
            checklist_vencido.id,
            checklist_vencido.items[0].id,
            schemas.CompletarTareaSchema(responsable_legajo=1),
        )

    with pytest.raises(exceptions.ChecklistNoModificable):
        marcar_tarea_no_realizada(
            session,
            checklist_vencido.id,
            checklist_vencido.items[0].id,
            1,
            schemas.MarcarNoRealizadaSchema(motivo=models.MotivoNoRealizado.EQUIPO_FUERA_DE_USO),
        )

    archivo = UploadFile(
        filename="foto.png",
        file=io.BytesIO(b"abc"),
        headers=Headers({"content-type": "image/png"}),
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

# ---------------------------------------------------------------- un checklist por operador y por dia


def test_generar_checklist_dos_veces_el_mismo_dia_falla(session: Session) -> None:
    generar_checklist(session, schemas.ChecklistGenerar(responsable_legajo=1))
    with pytest.raises(exceptions.ChecklistYaGenerado):
        generar_checklist(session, schemas.ChecklistGenerar(responsable_legajo=1))


def test_listar_checklists_filtra_por_responsable(session: Session) -> None:
    # Ana (legajo 2) es operadora: le asignamos una tarea propia
    plan = session.query(Plan_de_Limpieza).filter_by(nombre="PlanFreezer").one()
    session.add(Tarea(nombre="TareaDeAna", descripcion="Limpiar burletes", frecuencia=Frecuencia.DIARIA,
                      plan_id=plan.id, personal_id=2))
    session.commit()

    de_juan = generar_checklist(session, schemas.ChecklistGenerar(responsable_legajo=1))
    de_ana = generar_checklist(session, schemas.ChecklistGenerar(responsable_legajo=2))

    assert [item.nombre_tarea for item in de_ana.items] == ["TareaDeAna"]
    assert [c.id for c in listar_checklists(session, responsable_legajo=2)] == [de_ana.id]
    todos = [c.id for c in listar_checklists(session)]
    assert de_juan.id in todos and de_ana.id in todos


def test_marcar_tarea_no_realizada_motivos_frecuentes(session: Session) -> None:
    checklist = generar_checklist(session, schemas.ChecklistGenerar(responsable_legajo=1))
    item = checklist.items[0]

    resultado = marcar_tarea_no_realizada(
        session,
        checklist.id,
        item.id,
        schemas.MarcarNoRealizadaSchema(
            motivo=models.MotivoNoRealizado.EQUIPO_FUERA_DE_USO,
            observacion="El motor se encuentra averiado",
        ),
        usuario_legajo=1,
    )

    assert resultado.estado == models.EstadoTareaItem.NO_REALIZADO
    assert resultado.motivo_no_realizado == models.MotivoNoRealizado.EQUIPO_FUERA_DE_USO
    assert resultado.observacion_no_realizado == "El motor se encuentra averiado"
    assert resultado.responsable_legajo == 1
    assert resultado.fecha_hora_no_realizado is not None


def test_marcar_tarea_no_realizada_motivo_otro_requiere_observacion(session: Session) -> None:
    checklist = generar_checklist(session, schemas.ChecklistGenerar(responsable_legajo=1))
    item = checklist.items[0]

    with pytest.raises(exceptions.ObservacionObligatoriaParaOtro):
        marcar_tarea_no_realizada(
            session,
            checklist.id,
            item.id,
            schemas.MarcarNoRealizadaSchema(
                motivo=models.MotivoNoRealizado.OTRO,
                observacion="",
            ),
            usuario_legajo=1,
        )

    with pytest.raises(exceptions.ObservacionObligatoriaParaOtro):
        marcar_tarea_no_realizada(
            session,
            checklist.id,
            item.id,
            schemas.MarcarNoRealizadaSchema(
                motivo=models.MotivoNoRealizado.OTRO,
                observacion="   ",
            ),
            usuario_legajo=1,
        )

    resultado = marcar_tarea_no_realizada(
        session,
        checklist.id,
        item.id,
        schemas.MarcarNoRealizadaSchema(
            motivo=models.MotivoNoRealizado.OTRO,
            observacion="Corte de suministro eléctrico general en la planta",
        ),
        usuario_legajo=1,
    )
    assert resultado.estado == models.EstadoTareaItem.NO_REALIZADO
    assert resultado.observacion_no_realizado == "Corte de suministro eléctrico general en la planta"


def test_marcar_tarea_no_realizada_no_permite_modificar_justificacion(session: Session) -> None:
    checklist = generar_checklist(session, schemas.ChecklistGenerar(responsable_legajo=1))
    item = checklist.items[0]

    marcar_tarea_no_realizada(
        session,
        checklist.id,
        item.id,
        schemas.MarcarNoRealizadaSchema(
            motivo=models.MotivoNoRealizado.FALTA_DE_INSUMO,
            observacion="Sin desinfectante en depósito",
        ),
        usuario_legajo=1,
    )

    registros = listar_auditorias(session, "checklist_items", item.id)
    por_campo = {r.campo: r for r in registros}
    assert por_campo["estado"].valor_previo == "pendiente"
    assert por_campo["estado"].valor_posterior == "no_realizado"
    assert por_campo["motivo_no_realizado"].valor_posterior == "falta_de_insumo"
    assert por_campo["observacion_no_realizado"].valor_posterior == "Sin desinfectante en depósito"

    with pytest.raises(exceptions.TareaYaJustificada):
        marcar_tarea_no_realizada(
            session,
            checklist.id,
            item.id,
            schemas.MarcarNoRealizadaSchema(
                motivo=models.MotivoNoRealizado.EQUIPO_FUERA_DE_USO,
                observacion="En revisión técnica por mantenimiento",
            ),
            usuario_legajo=1,
        )


def test_cumplimiento_tareas_justificadas_cuentan_como_no_cumplidas(session: Session) -> None:
    checklist = generar_checklist(session, schemas.ChecklistGenerar(responsable_legajo=1))
    assert len(checklist.items) >= 2
    total = checklist.total_tareas
    item1 = checklist.items[0]

    completar_tarea(
        session,
        checklist.id,
        item1.id,
        schemas.CompletarTareaSchema(responsable_legajo=1),
    )
    session.refresh(checklist)
    assert checklist.tareas_completadas == 1
    assert checklist.tareas_no_realizadas == 0
    assert checklist.porcentaje_cumplimiento == round((1 / total) * 100.0, 1)
    assert checklist.estado == models.EstadoGeneralChecklist.PENDIENTE

    for item in checklist.items[1:]:
        marcar_tarea_no_realizada(
            session,
            checklist.id,
            item.id,
            schemas.MarcarNoRealizadaSchema(
                motivo=models.MotivoNoRealizado.EQUIPO_FUERA_DE_USO,
                observacion="Equipo detenido por calibración",
            ),
            usuario_legajo=1,
        )

    session.refresh(checklist)
    assert checklist.tareas_completadas == 1
    assert checklist.tareas_no_realizadas == total - 1
    assert checklist.tareas_pendientes == 0
    assert checklist.porcentaje_cumplimiento == round((1 / total) * 100.0, 1)
    assert checklist.estado == models.EstadoGeneralChecklist.COMPLETADO



def test_no_permitir_marcar_no_realizada_tarea_ya_completada(session: Session) -> None:
    checklist = generar_checklist(session, schemas.ChecklistGenerar(responsable_legajo=1))
    item = checklist.items[0]

    completar_tarea(
        session,
        checklist.id,
        item.id,
        schemas.CompletarTareaSchema(responsable_legajo=1),
    )

    with pytest.raises(exceptions.TareaYaCompletada):
        marcar_tarea_no_realizada(
            session,
            checklist.id,
            item.id,
            schemas.MarcarNoRealizadaSchema(
                motivo=models.MotivoNoRealizado.EQUIPO_FUERA_DE_USO,
            ),
            usuario_legajo=1,
        )


def _crear_admin_test(session: Session) -> Personal:
    admin = Personal(
        legajo=888,
        documento=88888888,
        nombre="Admin",
        apellido="Test",
        email="admin.test@saia.com",
        usuario="admintest",
        contrasenia_hash="hash",
        capacidad=Capacidades.ADMINISTRAR,
        activo=True,
    )
    session.add(admin)
    session.commit()
    return admin


def test_reasignar_tarea_pendiente_a_otro_operador_exitoso(session: Session) -> None:
    admin = _crear_admin_test(session)
    chk_origen = generar_checklist(session, schemas.ChecklistGenerar(responsable_legajo=1))
    item_origen = chk_origen.items[0]

    chk_destino = models.Checklist(
        fecha=date.today(),
        responsable_legajo=2,
        activo=True,
        items=[
            models.ChecklistItem(
                nombre_plan="Plan Ana",
                nombre_tarea="Tarea Ana",
                frecuencia=Frecuencia.DIARIA,
                estado=models.EstadoTareaItem.PENDIENTE,
                responsable_legajo=2,
            )
        ],
    )
    session.add(chk_destino)
    session.commit()

    resultado = reasignar_tarea(
        session,
        chk_origen.id,
        item_origen.id,
        schemas.ReasignarTareaSchema(nuevo_responsable_legajo=2, motivo="Refuerzo de turno"),
        admin,
    )

    assert resultado.estado == models.EstadoTareaItem.REASIGNADO
    session.refresh(chk_destino)
    assert chk_destino.tiene_reasignacion_no_leida is True
    assert len(chk_destino.items) == 2
    item_nuevo = chk_destino.items[1]
    assert item_nuevo.nombre_tarea == item_origen.nombre_tarea
    assert item_nuevo.estado == models.EstadoTareaItem.PENDIENTE
    assert item_nuevo.es_reasignada is True
    assert item_nuevo.responsable_legajo == 2

    session.refresh(chk_origen)
    assert chk_origen.tareas_completadas >= 1
    assert chk_origen.tareas_reasignadas >= 1


def test_operador_abre_checklist_y_limpia_indicador(session: Session) -> None:
    admin = _crear_admin_test(session)
    chk_origen = generar_checklist(session, schemas.ChecklistGenerar(responsable_legajo=1))
    item_origen = chk_origen.items[0]

    chk_destino = models.Checklist(
        fecha=date.today(),
        responsable_legajo=2,
        activo=True,
        items=[
            models.ChecklistItem(
                nombre_plan="Plan Ana",
                nombre_tarea="Tarea Ana",
                frecuencia=Frecuencia.DIARIA,
                estado=models.EstadoTareaItem.PENDIENTE,
                responsable_legajo=2,
            )
        ],
    )
    session.add(chk_destino)
    session.commit()

    reasignar_tarea(
        session,
        chk_origen.id,
        item_origen.id,
        schemas.ReasignarTareaSchema(nuevo_responsable_legajo=2),
        admin,
    )

    session.refresh(chk_destino)
    assert chk_destino.tiene_reasignacion_no_leida is True

    op2 = session.scalar(select(Personal).where(Personal.legajo == 2))
    chk_leido = obtener_checklist(session, chk_destino.id, usuario=op2)
    assert chk_leido.tiene_reasignacion_no_leida is False


def test_reasignar_tarea_no_realizada_a_misma_persona_exitoso(session: Session) -> None:
    admin = _crear_admin_test(session)
    chk = generar_checklist(session, schemas.ChecklistGenerar(responsable_legajo=1))
    item = chk.items[0]

    marcar_tarea_no_realizada(
        session,
        chk.id,
        item.id,
        schemas.MarcarNoRealizadaSchema(motivo=models.MotivoNoRealizado.FALTA_DE_INSUMO),
        usuario_legajo=1,
    )

    resultado = reasignar_tarea(
        session,
        chk.id,
        item.id,
        schemas.ReasignarTareaSchema(nuevo_responsable_legajo=1, motivo="Insumo repuesto"),
        admin,
    )

    assert resultado.estado == models.EstadoTareaItem.REASIGNADO
    session.refresh(chk)
    item_reemplazo = [it for it in chk.items if it.es_reasignada][0]
    assert item_reemplazo.estado == models.EstadoTareaItem.PENDIENTE
    assert item_reemplazo.responsable_legajo == 1


def test_reasignar_tarea_pendiente_a_misma_persona_rechazado(session: Session) -> None:
    admin = _crear_admin_test(session)
    chk = generar_checklist(session, schemas.ChecklistGenerar(responsable_legajo=1))
    item = chk.items[0]

    with pytest.raises(exceptions.ReasignarMismoOperadorSoloNoRealizada):
        reasignar_tarea(
            session,
            chk.id,
            item.id,
            schemas.ReasignarTareaSchema(nuevo_responsable_legajo=1),
            admin,
        )


def test_reasignar_tarea_vencida_rechazado(session: Session) -> None:
    admin = _crear_admin_test(session)
    chk = models.Checklist(
        fecha=date.today() - timedelta(days=2),
        responsable_legajo=1,
        activo=True,
        items=[
            models.ChecklistItem(
                nombre_plan="Plan Vencido",
                nombre_tarea="Tarea Diaria Pasada",
                frecuencia=Frecuencia.DIARIA,
                estado=models.EstadoTareaItem.PENDIENTE,
                responsable_legajo=1,
            )
        ],
    )
    session.add(chk)
    session.commit()

    with pytest.raises(exceptions.TareaVencidaNoReasignable):
        reasignar_tarea(
            session,
            chk.id,
            chk.items[0].id,
            schemas.ReasignarTareaSchema(nuevo_responsable_legajo=2),
            admin,
        )


def test_reasignar_tarea_completada_o_reasignada_rechazado(session: Session) -> None:
    admin = _crear_admin_test(session)
    chk = generar_checklist(session, schemas.ChecklistGenerar(responsable_legajo=1))
    item = chk.items[0]

    completar_tarea(
        session,
        chk.id,
        item.id,
        schemas.CompletarTareaSchema(responsable_legajo=1),
    )

    with pytest.raises(exceptions.TareaNoReasignablePorEstado):
        reasignar_tarea(
            session,
            chk.id,
            item.id,
            schemas.ReasignarTareaSchema(nuevo_responsable_legajo=2),
            admin,
        )


def test_reasignar_a_operador_sin_checklist_del_dia_rechazado(session: Session) -> None:
    admin = _crear_admin_test(session)
    chk = generar_checklist(session, schemas.ChecklistGenerar(responsable_legajo=1))
    item = chk.items[0]

    with pytest.raises(exceptions.OperadorDestinoSinChecklistPendiente):
        reasignar_tarea(
            session,
            chk.id,
            item.id,
            schemas.ReasignarTareaSchema(nuevo_responsable_legajo=2),
            admin,
        )


def test_reasignar_tarea_no_modifica_plan_de_limpieza(session: Session) -> None:
    admin = _crear_admin_test(session)
    chk_origen = generar_checklist(session, schemas.ChecklistGenerar(responsable_legajo=1))
    item_origen = chk_origen.items[0]
    tarea_id = item_origen.tarea_id

    chk_destino = models.Checklist(
        fecha=date.today(),
        responsable_legajo=2,
        activo=True,
        items=[
            models.ChecklistItem(
                nombre_plan="Plan Ana",
                nombre_tarea="Tarea Ana",
                frecuencia=Frecuencia.DIARIA,
                estado=models.EstadoTareaItem.PENDIENTE,
                responsable_legajo=2,
            )
        ],
    )
    session.add(chk_destino)
    session.commit()

    reasignar_tarea(
        session,
        chk_origen.id,
        item_origen.id,
        schemas.ReasignarTareaSchema(nuevo_responsable_legajo=2),
        admin,
    )

    tarea_plan = session.scalar(select(Tarea).where(Tarea.id == tarea_id))
    assert tarea_plan.personal_id == 1


def test_reasignar_tarea_no_admin_rechazado(session: Session) -> None:
    operador = session.scalar(select(Personal).where(Personal.legajo == 1))
    chk = generar_checklist(session, schemas.ChecklistGenerar(responsable_legajo=1))
    item = chk.items[0]

    with pytest.raises(PermissionDenied):
        reasignar_tarea(
            session,
            chk.id,
            item.id,
            schemas.ReasignarTareaSchema(nuevo_responsable_legajo=2),
            operador,
        )


def test_mini_historial_en_tareas(session: Session) -> None:
    admin = _crear_admin_test(session)
    chk_origen = generar_checklist(session, schemas.ChecklistGenerar(responsable_legajo=1))
    item = chk_origen.items[0]

    assert len(item.historial) >= 1
    assert item.historial[0].accion == "CREADA"

    chk_destino = models.Checklist(
        fecha=date.today(),
        responsable_legajo=2,
        activo=True,
        items=[
            models.ChecklistItem(
                nombre_plan="Plan Ana",
                nombre_tarea="Tarea Ana",
                frecuencia=Frecuencia.DIARIA,
                estado=models.EstadoTareaItem.PENDIENTE,
                responsable_legajo=2,
            )
        ],
    )
    session.add(chk_destino)
    session.commit()

    reasignar_tarea(
        session,
        chk_origen.id,
        item.id,
        schemas.ReasignarTareaSchema(nuevo_responsable_legajo=2, motivo="Prueba de historial"),
        admin,
    )

    session.refresh(item)
    acciones = [h.accion for h in item.historial]
    assert "REASIGNADA" in acciones

    session.refresh(chk_destino)
    item_nuevo = chk_destino.items[1]
    acciones_nuevo = [h.accion for h in item_nuevo.historial]
    assert "CREADA_POR_REASIGNACION" in acciones_nuevo


def test_reasignar_tarea_no_diaria_sin_checklist_destino_crea_pendiente(session: Session) -> None:
    admin = _crear_admin_test(session)
    ayer = date.today() - timedelta(days=1)
    plan = Plan_de_Limpieza(nombre="PlanSemanalTest", fecha_inicio=ayer - timedelta(days=7))
    session.add(plan)
    session.flush()

    tarea_semanal = Tarea(
        nombre="LimpiezaSemanalReasig",
        descripcion="Procedimiento semanal de prueba",
        frecuencia=Frecuencia.SEMANAL,
        plan_id=plan.id,
        personal_id=1,
    )
    session.add(tarea_semanal)
    session.flush()

    chk_origen = models.Checklist(
        fecha=ayer,
        responsable_legajo=1,
        activo=True,
        items=[
            models.ChecklistItem(
                plan_id=plan.id,
                nombre_plan=plan.nombre,
                tarea_id=tarea_semanal.id,
                nombre_tarea=tarea_semanal.nombre,
                descripcion_tarea=tarea_semanal.descripcion,
                frecuencia=Frecuencia.SEMANAL,
                estado=models.EstadoTareaItem.PENDIENTE,
                responsable_legajo=1,
            )
        ],
    )
    session.add(chk_origen)
    session.commit()

    item_origen = chk_origen.items[0]

    resultado = reasignar_tarea(
        session,
        chk_origen.id,
        item_origen.id,
        schemas.ReasignarTareaSchema(nuevo_responsable_legajo=2, motivo="Reasignacion semanal"),
        admin,
    )

    assert resultado.estado == models.EstadoTareaItem.REASIGNADO
    session.refresh(chk_origen)
    assert chk_origen.porcentaje_cumplimiento == 100.0

    rp = session.scalar(
        select(models.ReasignacionPendiente).where(
            models.ReasignacionPendiente.tarea_id == tarea_semanal.id,
            models.ReasignacionPendiente.nuevo_responsable_legajo == 2,
            models.ReasignacionPendiente.procesada == False,
        )
    )
    assert rp is not None
    assert rp.motivo == "Reasignacion semanal"
    assert rp.item_origen_id == item_origen.id


def test_operador_destino_recibe_tarea_al_generar_proximo_checklist(session: Session) -> None:
    admin = _crear_admin_test(session)
    ayer = date.today() - timedelta(days=1)
    plan = Plan_de_Limpieza(nombre="PlanSemanalTest2", fecha_inicio=ayer - timedelta(days=7))
    session.add(plan)
    session.flush()

    tarea_semanal = Tarea(
        nombre="LimpiezaSemanalReasig2",
        descripcion="Procedimiento semanal",
        frecuencia=Frecuencia.SEMANAL,
        plan_id=plan.id,
        personal_id=1,
    )
    session.add(tarea_semanal)
    session.flush()

    chk_origen = models.Checklist(
        fecha=ayer,
        responsable_legajo=1,
        activo=True,
        items=[
            models.ChecklistItem(
                plan_id=plan.id,
                nombre_plan=plan.nombre,
                tarea_id=tarea_semanal.id,
                nombre_tarea=tarea_semanal.nombre,
                descripcion_tarea=tarea_semanal.descripcion,
                frecuencia=Frecuencia.SEMANAL,
                estado=models.EstadoTareaItem.PENDIENTE,
                responsable_legajo=1,
            )
        ],
    )
    session.add(chk_origen)
    session.commit()

    item_origen = chk_origen.items[0]
    reasignar_tarea(
        session,
        chk_origen.id,
        item_origen.id,
        schemas.ReasignarTareaSchema(nuevo_responsable_legajo=2, motivo="Asignacion turno"),
        admin,
    )

    chk_destino = generar_checklist(
        session, schemas.ChecklistGenerar(fecha=date.today(), responsable_legajo=2)
    )

    assert chk_destino.tiene_reasignacion_no_leida is True
    item_nuevo = next((it for it in chk_destino.items if it.tarea_id == tarea_semanal.id), None)
    assert item_nuevo is not None
    assert item_nuevo.estado == models.EstadoTareaItem.PENDIENTE
    assert item_nuevo.es_reasignada is True
    assert item_nuevo.revisada_por_operador is False
    assert item_nuevo.tarea_origen_id == item_origen.id

    session.refresh(item_origen)
    assert item_origen.tarea_reemplazo_id == item_nuevo.id

    rp = session.scalar(
        select(models.ReasignacionPendiente).where(
            models.ReasignacionPendiente.tarea_id == tarea_semanal.id
        )
    )
    assert rp.procesada is True


def test_persona_original_no_duplica_tarea_reasignada_en_nuevo_checklist(session: Session) -> None:
    admin = _crear_admin_test(session)
    ayer = date.today() - timedelta(days=1)
    from src.equipos.services import listar_equipos
    equipo = listar_equipos(session)[0]
    plan = Plan_de_Limpieza(
        nombre="PlanSemanalTest3",
        fecha_inicio=ayer - timedelta(days=7),
        equipo_id=equipo.id,
    )
    session.add(plan)
    session.flush()

    tarea_semanal = Tarea(
        nombre="LimpiezaSemanalNoDup",
        descripcion="Procedimiento semanal no duplicar",
        frecuencia=Frecuencia.SEMANAL,
        plan_id=plan.id,
        personal_id=1,
    )
    tarea_diaria = Tarea(
        nombre="LimpiezaDiariaParaChk",
        descripcion="Procedimiento diario",
        frecuencia=Frecuencia.DIARIA,
        plan_id=plan.id,
        personal_id=1,
    )
    session.add_all([tarea_semanal, tarea_diaria])
    session.flush()

    chk_origen = models.Checklist(
        fecha=ayer,
        responsable_legajo=1,
        activo=True,
        items=[
            models.ChecklistItem(
                plan_id=plan.id,
                nombre_plan=plan.nombre,
                tarea_id=tarea_semanal.id,
                nombre_tarea=tarea_semanal.nombre,
                descripcion_tarea=tarea_semanal.descripcion,
                frecuencia=Frecuencia.SEMANAL,
                estado=models.EstadoTareaItem.PENDIENTE,
                responsable_legajo=1,
            )
        ],
    )
    session.add(chk_origen)
    session.commit()

    reasignar_tarea(
        session,
        chk_origen.id,
        chk_origen.items[0].id,
        schemas.ReasignarTareaSchema(nuevo_responsable_legajo=2),
        admin,
    )

    chk_hoy_op1 = generar_checklist(
        session, schemas.ChecklistGenerar(fecha=date.today(), responsable_legajo=1)
    )

    tareas_en_chk = [it.tarea_id for it in chk_hoy_op1.items]
    assert tarea_semanal.id not in tareas_en_chk
    assert tarea_diaria.id in tareas_en_chk


def test_tarea_no_diaria_que_vence_hoy_sin_checklist_pendiente_es_rechazada(session: Session) -> None:
    admin = _crear_admin_test(session)
    hace_6_dias = date.today() - timedelta(days=6)
    chk_origen = models.Checklist(
        fecha=hace_6_dias,
        responsable_legajo=1,
        activo=True,
        items=[
            models.ChecklistItem(
                nombre_plan="Plan Vence Hoy",
                nombre_tarea="Tarea Semanal Ultimo Dia",
                frecuencia=Frecuencia.SEMANAL,
                estado=models.EstadoTareaItem.PENDIENTE,
                responsable_legajo=1,
            )
        ],
    )
    session.add(chk_origen)
    session.commit()

    with pytest.raises(exceptions.TareaVenceHoyRequiereChecklistPendiente):
        reasignar_tarea(
            session,
            chk_origen.id,
            chk_origen.items[0].id,
            schemas.ReasignarTareaSchema(nuevo_responsable_legajo=2),
            admin,
        )


def test_tarea_no_diaria_que_vence_hoy_con_checklist_pendiente_es_aceptada(session: Session) -> None:
    admin = _crear_admin_test(session)
    hace_6_dias = date.today() - timedelta(days=6)
    chk_origen = models.Checklist(
        fecha=hace_6_dias,
        responsable_legajo=1,
        activo=True,
        items=[
            models.ChecklistItem(
                nombre_plan="Plan Vence Hoy 2",
                nombre_tarea="Tarea Semanal Ultimo Dia 2",
                frecuencia=Frecuencia.SEMANAL,
                estado=models.EstadoTareaItem.PENDIENTE,
                responsable_legajo=1,
            )
        ],
    )
    session.add(chk_origen)

    chk_destino = models.Checklist(
        fecha=date.today(),
        responsable_legajo=2,
        activo=True,
        items=[
            models.ChecklistItem(
                nombre_plan="Plan Ana Hoy",
                nombre_tarea="Tarea Ana Hoy",
                frecuencia=Frecuencia.DIARIA,
                estado=models.EstadoTareaItem.PENDIENTE,
                responsable_legajo=2,
            )
        ],
    )
    session.add(chk_destino)
    session.commit()

    resultado = reasignar_tarea(
        session,
        chk_origen.id,
        chk_origen.items[0].id,
        schemas.ReasignarTareaSchema(nuevo_responsable_legajo=2),
        admin,
    )
    assert resultado.estado == models.EstadoTareaItem.REASIGNADO
    session.refresh(chk_destino)
    assert len(chk_destino.items) == 2


def test_reasignar_tarea_no_realizada_misma_persona_sin_checklist_pendiente(session: Session) -> None:
    admin = _crear_admin_test(session)
    ayer = date.today() - timedelta(days=1)
    plan = Plan_de_Limpieza(nombre="PlanMismaPersona", fecha_inicio=ayer - timedelta(days=7))
    session.add(plan)
    session.flush()

    tarea_semanal = Tarea(
        nombre="LimpiezaSemanalMisma",
        descripcion="Procedimiento semanal misma",
        frecuencia=Frecuencia.SEMANAL,
        plan_id=plan.id,
        personal_id=1,
    )
    session.add(tarea_semanal)
    session.flush()

    item_chk = models.ChecklistItem(
        plan_id=plan.id,
        nombre_plan=plan.nombre,
        tarea_id=tarea_semanal.id,
        nombre_tarea=tarea_semanal.nombre,
        descripcion_tarea=tarea_semanal.descripcion,
        frecuencia=Frecuencia.SEMANAL,
        estado=models.EstadoTareaItem.PENDIENTE,
        responsable_legajo=1,
    )
    chk_origen = models.Checklist(
        fecha=ayer,
        responsable_legajo=1,
        activo=True,
        items=[item_chk],
    )
    session.add(chk_origen)
    session.commit()

    marcar_tarea_no_realizada(
        session,
        chk_origen.id,
        item_chk.id,
        schemas.MarcarNoRealizadaSchema(motivo=models.MotivoNoRealizado.EQUIPO_FUERA_DE_USO),
        usuario_legajo=1,
    )

    resultado = reasignar_tarea(
        session,
        chk_origen.id,
        item_chk.id,
        schemas.ReasignarTareaSchema(nuevo_responsable_legajo=1, motivo="Reintento para manana"),
        admin,
    )
    assert resultado.estado == models.EstadoTareaItem.REASIGNADO

    chk_hoy = generar_checklist(
        session, schemas.ChecklistGenerar(fecha=date.today(), responsable_legajo=1)
    )
    items_semanal = [it for it in chk_hoy.items if it.tarea_id == tarea_semanal.id]
    assert len(items_semanal) == 1
    assert items_semanal[0].es_reasignada is True
    assert items_semanal[0].estado == models.EstadoTareaItem.PENDIENTE


def test_listar_tareas_no_realizadas_reasignables(session: Session) -> None:
    from src.checklist.services import listar_tareas_no_realizadas_reasignables

    chk = models.Checklist(
        fecha=date.today(),
        responsable_legajo=1,
        activo=True,
        items=[
            models.ChecklistItem(
                nombre_plan="Plan NR",
                nombre_tarea="Tarea Semanal NR",
                frecuencia=Frecuencia.SEMANAL,
                _estado=models.EstadoTareaItem.NO_REALIZADO,
                responsable_legajo=1,
                motivo_no_realizado=models.MotivoNoRealizado.EQUIPO_FUERA_DE_USO,
            ),
            models.ChecklistItem(
                nombre_plan="Plan NR",
                nombre_tarea="Tarea Diaria NR",
                frecuencia=Frecuencia.DIARIA,
                _estado=models.EstadoTareaItem.NO_REALIZADO,
                responsable_legajo=1,
                motivo_no_realizado=models.MotivoNoRealizado.FALTA_DE_INSUMO,
            ),
            models.ChecklistItem(
                nombre_plan="Plan NR",
                nombre_tarea="Tarea Pendiente",
                frecuencia=Frecuencia.DIARIA,
                _estado=models.EstadoTareaItem.PENDIENTE,
                responsable_legajo=1,
            ),
        ],
    )
    session.add(chk)

    chk_vencido = models.Checklist(
        fecha=date.today() - timedelta(days=10),
        responsable_legajo=1,
        activo=True,
        items=[
            models.ChecklistItem(
                nombre_plan="Plan Pasado",
                nombre_tarea="Tarea Semanal Pasada NR",
                frecuencia=Frecuencia.SEMANAL,
                _estado=models.EstadoTareaItem.NO_REALIZADO,
                responsable_legajo=1,
                motivo_no_realizado=models.MotivoNoRealizado.OTRO,
                observacion_no_realizado="Vencida",
            )
        ],
    )
    session.add(chk_vencido)
    session.commit()

    resultado = listar_tareas_no_realizadas_reasignables(session)
    nombres = [it.nombre_tarea for it in resultado]
    assert "Tarea Semanal NR" in nombres
    assert "Tarea Diaria NR" in nombres
    assert "Tarea Pendiente" not in nombres
    assert "Tarea Semanal Pasada NR" not in nombres

    for it in resultado:
        assert it.checklist_fecha is not None
        assert it.dias_restantes is not None
        assert it.dias_restantes >= 1

