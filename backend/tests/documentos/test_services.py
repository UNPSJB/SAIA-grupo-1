import io
from datetime import date, timedelta
from fastapi import UploadFile
import pytest
from sqlalchemy.orm import Session
from tests.database import session
from src.personal.services import crear_personal
from src.personal.schemas import PersonalCreate, Capacidades
from src.documentos.constants import TipoDocumento
from src.documentos import exceptions, services

def _crear_archivo_pdf_fake(nombre: str = "documento.pdf", contenido: bytes = b"%PDF-1.4 fake content") -> UploadFile:
    return UploadFile(file=io.BytesIO(contenido), filename=nombre)

def test_crear_documento_con_version_valida(session: Session):
    admin = crear_personal(session, PersonalCreate(
        documento=11111111,
        nombre="Carlos",
        apellido="Admin",
        email="carlos.admin@test.com",
        capacidad=Capacidades.ADMINISTRAR,
        contrasenia="Clave1234",
    ))

    archivo = _crear_archivo_pdf_fake("manual_bpm.pdf")
    doc = services.crear_documento(
        db=session,
        titulo="Manual de Buenas Practicas",
        tipo=TipoDocumento.MANUAL_BPM,
        version="1.0",
        responsable_legajo=admin.legajo,
        file=archivo,
        descripcion="Manual general para pasteleria",
    )

    assert doc.id is not None
    assert doc.titulo == "Manual de Buenas Practicas"
    assert doc.tipo == TipoDocumento.MANUAL_BPM
    assert doc.activo is True
    assert len(doc.versiones) == 1

    v = doc.version_actual
    assert v is not None
    assert v.version == 1
    assert v.archivado is False
    assert v.es_vigente is True
    assert v.fecha_vigencia == date.today()
    assert v.fecha_archivo is None
    assert v.archivo_nombre_original == "manual_bpm.pdf"
    assert v.usuario is not None

def test_multiples_documentos_mismo_tipo_activos(session: Session):
    admin = crear_personal(session, PersonalCreate(
        documento=22222222,
        nombre="Laura",
        apellido="Admin",
        email="laura.admin@test.com",
        capacidad=Capacidades.ADMINISTRAR,
        contrasenia="Clave1234",
    ))

    doc1 = services.crear_documento(
        db=session,
        titulo="Receta Medialunas de Manteca",
        tipo=TipoDocumento.RECETA,
        version="1.0",
        responsable_legajo=admin.legajo,
        file=_crear_archivo_pdf_fake("receta_medialunas.pdf"),
    )

    doc2 = services.crear_documento(
        db=session,
        titulo="Receta Pan Frances",
        tipo=TipoDocumento.RECETA,
        version="1.0",
        responsable_legajo=admin.legajo,
        file=_crear_archivo_pdf_fake("receta_pan.pdf"),
    )

    assert doc1.id != doc2.id
    recetas = services.listar_documentos(session, tipo=TipoDocumento.RECETA)
    titulos = [r.titulo for r in recetas]
    assert "Receta Medialunas de Manteca" in titulos
    assert "Receta Pan Frances" in titulos
    assert doc1.activo is True
    assert doc2.activo is True

