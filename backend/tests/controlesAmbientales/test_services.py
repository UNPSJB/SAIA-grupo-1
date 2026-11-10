import io
from datetime import date, timedelta
from fastapi import UploadFile
import pytest
from sqlalchemy.orm import Session

from src.controlesAmbientales import exceptions
from src.controlesAmbientales.models import TipoControlAmbiental
from src.controlesAmbientales.services import (
    actualizar_control_ambiental,
    crear_control_ambiental,
    eliminar_control_ambiental,
    listar_controles,
    obtener_control,
    obtener_controles_para_csv,
    reactivar_control_ambiental,
    registrar_visita_control,
    validar_y_guardar_certificado,
)
from tests.database import session


def _crear_upload_file(nombre: str, contenido: bytes = b"dummy content", content_type: str = "application/pdf") -> UploadFile:
    return UploadFile(filename=nombre, file=io.BytesIO(contenido), headers={"content-type": content_type})


def test_validar_y_guardar_certificado_archivo_vacio():
    with pytest.raises(exceptions.ArchivoVacio):
        validar_y_guardar_certificado(None)

    with pytest.raises(exceptions.ArchivoVacio):
        validar_y_guardar_certificado(UploadFile(filename="", file=io.BytesIO(b"")))

    archivo_sin_contenido = UploadFile(filename="test.pdf", file=io.BytesIO(b""))
    with pytest.raises(exceptions.ArchivoVacio):
        validar_y_guardar_certificado(archivo_sin_contenido)


def test_validar_y_guardar_certificado_formato_invalido():
    archivo_invalido = _crear_upload_file("certificado.exe", b"malicioso", "application/octet-stream")
    with pytest.raises(exceptions.FormatoCertificadoInvalido):
        validar_y_guardar_certificado(archivo_invalido)


def test_validar_y_guardar_certificado_exitoso():
    archivo = _crear_upload_file("certificado.pdf", b"pdf valido")
    url = validar_y_guardar_certificado(archivo)
    assert url.startswith("/controles-ambientales/certificados/cert_amb_")
    assert url.endswith(".pdf")


def test_crear_control_ambiental_periodicidad_invalida(session: Session):
    with pytest.raises(exceptions.PeriodicidadInvalida):
        crear_control_ambiental(
            db=session,
            tipo=TipoControlAmbiental.PLAGAS,
            periodicidad_dias=0,
        )

    with pytest.raises(exceptions.PeriodicidadInvalida):
        crear_control_ambiental(
            db=session,
            tipo=TipoControlAmbiental.PLAGAS,
            periodicidad_dias=-10,
        )


def test_crear_control_ambiental_exitoso_sin_visita_inicial(session: Session):
    control = crear_control_ambiental(
        db=session,
        tipo=TipoControlAmbiental.AGUA,
        periodicidad_dias=30,
        observaciones="Control de agua semestral",
    )
    assert control.id is not None
    assert control.tipo == TipoControlAmbiental.AGUA.value
    assert control.periodicidad_dias == 30
    assert control.observaciones == "Control de agua semestral"
    assert control.activo is True
    assert control.ultima_fecha_realizacion is None
    assert control.fecha_vencimiento is None


def test_crear_control_ambiental_con_visita_inicial(session: Session):
    fecha_ini = date.today() - timedelta(days=5)
    archivo = _crear_upload_file("certificado.pdf", b"dummy cert")
    control = crear_control_ambiental(
        db=session,
        tipo=TipoControlAmbiental.TANQUE,
        periodicidad_dias=180,
        observaciones="Limpieza profunda",
        fecha_realizacion_inicial=fecha_ini,
        file=archivo,
    )
    assert control.id is not None
    assert control.ultima_fecha_realizacion == fecha_ini
    assert control.fecha_vencimiento == fecha_ini + timedelta(days=180)
    assert len(control.visitas) == 1
    assert control.visitas[0].certificado_url is not None


def test_crear_control_ambiental_duplicado(session: Session):
    crear_control_ambiental(
        db=session,
        tipo=TipoControlAmbiental.PLAGAS,
        periodicidad_dias=30,
    )
    with pytest.raises(exceptions.ControlYaExiste):
        crear_control_ambiental(
            db=session,
            tipo=TipoControlAmbiental.PLAGAS,
            periodicidad_dias=45,
        )


def test_crear_control_ambiental_duplicado_inactivo(session: Session):
    control = crear_control_ambiental(
        db=session,
        tipo=TipoControlAmbiental.PLAGAS,
        periodicidad_dias=30,
    )
    eliminar_control_ambiental(session, control.id)
    with pytest.raises(exceptions.ControlExisteinactivo):
        crear_control_ambiental(
            db=session,
            tipo=TipoControlAmbiental.PLAGAS,
            periodicidad_dias=30,
        )


def test_registrar_visita_control_inexistente(session: Session):
    archivo = _crear_upload_file("visita.pdf", b"cert")
    with pytest.raises(exceptions.ControlNoEncontrado):
        registrar_visita_control(
            db=session,
            control_id=99999,
            fecha_realizacion=date.today(),
            file=archivo,
        )


def test_registrar_visita_control_sin_archivo(session: Session):
    control = crear_control_ambiental(
        db=session,
        tipo=TipoControlAmbiental.AGUA,
        periodicidad_dias=30,
    )
    with pytest.raises(exceptions.ArchivoVacio):
        registrar_visita_control(
            db=session,
            control_id=control.id,
            fecha_realizacion=date.today(),
            file=None,
        )


