import io
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
    assert v.version == "1.0"
    assert v.archivado is False
    assert v.responsable_legajo == admin.legajo
    assert v.archivo_nombre_original == "manual_bpm.pdf"

def test_multiples_documentos_mismo_tipo_activos(session: Session):
    admin = crear_personal(session, PersonalCreate(
        documento=22222222,
        nombre="Laura",
        apellido="Admin",
        email="laura.admin@test.com",
        capacidad=Capacidades.ADMINISTRAR,
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

    assert nueva_v_doc1.version == "2.0"
    assert nueva_v_doc1.archivado is False
    assert len(doc1.versiones) == 2

    v1_doc1 = [v for v in doc1.versiones if v.version == "1.0"][0]
    assert v1_doc1.archivado is True

    assert doc1.version_actual.version == "2.0"

    assert len(doc2.versiones) == 1
    assert doc2.version_actual.version == "1.0"
    assert doc2.version_actual.archivado is False

def test_version_duplicada_mismo_documento_falla(session: Session):
    admin = crear_personal(session, PersonalCreate(
        documento=44444444,
        nombre="Mario",
        apellido="Admin",
        email="mario.admin@test.com",
        capacidad=Capacidades.ADMINISTRAR,
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

def test_permiso_solo_administrador_puede_subir(session: Session):
    operador = crear_personal(session, PersonalCreate(
        documento=55555555,
        nombre="Pedro",
        apellido="Operador",
        email="pedro.op@test.com",
        capacidad=Capacidades.OPERAR,
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

def test_validacion_archivo_no_pdf(session: Session):
    admin = crear_personal(session, PersonalCreate(
        documento=66666666,
        nombre="Silvia",
        apellido="Admin",
        email="silvia.admin@test.com",
        capacidad=Capacidades.ADMINISTRAR,
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