def test_subir_nueva_version_archiva_solo_version_previa_del_mismo_documento(session: Session):
    admin = crear_personal(session, PersonalCreate(
        documento=33333333,
        nombre="Elena",
        apellido="Ambas",
        email="elena.ambas@test.com",
        capacidad=Capacidades.AMBAS,
        contrasenia="Clave1234",
    ))

    doc1 = services.crear_documento(
        db=session,
        titulo="Procedimiento Sanitizacion Batea",
        tipo=TipoDocumento.PROCEDIMIENTO,
        version="1.0",
        responsable_legajo=admin.legajo,
        file=_crear_archivo_pdf_fake("poes_batea_v1.pdf"),
    )

    doc2 = services.crear_documento(
        db=session,
        titulo="Procedimiento Limpieza Horno",
        tipo=TipoDocumento.PROCEDIMIENTO,
        version="1.0",
        responsable_legajo=admin.legajo,
        file=_crear_archivo_pdf_fake("poes_horno_v1.pdf"),
    )

    nueva_v_doc1 = services.subir_nueva_version(
        db=session,
        documento_id=doc1.id,
        version="2.0",
        responsable_legajo=admin.legajo,
        file=_crear_archivo_pdf_fake("poes_batea_v2.pdf"),
    )

    session.refresh(doc1)
    session.refresh(doc2)

    assert nueva_v_doc1.version == 2
    assert nueva_v_doc1.archivado is False
    assert nueva_v_doc1.es_vigente is True
    assert nueva_v_doc1.fecha_archivo is None
    assert len(doc1.versiones) == 2

    v1_doc1 = [v for v in doc1.versiones if v.version == 1][0]
    assert v1_doc1.archivado is True
    assert v1_doc1.es_vigente is False
    assert v1_doc1.fecha_archivo == date.today()

    assert len(doc2.versiones) == 1
    assert doc2.version_actual.version == 1
    assert doc2.version_actual.archivado is False
    assert doc2.version_actual.es_vigente is True

def test_marcar_version_vigente_criterios_completos(session: Session):
    admin1 = crear_personal(session, PersonalCreate(
        documento=34343434,
        nombre="Guillermo",
        apellido="Admin",
        email="guille.admin@test.com",
        capacidad=Capacidades.ADMINISTRAR,
        contrasenia="Clave1234",
    ))

    admin2 = crear_personal(session, PersonalCreate(
        documento=35353535,
        nombre="Susana",
        apellido="Admin",
        email="susana.admin@test.com",
        capacidad=Capacidades.ADMINISTRAR,
        contrasenia="Clave1234",
    ))

    doc = services.crear_documento(
        db=session,
        titulo="Manual BPM Planta",
        tipo=TipoDocumento.MANUAL_BPM,
        version="1.0",
        responsable_legajo=admin1.legajo,
        file=_crear_archivo_pdf_fake("bpm_v1.pdf"),
    )

    v1 = doc.version_actual
    assert v1.version == 1
    assert v1.es_vigente is True

    v2 = services.subir_nueva_version(
        db=session,
        documento_id=doc.id,
        version="2.0",
        responsable_legajo=admin1.legajo,
        file=_crear_archivo_pdf_fake("bpm_v2.pdf"),
    )
    assert v2.es_vigente is True
    session.refresh(doc)
    assert doc.version_vigente.version == 2

    fecha_entrada_vigencia = date.today() + timedelta(days=5)
    v1_vigente = services.marcar_version_vigente(
        db=session,
        documento_id=doc.id,
        version_id=v1.id,
        fecha_vigencia=fecha_entrada_vigencia,
        responsable_legajo=admin2.legajo,
    )

    session.refresh(doc)
    session.refresh(v1)
    session.refresh(v2)

    assert v1.es_vigente is True
    assert v1.fecha_vigencia == fecha_entrada_vigencia
    assert v1.fecha_archivo is None

    assert v2.es_vigente is False
    assert v2.archivado is True
    assert v2.fecha_archivo == fecha_entrada_vigencia

    assert doc.version_vigente.version == 1
    assert doc.version_vigente.id == v1.id

    versiones_vigentes = [v for v in doc.versiones if v.es_vigente]
    assert len(versiones_vigentes) == 1

    from src.auditoria.services import listar_auditorias
    from src.auditoria.models import AccionAuditoria
    auditorias = listar_auditorias(session, tabla="documentos", registro_id=doc.id)
    assert len(auditorias) >= 2
    creacion = auditorias[0]
    assert creacion.accion == AccionAuditoria.CREAR
    assert creacion.campo == "version_vigente"
    assert "v1" in creacion.valor_posterior
    modificacion = auditorias[-1]
    assert modificacion.accion == AccionAuditoria.MODIFICAR
    assert modificacion.campo == "version_vigente"
    assert "v1" in modificacion.valor_posterior
    assert str(fecha_entrada_vigencia) in modificacion.valor_posterior
    assert str(admin2.legajo) in modificacion.valor_posterior