def test_registrar_visita_control_exitoso(session: Session):
    control = crear_control_ambiental(
        db=session,
        tipo=TipoControlAmbiental.AGUA,
        periodicidad_dias=30,
    )
    hoy = date.today()
    archivo = _crear_upload_file("analisis.jpg", b"fake jpeg", "image/jpeg")
    visita = registrar_visita_control(
        db=session,
        control_id=control.id,
        fecha_realizacion=hoy,
        file=archivo,
        observaciones="Visita ok",
    )
    assert visita.id is not None
    assert visita.control_id == control.id
    assert visita.fecha_realizacion == hoy
    assert visita.fecha_proximo_vencimiento == hoy + timedelta(days=30)
    assert control.ultima_fecha_realizacion == hoy
    assert control.fecha_vencimiento == hoy + timedelta(days=30)


def test_listar_controles_y_filtros(session: Session):
    c1 = crear_control_ambiental(session, TipoControlAmbiental.PLAGAS, 30)
    c2 = crear_control_ambiental(session, TipoControlAmbiental.AGUA, 60)
    eliminar_control_ambiental(session, c2.id)

    todos = listar_controles(session)
    assert len(todos) >= 2

    activos = listar_controles(session, filtro_activo="ACTIVOS")
    assert any(c.id == c1.id for c in activos)
    assert not any(c.id == c2.id for c in activos)

    inactivos = listar_controles(session, filtro_activo="INACTIVOS")
    assert any(c.id == c2.id for c in inactivos)
    assert not any(c.id == c1.id for c in inactivos)

    busqueda = listar_controles(session, busqueda="PLAGAS")
    assert any(c.id == c1.id for c in busqueda)
    assert not any(c.id == c2.id for c in busqueda)


def test_obtener_control(session: Session):
    control = crear_control_ambiental(session, TipoControlAmbiental.TANQUE, 180)
    recuperado = obtener_control(session, control.id)
    assert recuperado.id == control.id

    with pytest.raises(exceptions.ControlNoEncontrado):
        obtener_control(session, 99999)


def test_actualizar_control_ambiental(session: Session):
    control = crear_control_ambiental(session, TipoControlAmbiental.PLAGAS, 30)
    hoy = date.today()
    archivo = _crear_upload_file("cert.pdf", b"test")
    registrar_visita_control(session, control.id, hoy, archivo)

    with pytest.raises(exceptions.PeriodicidadInvalida):
        actualizar_control_ambiental(session, control.id, periodicidad_dias=0)

    actualizado = actualizar_control_ambiental(
        session,
        control.id,
        tipo=TipoControlAmbiental.PLAGAS,
        periodicidad_dias=60,
        observaciones="Actualizado con 60 dias",
    )
    assert actualizado.periodicidad_dias == 60
    assert actualizado.observaciones == "Actualizado con 60 dias"
    assert actualizado.fecha_vencimiento == hoy + timedelta(days=60)


def test_reactivar_control_ambiental(session: Session):
    control = crear_control_ambiental(session, TipoControlAmbiental.PLAGAS, 30)
    eliminar_control_ambiental(session, control.id)
    assert control.activo is False

    reactivar_control_ambiental(session, control.id)
    assert control.activo is True


def test_obtener_controles_para_csv(session: Session):
    hoy = date.today()
    c_vencido = crear_control_ambiental(session, TipoControlAmbiental.PLAGAS, 30)
    c_vencido.fecha_vencimiento = hoy - timedelta(days=5)
    c_vencido.ultima_fecha_realizacion = hoy - timedelta(days=35)

    c_proximo = crear_control_ambiental(session, TipoControlAmbiental.AGUA, 30)
    c_proximo.fecha_vencimiento = hoy + timedelta(days=5)
    c_proximo.ultima_fecha_realizacion = hoy - timedelta(days=25)

    c_al_dia = crear_control_ambiental(session, TipoControlAmbiental.TANQUE, 180)
    c_al_dia.fecha_vencimiento = hoy + timedelta(days=60)
    c_al_dia.ultima_fecha_realizacion = hoy - timedelta(days=120)

    session.commit()

    csv_todos = obtener_controles_para_csv(session)
    assert len(csv_todos) == 3

    csv_vencidos = obtener_controles_para_csv(session, filtro_estado="VENCIDOS")
    assert len(csv_vencidos) == 1
    assert csv_vencidos[0]["id"] == c_vencido.id

    csv_proximos = obtener_controles_para_csv(session, filtro_estado="PROXIMOS")
    assert len(csv_proximos) == 1
    assert csv_proximos[0]["id"] == c_proximo.id

    csv_al_dia = obtener_controles_para_csv(session, filtro_estado="AL_DIA")
    assert len(csv_al_dia) == 1
    assert csv_al_dia[0]["id"] == c_al_dia.id

    csv_tipo = obtener_controles_para_csv(session, tipo=TipoControlAmbiental.AGUA.value)
    assert len(csv_tipo) == 1
    assert csv_tipo[0]["id"] == c_proximo.id


def test_registrar_visita_fecha_requerida(session: Session):
    control = crear_control_ambiental(session, TipoControlAmbiental.PLAGAS, 30)
    archivo = _crear_upload_file("cert.pdf", b"test")
    with pytest.raises(exceptions.FechaRequerida):
        registrar_visita_control(session, control.id, None, archivo)