def test_version_duplicada_mismo_documento_falla(session: Session):
    admin = crear_personal(session, PersonalCreate(
        documento=44444444,
        nombre="Mario",
        apellido="Admin",
        email="mario.admin@test.com",
        capacidad=Capacidades.ADMINISTRAR,
        contrasenia="Clave1234",
    ))

    doc = services.crear_documento(
        db=session,
        titulo="Ficha Tecnica Harina 000",
        tipo=TipoDocumento.FICHA_TECNICA,
        version="1.0",
        responsable_legajo=admin.legajo,
        file=_crear_archivo_pdf_fake(),
    )

    with pytest.raises(exceptions.VersionDuplicada):
        services.subir_nueva_version(
            db=session,
            documento_id=doc.id,
            version="1.0",
            responsable_legajo=admin.legajo,
            file=_crear_archivo_pdf_fake(),
        )

def test_permiso_solo_administrador_puede_subir_y_marcar_vigente(session: Session):
    operador = crear_personal(session, PersonalCreate(
        documento=55555555,
        nombre="Pedro",
        apellido="Operador",
        email="pedro.op@test.com",
        capacidad=Capacidades.OPERAR,
        contrasenia="Clave1234",
    ))

    admin = crear_personal(session, PersonalCreate(
        documento=56565656,
        nombre="Tomas",
        apellido="Admin",
        email="tomas.ad@test.com",
        capacidad=Capacidades.ADMINISTRAR,
        contrasenia="Clave1234",
    ))

    with pytest.raises(exceptions.SoloAdministradorPuedeSubir):
        services.crear_documento(
            db=session,
            titulo="Documento No Permitido",
            tipo=TipoDocumento.RECETA,
            version="1.0",
            responsable_legajo=operador.legajo,
            file=_crear_archivo_pdf_fake(),
        )

    doc = services.crear_documento(
        db=session,
        titulo="Receta Permitida",
        tipo=TipoDocumento.RECETA,
        version="1.0",
        responsable_legajo=admin.legajo,
        file=_crear_archivo_pdf_fake(),
    )
    v1 = doc.version_actual

    with pytest.raises(exceptions.SoloAdministradorPuedeSubir):
        services.marcar_version_vigente(
            db=session,
            documento_id=doc.id,
            version_id=v1.id,
            fecha_vigencia=date.today(),
            responsable_legajo=operador.legajo,
        )

def test_validacion_archivo_no_pdf(session: Session):
    admin = crear_personal(session, PersonalCreate(
        documento=66666666,
        nombre="Silvia",
        apellido="Admin",
        email="silvia.admin@test.com",
        capacidad=Capacidades.ADMINISTRAR,
        contrasenia="Clave1234",
    ))

    archivo_txt = UploadFile(file=io.BytesIO(b"texto plano"), filename="documento.txt")
    with pytest.raises(exceptions.FormatoArchivoInvalido):
        services.crear_documento(
            db=session,
            titulo="Doc Invalido",
            tipo=TipoDocumento.RECETA,
            version="1.0",
            responsable_legajo=admin.legajo,
            file=archivo_txt,
        )

    archivo_sin_cabecera = UploadFile(file=io.BytesIO(b"no es pdf real"), filename="documento.pdf")
    with pytest.raises(exceptions.FormatoArchivoInvalido):
        services.crear_documento(
            db=session,
            titulo="Doc Invalido",
            tipo=TipoDocumento.RECETA,
            version="1.0",
            responsable_legajo=admin.legajo,
            file=archivo_sin_cabecera,
        )

    archivo_vacio = UploadFile(file=io.BytesIO(b""), filename="vacio.pdf")
    with pytest.raises(exceptions.ArchivoVacio):
        services.crear_documento(
            db=session,
            titulo="Doc Vacio",
            tipo=TipoDocumento.RECETA,
            version="1.0",
            responsable_legajo=admin.legajo,
            file=archivo_vacio,
        )

def test_versionado_automatico_creacion_e_incremento(session: Session):
    admin = crear_personal(session, PersonalCreate(
        documento=77711122,
        nombre="Valeria",
        apellido="Admin",
        email="valeria.admin@test.com",
        capacidad=Capacidades.ADMINISTRAR,
        contrasenia="Clave1234",
    ))

    doc = services.crear_documento(
        db=session,
        titulo="Manual BPM Calidad",
        tipo=TipoDocumento.MANUAL_BPM,
        file=_crear_archivo_pdf_fake("manual_bpm.pdf"),
        responsable_legajo=admin.legajo,
    )
    assert doc.version_actual.version == 1

    v2 = services.subir_nueva_version(
        db=session,
        documento_id=doc.id,
        file=_crear_archivo_pdf_fake("manual_bpm_v2.pdf"),
        responsable_legajo=admin.legajo,
    )
    assert v2.version == 2
    assert v2.es_vigente is True

    v3 = services.subir_nueva_version(
        db=session,
        documento_id=doc.id,
        file=_crear_archivo_pdf_fake("manual_bpm_v3.pdf"),
        responsable_legajo=admin.legajo,
    )
    assert v3.version == 3
    assert v3.es_vigente is True

def test_listar_historial_documento_cronologico(session: Session):
    admin = crear_personal(session, PersonalCreate(
        documento=88812345,
        nombre="Natalia",
        apellido="Admin",
        email="natalia.admin@test.com",
        capacidad=Capacidades.ADMINISTRAR,
        contrasenia="Clave1234",
    ))

    doc = services.crear_documento(
        db=session,
        titulo="Receta Medialunas de Grasa",
        tipo=TipoDocumento.RECETA,
        file=_crear_archivo_pdf_fake("receta_v1.pdf"),
        responsable_legajo=admin.legajo,
    )
    v2 = services.subir_nueva_version(
        db=session,
        documento_id=doc.id,
        file=_crear_archivo_pdf_fake("receta_v2.pdf"),
        responsable_legajo=admin.legajo,
    )

    historial_asc = services.listar_historial_documento(session, doc.id, orden="asc")
    assert len(historial_asc) == 2
    assert historial_asc[0].version == 1
    assert historial_asc[1].version == 2
    assert historial_asc[0].archivado is True
    assert historial_asc[0].fecha_archivo == date.today()
    assert historial_asc[1].es_vigente is True
    assert historial_asc[1].fecha_archivo is None
    assert historial_asc[0].tamanio_formateado != ""
    assert historial_asc[0].usuario is not None

    historial_desc = services.listar_historial_documento(session, doc.id, orden="desc")
    assert len(historial_desc) == 2
    assert historial_desc[0].version == 2
    assert historial_desc[1].version == 1

def test_descargar_archivo_version_archivada(session: Session):
    admin = crear_personal(session, PersonalCreate(
        documento=99912345,
        nombre="Gonzalo",
        apellido="Admin",
        email="gonzalo.admin@test.com",
        capacidad=Capacidades.ADMINISTRAR,
        contrasenia="Clave1234",
    ))

    doc = services.crear_documento(
        db=session,
        titulo="Procedimiento Enfriamiento",
        tipo=TipoDocumento.PROCEDIMIENTO,
        file=_crear_archivo_pdf_fake("poes_v1.pdf"),
        responsable_legajo=admin.legajo,
    )
    v1_id = doc.version_actual.id

    services.subir_nueva_version(
        db=session,
        documento_id=doc.id,
        file=_crear_archivo_pdf_fake("poes_v2.pdf"),
        responsable_legajo=admin.legajo,
    )

    ruta, nombre_orig = services.obtener_archivo_version(session, v1_id)
    assert ruta.is_file()
    assert nombre_orig == "poes_v1.pdf"
