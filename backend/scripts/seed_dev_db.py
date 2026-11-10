import io
import json
import shutil
import sys
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import UploadFile
from sqlalchemy import select
from src.database import SessionLocal, engine
from src.models import ModeloBase

from src.personal.models import Personal
from src.personal.services import crear_personal
from src.personal.schemas import PersonalCreate, Capacidades
from src.autenticacion.services import asegurar_usuarios_dev, hashear_contrasenia

from src.insumos.models import UnidadMedida, Insumo
from src.insumos_quimicos.models import InsumoQuimico
from src.insumos_quimicos.services import InsumoQuimicoService
from src.insumos_quimicos.schemas import InsumoQuimicoCreate
from src.insumos_quimicos.constants import TipoQuimicoEnum, UnidadMedidaEnum as UnidadQuimico

from src.equipos.services import crear_equipo
from src.equipos.schemas import EquipoCreate
from src.equipos.models import Categoria, Estado, Equipo

from src.sectores.services import crear_sector
from src.sectores.schemas import SectorCreate
from src.sectores.models import Sector

from src.elementosDeLimpieza.services import crear_elementoDeLimpieza
from src.elementosDeLimpieza.schemas import ElementoDeLimpiezaCreate
from src.elementosDeLimpieza.models import ElementoDeLimpieza

from src.plan_De_limpieza.services import crear_plan
from src.plan_De_limpieza.schemas import PlanDeLimpiezaCreate
from src.plan_De_limpieza.models import Plan_de_Limpieza

from src.tareas.services import crear_tarea
from src.tareas.schemas import TareaCreate
from src.tareas.models import Frecuencia, Tarea

from src.checklist.services import generar_checklist, completar_tarea
from src.checklist.schemas import ChecklistGenerar, CompletarTareaSchema, InsumoUtilizadoPlaceholder
from src.checklist.models import Checklist, ChecklistItem, EstadoTareaItem, ChecklistItemHistorial, ReasignacionPendiente

from src.documentos.models import Documento, VersionDocumento
from src.documentos.services import crear_documento, subir_nueva_version, STORAGE_DIR as STORAGE_DOCUMENTOS
from src.tipoDocumento.models import TipoDocumento as TipoDocModel
from src.tipoDocumento.services import asegurar_tipos_base

from src.plan_de_calibracion.models import Plan_de_Calibracion
from src.calibracion_realizada.models import Calibracion_Realizada
from src.calibracion_realizada.services import ARCHIVOS_DIR as carpeta_calibraciones

from src.categorias_incidentes.models import CategoriaIncidente
from src.categorias_incidentes.services import crear_categoria
from src.categorias_incidentes.schemas import CategoriaIncidenteCreate

from src.incidentes.models import Incidente
from src.incidentes.constants import EstadoIncidente, TipoIncidente

from src.tipoCertificado.models import TipoCertificado
from src.tipoCertificado.services import crear_tipo_certificado
from src.certificado.models import Certificado
from src.certificado.services import crear_certificado, ARCHIVOS_DIR as carpeta_certificados

from src.motivoNoRealizado.models import MotivoNoRealizado

from src.notificaciones.models import Notificacion

from src.producto.models import Producto
from src.produccion.models import LoteProduccion, InsumoLote

from src.controlesAmbientales.models import ControlAmbiental, VisitaControlAmbiental, TipoControlAmbiental
from src.controlesAmbientales.services import crear_control_ambiental, STORAGE_DIR as STORAGE_CONTROLES

from src.indentificadorDeQR.models import IndentificadorUnico
from src.AcercaDeNostros.models import AcercaDeNosotros

from src.auditoria.models import Auditoria, AccionAuditoria

INSUMOS = [
    ("Harina 000", "HAR3-2409", 12, 150, 450.0, 320.0, UnidadMedida.KILOGRAMOS),
    ("Harina 0000", "HAR4-2409", 12, 140, 300.0, 210.0, UnidadMedida.KILOGRAMOS),
    ("Harina Integral Fina", "HIN-2409", 10, 180, 120.0, 85.0, UnidadMedida.KILOGRAMOS),
    ("Manteca", "MAN-2409", 6, -2, 80.0, 45.0, UnidadMedida.KILOGRAMOS),
    ("Azucar Comun", "AZC-2408", 30, 365, 200.0, 145.0, UnidadMedida.KILOGRAMOS),
    ("Azucar Impalpable", "AZI-2408", 30, 300, 50.0, 32.0, UnidadMedida.KILOGRAMOS),
    ("Huevos", "HUE-2409", 4, 18, 720.0, 480.0, UnidadMedida.UNIDADES),
    ("Leche Entera", "LEC-2409", 8, 4, 120.0, 68.0, UnidadMedida.LITROS),
    ("Crema de Leche", "CRE-2409", 14, -3, 30.0, 12.0, UnidadMedida.LITROS),
    ("Queso Crema", "QCR-2409", 7, 5, 40.0, 18.0, UnidadMedida.KILOGRAMOS),
    ("Levadura Fresca", "LEV-2409", 6, 3, 20.0, 9.5, UnidadMedida.KILOGRAMOS),
    ("Levadura Seca Instantanea", "LSI-2409", 15, 300, 25.0, 18.0, UnidadMedida.KILOGRAMOS),
    ("Sal Fina", "SAL-2407", 60, None, 50.0, 42.0, UnidadMedida.KILOGRAMOS),
    ("Dulce de Leche Repostero", "DDL-2409", 10, 90, 80.0, 55.0, UnidadMedida.KILOGRAMOS),
    ("Chocolate Cobertura Semiamargo", "CHO-2408", 20, 180, 40.0, 26.0, UnidadMedida.KILOGRAMOS),
    ("Gotas de Chocolate Blanco", "CHB-2408", 22, 190, 25.0, 17.0, UnidadMedida.KILOGRAMOS),
    ("Aceite de Girasol", "ACE-2408", 25, 200, 60.0, 38.0, UnidadMedida.LITROS),
    ("Esencia de Vainilla", "VAI-2407", 45, 300, 4000.0, 2600.0, UnidadMedida.MILILITROS),
    ("Polvo de Hornear", "PHO-2408", 20, 240, 8000.0, 5800.0, UnidadMedida.GRAMOS),
    ("Canela Molida", "CAN-2407", 40, 280, 6000.0, 4100.0, UnidadMedida.GRAMOS),
    ("Membrillo", "MEM-2409", 8, 120, 50.0, 36.0, UnidadMedida.KILOGRAMOS),
    ("Jamon Cocido", "JAM-2410", 10, -1, 15.0, 5.0, UnidadMedida.KILOGRAMOS),
    ("Queso de Maquina", "QMA-2410", 5, 8, 25.0, 7.5, UnidadMedida.KILOGRAMOS),
    ("Ricota Fresca Magra", "RIC-2410", 8, 20, 20.0, 16.0, UnidadMedida.KILOGRAMOS),
    ("Cacao Amargo en Polvo", "CAC-2408", 25, 270, 20.0, 14.5, UnidadMedida.KILOGRAMOS),
    ("Nueces Mariposa", "NUE-2408", 20, 150, 15.0, 6.5, UnidadMedida.KILOGRAMOS),
    ("Almendras Peladas", "ALM-2408", 25, 160, 12.0, 7.0, UnidadMedida.KILOGRAMOS),
    ("Pasas de Uva", "PAS-2408", 18, 180, 20.0, 12.0, UnidadMedida.KILOGRAMOS),
    ("Coco Rallado", "COC-2408", 22, 160, 15.0, 9.5, UnidadMedida.KILOGRAMOS),
    ("Almidon de Maiz", "ALM-2407", 40, 330, 40.0, 28.0, UnidadMedida.KILOGRAMOS),
    ("Avena Arrollada Fina", "AVE-2409", 14, 210, 35.0, 24.0, UnidadMedida.KILOGRAMOS),
    ("Mermelada de Frutilla", "MER-2409", 9, 120, 30.0, 19.0, UnidadMedida.KILOGRAMOS),
    ("Miel Pura", "MIE-2407", 35, 365, 25.0, 18.0, UnidadMedida.KILOGRAMOS),
    ("Semillas de Sesamo", "SES-2408", 20, 240, 20.0, 15.0, UnidadMedida.KILOGRAMOS),
    ("Semillas de Lino", "LIN-2408", 20, 240, 20.0, 14.0, UnidadMedida.KILOGRAMOS),
]

INSUMOS_QUIMICOS = [
    ("Lavandina Concentrada 55g", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.LITROS, 120.0, "Clorox Profesional"),
    ("Detergente Neutro Espumante", TipoQuimicoEnum.DETERGENTE, UnidadQuimico.LITROS, 80.0, "Spartan Chemical"),
    ("Amonio Cuaternario 5ta Generacion", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.LITROS, 60.0, "Ecolab"),
    ("Desengrasante Alcalino Pesado", TipoQuimicoEnum.DESENGRASANTE, UnidadQuimico.LITROS, 50.0, "Diversey"),
    ("Sanitizante Clorado Liquido", TipoQuimicoEnum.SANITIZANTE, UnidadQuimico.LITROS, 45.0, "Ecolab"),
    ("Detergente Desengrasante de Cocina", TipoQuimicoEnum.DETERGENTE, UnidadQuimico.LITROS, 40.0, "JohnsonDiversey"),
    ("Alcohol Isopropilico 70 Spray", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.MILILITROS, 8000.0, "Química del Sur"),
    ("Limpiavidrios Antiestatico", TipoQuimicoEnum.OTRO, UnidadQuimico.MILILITROS, 5000.0, "Spartan Chemical"),
    ("Jabon Antibacterial Clorhexidina", TipoQuimicoEnum.OTRO, UnidadQuimico.MILILITROS, 6000.0, "Diversey"),
    ("Desinfectante Concentrado Peracetico", TipoQuimicoEnum.SANITIZANTE, UnidadQuimico.MILILITROS, 3500.0, "Ecolab"),
    ("Lustramuebles y Acero Inoxidable", TipoQuimicoEnum.OTRO, UnidadQuimico.MILILITROS, 3000.0, "Spartan Chemical"),
    ("Soda Caustica en Escamas", TipoQuimicoEnum.DESENGRASANTE, UnidadQuimico.KILOGRAMOS, 60.0, "Química Industrial"),
    ("Detergente en Polvo Enzimatico", TipoQuimicoEnum.DETERGENTE, UnidadQuimico.KILOGRAMOS, 50.0, "Spartan Chemical"),
    ("Hipoclorito de Calcio Granulado", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.KILOGRAMOS, 35.0, "Clorox Profesional"),
    ("Desincrustante Acido en Escamas", TipoQuimicoEnum.DESENGRASANTE, UnidadQuimico.KILOGRAMOS, 25.0, "Ecolab"),
    ("Pastillas Efervescentes Cloradas", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.GRAMOS, 2500.0, "Química del Sur"),
    ("Polvo Abrasivo Sanitizante", TipoQuimicoEnum.SANITIZANTE, UnidadQuimico.GRAMOS, 4000.0, "Diversey"),
    ("Sal Regeneradora para Ablandador", TipoQuimicoEnum.OTRO, UnidadQuimico.GRAMOS, 8000.0, "Química Industrial"),
    ("Toallitas Desinfectantes con Alcohol", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.UNIDADES, 90.0, "Química del Sur"),
    ("Pastillas Sanitizantes de Cisterna", TipoQuimicoEnum.SANITIZANTE, UnidadQuimico.UNIDADES, 75.0, "Ecolab"),
    ("Bloque Desincrustante Quimico", TipoQuimicoEnum.OTRO, UnidadQuimico.UNIDADES, 36.0, "Spartan Chemical"),
]

def generar_pdf_valido(titulo: str, subtitulo: str = "") -> bytes:
    stream_content = (
        f"BT\n/F1 18 Tf\n50 720 Td\n({titulo}) Tj\n"
        f"/F1 12 Tf\n0 -30 Td\n({subtitulo}) Tj\nET\n"
    ).encode("latin-1", errors="replace")
    obj5 = b"5 0 obj\n<< /Length " + str(len(stream_content)).encode() + b" >>\nstream\n" + stream_content + b"endstream\nendobj\n"
    obj1 = b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    obj2 = b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    obj3 = b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n"
    obj4 = b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
    header = b"%PDF-1.4\n"
    o1 = len(header)
    o2 = o1 + len(obj1)
    o3 = o2 + len(obj2)
    o4 = o3 + len(obj3)
    o5 = o4 + len(obj4)
    xref_offset = o5 + len(obj5)
    xref = (
        b"xref\n0 6\n"
        b"0000000000 65535 f \n"
        + f"{o1:010d} 00000 n \n".encode()
        + f"{o2:010d} 00000 n \n".encode()
        + f"{o3:010d} 00000 n \n".encode()
        + f"{o4:010d} 00000 n \n".encode()
        + f"{o5:010d} 00000 n \n".encode()
    )
    trailer = b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + str(xref_offset).encode() + b"\n%%EOF\n"
    return header + obj1 + obj2 + obj3 + obj4 + obj5 + xref + trailer


def resetear_base_completa():
    ModeloBase.metadata.drop_all(bind=engine)
    ModeloBase.metadata.create_all(bind=engine)


def main() -> None:
    resetear_base_completa()
    db = SessionLocal()

    carpeta_calibraciones.mkdir(parents=True, exist_ok=True)
    carpeta_certificados.mkdir(parents=True, exist_ok=True)
    STORAGE_DOCUMENTOS.mkdir(parents=True, exist_ok=True)
    STORAGE_CONTROLES.mkdir(parents=True, exist_ok=True)

    hoy = datetime.now()

    asegurar_usuarios_dev(db)
    asegurar_tipos_base(db)

    admin_user = db.query(Personal).filter(Personal.usuario == "admin").first()
    operador_user = db.query(Personal).filter(Personal.usuario == "operador").first()
    adminopp_user = db.query(Personal).filter(Personal.usuario == "adminopp").first()

    juan = crear_personal(db, PersonalCreate(documento="30111222", nombre="Juan", apellido="Perez", email="juan.perez@saia.com", capacidad="OPERAR", contrasenia="Clave1234"))
    ana = crear_personal(db, PersonalCreate(documento="30222333", nombre="Ana", apellido="Gomez", email="ana.gomez@saia.com", capacidad="ADMINISTRAR", contrasenia="Clave1234"))
    marcos = crear_personal(db, PersonalCreate(documento="30333444", nombre="Marcos", apellido="Diaz", email="marcos.diaz@saia.com", capacidad="AMBAS", contrasenia="Clave1234"))
    lucia = crear_personal(db, PersonalCreate(documento="30444555", nombre="Lucia", apellido="Fernandez", email="lucia.fernandez@saia.com", capacidad="OPERAR", contrasenia="Clave1234"))
    sofia = crear_personal(db, PersonalCreate(documento="30555666", nombre="Sofia", apellido="Martinez", email="sofia.martinez@saia.com", capacidad="OPERAR", contrasenia="Clave1234"))
    carlos = crear_personal(db, PersonalCreate(documento="30666777", nombre="Carlos", apellido="Ruiz", email="carlos.ruiz@saia.com", capacidad="OPERAR", contrasenia="Clave1234"))
    laura = crear_personal(db, PersonalCreate(documento="30777888", nombre="Laura", apellido="Sanchez", email="laura.sanchez@saia.com", capacidad="ADMINISTRAR", contrasenia="Clave1234"))
    diego = crear_personal(db, PersonalCreate(documento="30888999", nombre="Diego", apellido="Morales", email="diego.morales@saia.com", capacidad="OPERAR", contrasenia="Clave1234"))
    valentina = crear_personal(db, PersonalCreate(documento="30999000", nombre="Valentina", apellido="Castro", email="valentina.castro@saia.com", capacidad="AMBAS", contrasenia="Clave1234"))
    martin = crear_personal(db, PersonalCreate(documento="30000111", nombre="Martin", apellido="Benitez", email="martin.benitez@saia.com", capacidad="OPERAR", contrasenia="Clave1234"))
    pedro_inactivo = crear_personal(db, PersonalCreate(documento="30123987", nombre="Pedro", apellido="Gonzalez", email="pedro.gonzalez@saia.com", capacidad="OPERAR", contrasenia="Clave1234"))
    pedro_inactivo.activo = False
    db.commit()

    for nombre, lote, dias_recepcion, dias_venc, cant, stock, medida in INSUMOS:
        db.add(Insumo(
            nombre=nombre,
            lote=lote,
            fechaRecepcion=hoy - timedelta(days=dias_recepcion),
            fechaVencimiento=hoy + timedelta(days=dias_venc) if dias_venc is not None else None,
            cantRecibida=cant,
            stock=stock,
            medida=medida,
        ))
    db.commit()

    for item in INSUMOS_QUIMICOS:
        if len(item) == 5:
            nombre_q, tipo_q, unidad_q, stock_q, proveedor_q = item
        else:
            nombre_q, tipo_q, unidad_q, stock_q = item
            proveedor_q = None
        InsumoQuimicoService.create(db, InsumoQuimicoCreate(
            nombre=nombre_q, tipo=tipo_q, unidad_medida=unidad_q, stock_actual=stock_q, proveedor=proveedor_q
        ))

    s_salon = crear_sector(db, SectorCreate(nombre="Salon Principal"))
    s_deposito = crear_sector(db, SectorCreate(nombre="Deposito"))
    s_cuadra = crear_sector(db, SectorCreate(nombre="Cuadra"))
    s_pasteleria = crear_sector(db, SectorCreate(nombre="Pasteleria"))
    s_bacha = crear_sector(db, SectorCreate(nombre="Bacha"))
    s_cocina = crear_sector(db, SectorCreate(nombre="Cocina"))
    s_envasado = crear_sector(db, SectorCreate(nombre="Envasado y Expedicion"))
    s_camaras = crear_sector(db, SectorCreate(nombre="Camaras de Frio"))

    heladera = crear_equipo(db, EquipoCreate(nombre="Heladera Exhibidora", categoria=Categoria.CONSERVAMIENTO, sector_id=s_salon.id, estado=Estado.ACTIVO, plan_de_calibracion="Semestral"))
    freezer = crear_equipo(db, EquipoCreate(nombre="Freezer Deposito", categoria=Categoria.CONSERVAMIENTO, sector_id=s_deposito.id, estado=Estado.ACTIVO, plan_de_calibracion="Semestral"))
    camara = crear_equipo(db, EquipoCreate(nombre="Camara Frigorifica", categoria=Categoria.CONSERVAMIENTO, sector_id=s_camaras.id, estado=Estado.ACTIVO, plan_de_calibracion="Trimestral"))
    amasadora = crear_equipo(db, EquipoCreate(nombre="Amasadora Industrial", categoria=Categoria.MANTENIMIENTO, sector_id=s_cuadra.id, estado=Estado.ACTIVO, plan_de_calibracion="Anual"))
    horno = crear_equipo(db, EquipoCreate(nombre="Horno Convector", categoria=Categoria.MANTENIMIENTO, sector_id=s_cuadra.id, estado=Estado.ACTIVO, plan_de_calibracion="Semestral"))
    batidora = crear_equipo(db, EquipoCreate(nombre="Batidora Planetaria", categoria=Categoria.MANTENIMIENTO, sector_id=s_pasteleria.id, estado=Estado.ACTIVO, plan_de_calibracion="Anual"))
    sobadora = crear_equipo(db, EquipoCreate(nombre="Sobadora", categoria=Categoria.MANTENIMIENTO, sector_id=s_cuadra.id, estado=Estado.ACTIVO, plan_de_calibracion="Anual"))
    termometro = crear_equipo(db, EquipoCreate(nombre="Termometro Pinche", categoria=Categoria.MANTENIMIENTO, sector_id=s_pasteleria.id, estado=Estado.ACTIVO, plan_de_calibracion="Mensual"))
    lavavajillas = crear_equipo(db, EquipoCreate(nombre="Lavavajillas", categoria=Categoria.SANAMIENTO, sector_id=s_bacha.id, estado=Estado.ACTIVO, plan_de_calibracion="Anual"))
    freidora = crear_equipo(db, EquipoCreate(nombre="Freidora Electrica", categoria=Categoria.MANTENIMIENTO, sector_id=s_cocina.id, estado=Estado.INACTIVO, plan_de_calibracion="Anual"))
    balanza_cuadra = crear_equipo(db, EquipoCreate(nombre="Balanza Digital de Cuadra", categoria=Categoria.MANTENIMIENTO, sector_id=s_cuadra.id, estado=Estado.ACTIVO, plan_de_calibracion="Semestral"))
    balanza_precision = crear_equipo(db, EquipoCreate(nombre="Balanza de Precision", categoria=Categoria.MANTENIMIENTO, sector_id=s_pasteleria.id, estado=Estado.ACTIVO, plan_de_calibracion="Trimestral"))
    envasadora = crear_equipo(db, EquipoCreate(nombre="Envasadora al Vacio", categoria=Categoria.MANTENIMIENTO, sector_id=s_envasado.id, estado=Estado.ACTIVO, plan_de_calibracion="Anual"))

    el1 = crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Trapo de Piso Bacha", frecuenciaDeCambio=1))
    el2 = crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Esponja de Fibra Verde", frecuenciaDeCambio=7))
    el3 = crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Mopa de Microfibra Cuadra", frecuenciaDeCambio=15))
    el4 = crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Repasador Cuadra", frecuenciaDeCambio=3))
    el5 = crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Paño Absorbente Cocina", frecuenciaDeCambio=5))
    el6 = crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Cepillo de Mesada", frecuenciaDeCambio=60))
    el7 = crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Escobillon Salon", frecuenciaDeCambio=30))
    el8 = crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Haragan Secador Pisos", frecuenciaDeCambio=90))
    el9 = crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Balde con Escurridor Reforzado", frecuenciaDeCambio=180))
    el10 = crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Guantes de Nitrilo", frecuenciaDeCambio=None))

    el1.fechaCambio = hoy - timedelta(days=2)
    el2.fechaCambio = hoy - timedelta(days=8)
    el3.fechaCambio = hoy + timedelta(days=2)
    el4.fechaCambio = hoy + timedelta(days=1)
    el5.fechaCambio = hoy + timedelta(days=4)
    el6.fechaCambio = hoy + timedelta(days=35)
    el7.fechaCambio = hoy + timedelta(days=20)
    el8.fechaCambio = hoy + timedelta(days=45)
    el9.fechaCambio = hoy + timedelta(days=110)
    el10.fechaCambio = None
    db.commit()

    fecha_inicio_planes = hoy.date() - timedelta(days=80)
    plan_heladera = crear_plan(db, PlanDeLimpiezaCreate(nombre="Plan Heladera", fecha_inicio=fecha_inicio_planes, equipo_id=heladera.id))
    plan_freezer = crear_plan(db, PlanDeLimpiezaCreate(nombre="Plan Freezer", fecha_inicio=fecha_inicio_planes, equipo_id=freezer.id))
    plan_camara = crear_plan(db, PlanDeLimpiezaCreate(nombre="Plan Camara", fecha_inicio=fecha_inicio_planes, equipo_id=camara.id))
    plan_amasadora = crear_plan(db, PlanDeLimpiezaCreate(nombre="Plan Amasadora", fecha_inicio=fecha_inicio_planes, equipo_id=amasadora.id))
    plan_horno = crear_plan(db, PlanDeLimpiezaCreate(nombre="Plan Horno", fecha_inicio=fecha_inicio_planes, equipo_id=horno.id))

    t_heladera_diaria = crear_tarea(
        db,
        TareaCreate(
            nombre="Desinfeccion de Superficies",
            descripcion="Paso 1. Pulverizar Alcohol Isopropilico 70 Spray a 20 cm. Paso 2. Dejar actuar 5 minutos. Paso 3. Secar con toallitas desinfectantes.",
            frecuencia=Frecuencia.DIARIA,
            plan_id=plan_heladera.id,
            personal_id=juan.legajo,
        ),
    )
    t_heladera_semanal = crear_tarea(
        db,
        TareaCreate(
            nombre="Descongelado y Lavado Profundo",
            descripcion="Paso 1. Desconectar unidad. Paso 2. Lavar rejillas con Detergente Neutro Espumante. Paso 3. Aplicar Sanitizante Clorado Liquido en paredes.",
            frecuencia=Frecuencia.SEMANAL,
            plan_id=plan_heladera.id,
            personal_id=juan.legajo,
        ),
    )

    t_freezer_diaria = crear_tarea(
        db,
        TareaCreate(
            nombre="Sanitizacion Diaria de Puerta y Manija",
            descripcion="Paso 1. Limpiar manija exterior con Toallitas Desinfectantes con Alcohol. Paso 2. Rociar marco con Alcohol Isopropilico 70 Spray.",
            frecuencia=Frecuencia.DIARIA,
            plan_id=plan_freezer.id,
            personal_id=lucia.legajo,
        ),
    )
    t_freezer_mensual = crear_tarea(
        db,
        TareaCreate(
            nombre="Desinfeccion Mensual y Control de Burletes",
            descripcion="Paso 1. Inspeccionar burletes de goma. Paso 2. Lavar con Amonio Cuaternario 5ta Generacion. Paso 3. Aplicar Polvo Abrasivo Sanitizante.",
            frecuencia=Frecuencia.MENSUAL,
            plan_id=plan_freezer.id,
            personal_id=lucia.legajo,
        ),
    )

    t_camara_diaria = crear_tarea(
        db,
        TareaCreate(
            nombre="Lavado y Sanitizacion de Pisos",
            descripcion="Paso 1. Barrer residuos. Paso 2. Preparar solucion de Lavandina Concentrada 55g y Detergente Neutro Espumante. Paso 3. Fregar y escurrir.",
            frecuencia=Frecuencia.DIARIA,
            plan_id=plan_camara.id,
            personal_id=marcos.legajo,
        ),
    )
    t_camara_semanal = crear_tarea(
        db,
        TareaCreate(
            nombre="Desinfeccion de Estanterias y Racks",
            descripcion="Paso 1. Despejar estantes. Paso 2. Pulverizar Amonio Cuaternario 5ta Generacion. Paso 3. Dejar actuar 10 minutos.",
            frecuencia=Frecuencia.SEMANAL,
            plan_id=plan_camara.id,
            personal_id=marcos.legajo,
        ),
    )

    t_amasadora_diaria = crear_tarea(
        db,
        TareaCreate(
            nombre="Limpieza y Desinfeccion de Batea",
            descripcion="Paso 1. Retirar restos de masa. Paso 2. Lavar con Detergente en Polvo Enzimatico. Paso 3. Rociar con Alcohol Isopropilico 70 Spray.",
            frecuencia=Frecuencia.DIARIA,
            plan_id=plan_amasadora.id,
            personal_id=sofia.legajo,
        ),
    )
    t_amasadora_semanal = crear_tarea(
        db,
        TareaCreate(
            nombre="Desengrase General de Motor y Guardas",
            descripcion="Paso 1. Aplicar Desengrasante Alcalino Pesado con trapo humedo. Paso 2. Emulsionar grasas y retirar con paño limpio.",
            frecuencia=Frecuencia.SEMANAL,
            plan_id=plan_amasadora.id,
            personal_id=sofia.legajo,
        ),
    )

    t_horno_diaria = crear_tarea(
        db,
        TareaCreate(
            nombre="Limpieza de Vidrio y Burlete Frontal",
            descripcion="Paso 1. Pulverizar Limpiavidrios Antiestatico sobre cristal. Paso 2. Repasar burlete con Detergente Neutro Espumante.",
            frecuencia=Frecuencia.DIARIA,
            plan_id=plan_horno.id,
            personal_id=carlos.legajo,
        ),
    )
    t_horno_semanal = crear_tarea(
        db,
        TareaCreate(
            nombre="Desengrase Intensivo de Camara",
            descripcion="Paso 1. Aplicar Desengrasante Alcalino Pesado y Soda Caustica en Escamas diluida. Paso 2. Fregar paredes y enjuagar.",
            frecuencia=Frecuencia.SEMANAL,
            plan_id=plan_horno.id,
            personal_id=carlos.legajo,
        ),
    )

    if operador_user:
        crear_tarea(
            db,
            TareaCreate(
                nombre="Sanitizacion Diaria de Bandejas y Rejillas",
                descripcion="Paso 1. Pulverizar Alcohol Isopropilico 70 Spray. Paso 2. Secar con toallitas desinfectantes descartables.",
                frecuencia=Frecuencia.DIARIA,
                plan_id=plan_heladera.id,
                personal_id=operador_user.legajo,
            ),
        )
        crear_tarea(
            db,
            TareaCreate(
                nombre="Control Semanal de Condensador y Filtros",
                descripcion="Paso 1. Cepillar rejilla trasera y aspirar polvo acumulado.",
                frecuencia=Frecuencia.SEMANAL,
                plan_id=plan_heladera.id,
                personal_id=operador_user.legajo,
            ),
        )
        crear_tarea(
            db,
            TareaCreate(
                nombre="Desinfeccion Diaria de Manijas y Burletes",
                descripcion="Paso 1. Limpiar manija exterior con Toallitas Desinfectantes con Alcohol. Paso 2. Dejar secar al aire.",
                frecuencia=Frecuencia.DIARIA,
                plan_id=plan_freezer.id,
                personal_id=operador_user.legajo,
            ),
        )

    if adminopp_user:
        crear_tarea(
            db,
            TareaCreate(
                nombre="Limpieza Diaria de Tolva y Protector",
                descripcion="Paso 1. Desconectar y retirar restos secos de harina. Paso 2. Pulverizar sanitizante neutro.",
                frecuencia=Frecuencia.DIARIA,
                plan_id=plan_amasadora.id,
                personal_id=adminopp_user.legajo,
            ),
        )
        crear_tarea(
            db,
            TareaCreate(
                nombre="Sanitizacion Diaria de Puerta y Cristales",
                descripcion="Paso 1. Pulverizar Limpiavidrios Antiestatico. Paso 2. Repasar con papel tissue.",
                frecuencia=Frecuencia.DIARIA,
                plan_id=plan_horno.id,
                personal_id=adminopp_user.legajo,
            ),
        )
    db.commit()

    responsables = [juan, ana, marcos, lucia, sofia, carlos, diego, valentina, martin]

    for offset in range(75, 0, -1):
        fecha = hoy.date() - timedelta(days=offset)
        responsable = responsables[offset % len(responsables)]
        checklist = Checklist(fecha=fecha, responsable_legajo=responsable.legajo, activo=True)

        factor_consumo = 0.92 if offset >= 38 else 1.0

        items_del_dia = [
            (
                plan_heladera, t_heladera_diaria,
                [
                    {"nombre": "Alcohol Isopropilico 70 Spray", "cantidad": round(180.0 * factor_consumo, 1), "unidad": "ML"},
                    {"nombre": "Toallitas Desinfectantes con Alcohol", "cantidad": 2.0, "unidad": "UN"},
                ]
            ),
            (
                plan_freezer, t_freezer_diaria,
                [
                    {"nombre": "Alcohol Isopropilico 70 Spray", "cantidad": round(60.0 * factor_consumo, 1), "unidad": "ML"},
                    {"nombre": "Toallitas Desinfectantes con Alcohol", "cantidad": 1.0, "unidad": "UN"},
                ]
            ),
            (
                plan_camara, t_camara_diaria,
                [
                    {"nombre": "Lavandina Concentrada 55g", "cantidad": round(0.3 * factor_consumo, 2), "unidad": "L"},
                    {"nombre": "Detergente Neutro Espumante", "cantidad": round(0.08 * factor_consumo, 2), "unidad": "L"},
                ]
            ),
            (
                plan_amasadora, t_amasadora_diaria,
                [
                    {"nombre": "Detergente en Polvo Enzimatico", "cantidad": round(140.0 * factor_consumo, 1), "unidad": "G"},
                    {"nombre": "Alcohol Isopropilico 70 Spray", "cantidad": round(100.0 * factor_consumo, 1), "unidad": "ML"},
                ]
            ),
            (
                plan_horno, t_horno_diaria,
                [
                    {"nombre": "Limpiavidrios Antiestatico", "cantidad": round(75.0 * factor_consumo, 1), "unidad": "ML"},
                    {"nombre": "Detergente Neutro Espumante", "cantidad": round(0.05 * factor_consumo, 2), "unidad": "L"},
                ]
            ),
        ]

        if offset % 7 in (0, 3):
            items_del_dia.append((
                plan_heladera, t_heladera_semanal,
                [
                    {"nombre": "Detergente Neutro Espumante", "cantidad": round(0.45 * factor_consumo, 2), "unidad": "L"},
                    {"nombre": "Sanitizante Clorado Liquido", "cantidad": round(0.2 * factor_consumo, 2), "unidad": "L"},
                ]
            ))
            items_del_dia.append((
                plan_camara, t_camara_semanal,
                [
                    {"nombre": "Amonio Cuaternario 5ta Generacion", "cantidad": round(0.4 * factor_consumo, 2), "unidad": "L"},
                ]
            ))
            items_del_dia.append((
                plan_horno, t_horno_semanal,
                [
                    {"nombre": "Desengrasante Alcalino Pesado", "cantidad": round(0.55 * factor_consumo, 2), "unidad": "L"},
                    {"nombre": "Soda Caustica en Escamas", "cantidad": round(0.3 * factor_consumo, 2), "unidad": "KG"},
                ]
            ))
            items_del_dia.append((
                plan_amasadora, t_amasadora_semanal,
                [
                    {"nombre": "Desengrasante Alcalino Pesado", "cantidad": round(0.35 * factor_consumo, 2), "unidad": "L"},
                ]
            ))

        if offset % 25 == 0:
            items_del_dia.append((
                plan_freezer, t_freezer_mensual,
                [
                    {"nombre": "Amonio Cuaternario 5ta Generacion", "cantidad": round(0.25 * factor_consumo, 2), "unidad": "L"},
                    {"nombre": "Polvo Abrasivo Sanitizante", "cantidad": round(180.0 * factor_consumo, 1), "unidad": "G"},
                    {"nombre": "Bloque Desincrustante Quimico", "cantidad": 1.0, "unidad": "UN"},
                    {"nombre": "Desinfectante Concentrado Peracetico", "cantidad": round(200.0 * factor_consumo, 1), "unidad": "ML"},
                    {"nombre": "Pastillas Sanitizantes de Cisterna", "cantidad": 2.0, "unidad": "UN"},
                    {"nombre": "Hipoclorito de Calcio Granulado", "cantidad": round(0.5 * factor_consumo, 2), "unidad": "KG"},
                    {"nombre": "Pastillas Efervescentes Cloradas", "cantidad": round(40.0 * factor_consumo, 1), "unidad": "G"},
                    {"nombre": "Jabon Antibacterial Clorhexidina", "cantidad": round(90.0 * factor_consumo, 1), "unidad": "ML"},
                ]
            ))

        for j, (plan, tarea, insumos) in enumerate(items_del_dia):
            realizada = not (offset % 8 == 0 and j == len(items_del_dia) - 1)
            item = ChecklistItem(
                plan_id=plan.id,
                nombre_plan=plan.nombre,
                tarea_id=tarea.id,
                nombre_tarea=tarea.nombre,
                descripcion_tarea=tarea.descripcion,
                frecuencia=tarea.frecuencia,
                estado=EstadoTareaItem.REALIZADO if realizada else EstadoTareaItem.PENDIENTE,
                responsable_legajo=responsable.legajo if realizada else None,
                insumos_utilizados=json.dumps(insumos, ensure_ascii=False) if realizada else None,
                fecha_hora_fin=datetime.combine(fecha, datetime.min.time()) + timedelta(hours=9, minutes=15 * j) if realizada else None,
            )
            checklist.items.append(item)
        db.add(checklist)
    db.commit()

    checklist_hoy_marcos = generar_checklist(db, ChecklistGenerar(responsable_legajo=marcos.legajo, fecha=date.today()))
    if checklist_hoy_marcos.items:
        completar_tarea(
            db,
            checklist_hoy_marcos.id,
            checklist_hoy_marcos.items[0].id,
            CompletarTareaSchema(
                responsable_legajo=marcos.legajo,
                insumos_utilizados=[
                    InsumoUtilizadoPlaceholder(nombre="Lavandina Concentrada 55g", cantidad=0.35, unidad="L"),
                    InsumoUtilizadoPlaceholder(nombre="Detergente Neutro Espumante", cantidad=0.15, unidad="L"),
                ],
            ),
        )

    checklist_hoy_juan = generar_checklist(db, ChecklistGenerar(responsable_legajo=juan.legajo, fecha=date.today()))
    if checklist_hoy_juan.items:
        completar_tarea(
            db,
            checklist_hoy_juan.id,
            checklist_hoy_juan.items[0].id,
            CompletarTareaSchema(
                responsable_legajo=juan.legajo,
                insumos_utilizados=[
                    InsumoUtilizadoPlaceholder(nombre="Alcohol Isopropilico 70 Spray", cantidad=200.0, unidad="ML"),
                    InsumoUtilizadoPlaceholder(nombre="Toallitas Desinfectantes con Alcohol", cantidad=2.0, unidad="UN"),
                ],
            ),
        )

    if operador_user:
        checklist_hoy_op = generar_checklist(db, ChecklistGenerar(responsable_legajo=operador_user.legajo, fecha=date.today()))
        if len(checklist_hoy_op.items) >= 2:
            completar_tarea(
                db,
                checklist_hoy_op.id,
                checklist_hoy_op.items[0].id,
                CompletarTareaSchema(
                    responsable_legajo=operador_user.legajo,
                    insumos_utilizados=[
                        InsumoUtilizadoPlaceholder(nombre="Alcohol Isopropilico 70 Spray", cantidad=150.0, unidad="ML"),
                        InsumoUtilizadoPlaceholder(nombre="Toallitas Desinfectantes con Alcohol", cantidad=1.0, unidad="UN"),
                    ],
                ),
            )
            item_no_realizado = checklist_hoy_op.items[1]
            item_no_realizado.estado = EstadoTareaItem.NO_REALIZADO
            item_no_realizado.motivo_no_realizado = "Equipo en funcionamiento continuo o producción activa"
            db.commit()

            item_hist = ChecklistItemHistorial(
                item_id=item_no_realizado.id,
                fecha_hora=datetime.now() - timedelta(minutes=45),
                accion="NO_REALIZADO",
                detalle="Marcada como no realizada por operador: Equipo en funcionamiento continuo o producción activa",
            )
            db.add(item_hist)

            reasignacion_demo = ReasignacionPendiente(
                item_origen_id=item_no_realizado.id,
                checklist_origen_id=checklist_hoy_op.id,
                nuevo_responsable_legajo=carlos.legajo,
                plan_id=item_no_realizado.plan_id,
                nombre_plan=item_no_realizado.nombre_plan,
                tarea_id=item_no_realizado.tarea_id,
                nombre_tarea=item_no_realizado.nombre_tarea,
                descripcion_tarea=item_no_realizado.descripcion_tarea,
                frecuencia=item_no_realizado.frecuencia,
                fecha_origen=date.today(),
                motivo="Reasignacion operativa para turno tarde",
            )
            db.add(reasignacion_demo)
            db.commit()

    motivos_seed = [
        "Falta de insumo químico o desinfectante requerido",
        "Equipo en funcionamiento continuo o producción activa",
        "Equipo fuera de servicio o en mantenimiento preventivo",
        "Corte temporal de suministro de agua potable",
        "Falta o rotura de elementos de limpieza (esponjas, cepillos, paños)",
        "Sector bloqueado u obstaculizado por tareas de mantenimiento edilicio",
        "Priorización operativa por urgencia sanitaria o derrame",
        "Acceso restringido por sanitización previa o tiempo de contacto químico",
    ]
    for nom_m in motivos_seed:
        if not db.query(MotivoNoRealizado).filter_by(nombre=nom_m).first():
            db.add(MotivoNoRealizado(nombre=nom_m, activo=True))
    db.commit()

    tipos_doc_seed = [
        "Procedimiento Operativo",
        "Manual de Calidad",
        "Receta Estandarizada",
        "Registro de Control",
        "Instructivo de Trabajo",
        "Ficha Técnica",
    ]
    for nom_td in tipos_doc_seed:
        if not db.query(TipoDocModel).filter_by(nombre=nom_td).first():
            db.add(TipoDocModel(nombre=nom_td))
    db.commit()

    pdf_poes = UploadFile(file=io.BytesIO(generar_pdf_valido("POES - Sanitizacion General", "Procedimiento Operativo Estandarizado de Saneamiento")), filename="poes_general.pdf")
    crear_documento(
        db,
        titulo="POES - Procedimiento Operativo Estandarizado de Saneamiento",
        tipo="Procedimiento",
        version="1.0",
        file=pdf_poes,
        descripcion="Procedimientos de limpieza y desinfeccion de superficies en contacto con alimentos",
        fecha_vigencia=hoy.date() - timedelta(days=180),
        fecha_vencimiento=hoy.date() - timedelta(days=8),
        responsable_legajo=ana.legajo,
    )

    pdf_mip = UploadFile(file=io.BytesIO(generar_pdf_valido("Plan MIP - Control de Plagas", "Manejo Integrado de Plagas")), filename="plan_mip.pdf")
    crear_documento(
        db,
        titulo="Plan MIP - Manejo Integrado de Plagas",
        tipo="Procedimiento",
        version="1.0",
        file=pdf_mip,
        descripcion="Programa de monitoreo, cebaderas, trampas de luz y barreras fisicas",
        fecha_vigencia=hoy.date() - timedelta(days=90),
        fecha_vencimiento=hoy.date() + timedelta(days=5),
        responsable_legajo=ana.legajo,
    )

    pdf1 = UploadFile(file=io.BytesIO(generar_pdf_valido("Manual de Buenas Practicas de Manufactura", "Version 1.0 (Archivada)")), filename="manual_bpm_v1.pdf")
    doc_bpm = crear_documento(
        db,
        titulo="Manual de Buenas Practicas de Manufactura",
        tipo="Manual de BPM",
        version="1.0",
        file=pdf1,
        descripcion="Procedimientos operativos y sanitarios de produccion",
        fecha_vigencia=hoy.date() - timedelta(days=365),
        fecha_vencimiento=hoy.date() - timedelta(days=60),
        responsable_legajo=ana.legajo,
    )
    pdf2 = UploadFile(file=io.BytesIO(generar_pdf_valido("Manual de Buenas Practicas de Manufactura", "Version 2.0 (Vigente)")), filename="manual_bpm_v2.pdf")
    subir_nueva_version(
        db,
        documento_id=doc_bpm.id,
        version="2.0",
        file=pdf2,
        fecha_vencimiento=hoy.date() + timedelta(days=180),
        responsable_legajo=ana.legajo,
    )

    pdf_receta = UploadFile(file=io.BytesIO(generar_pdf_valido("Receta Estandar: Medialunas de Manteca", "Version 1.0 (Vigente)")), filename="receta_medialunas.pdf")
    doc_receta = crear_documento(
        db,
        titulo="Receta Estandar: Medialunas de Manteca",
        tipo="Receta",
        version="1.0",
        file=pdf_receta,
        descripcion="Formulacion oficial para panificados dulces hojaldrados",
        fecha_vigencia=hoy.date() - timedelta(days=30),
        fecha_vencimiento=hoy.date() + timedelta(days=335),
        responsable_legajo=marcos.legajo,
    )

    pdf_recall = UploadFile(file=io.BytesIO(generar_pdf_valido("Procedimiento de Recall y Trazabilidad", "Version 1.0")), filename="procedimiento_recall.pdf")
    crear_documento(
        db,
        titulo="Procedimiento de Trazabilidad y Retiro de Producto",
        tipo="Procedimiento",
        version="1.0",
        file=pdf_recall,
        descripcion="Protocolo de respuesta ante contingencias y retiro de lotes del mercado",
        fecha_vigencia=hoy.date() - timedelta(days=120),
        fecha_vencimiento=hoy.date() + timedelta(days=12),
        responsable_legajo=laura.legajo,
    )

    pdf_pan_receta = UploadFile(file=io.BytesIO(generar_pdf_valido("Receta Estandar: Pan de Campo", "Version 1.0")), filename="receta_pan_campo.pdf")
    doc_pan_receta = crear_documento(
        db,
        titulo="Receta Estandar: Pan de Campo",
        tipo="Receta",
        version="1.0",
        file=pdf_pan_receta,
        descripcion="Formulacion de masa madre y horneado tradicional",
        fecha_vigencia=hoy.date() - timedelta(days=45),
        fecha_vencimiento=hoy.date() + timedelta(days=320),
        responsable_legajo=marcos.legajo,
    )

    planes_cal = [
        ("Heladera Exhibidora", 180, 210),
        ("Horno Convector", 180, 195),
        ("Freezer Deposito", 180, 172),
        ("Termometro Pinche", 30, 26),
        ("Balanza Digital de Cuadra", 180, 174),
        ("Camara Frigorifica", 90, 20),
        ("Amasadora Industrial", 365, 90),
        ("Balanza de Precision", 90, 30),
        ("Batidora Planetaria", 365, 175),
    ]
    for nombre_equipo, periodicidad, dias_desde in planes_cal:
        equipo = db.query(Equipo).filter(Equipo.nombre == nombre_equipo).one()
        ultimo = hoy - timedelta(days=dias_desde)
        plan_cal = Plan_de_Calibracion(
            nombre=f"Calibracion {nombre_equipo}",
            fecha_mantenimiento=ultimo,
            fecha_vencimiento=ultimo + timedelta(days=periodicidad),
            periodicidad_De_cambio=periodicidad,
            descripcion=f"Calibracion periodica de {nombre_equipo} contra patron certificado",
            equipo_id=equipo.id,
        )
        db.add(plan_cal)
        db.flush()
        nombre_archivo = f"calibracion_{plan_cal.id}_{ultimo:%Y%m%d}.pdf"
        (carpeta_calibraciones / nombre_archivo).write_bytes(
            generar_pdf_valido(f"Certificado de calibracion: {nombre_equipo}", f"Realizada el {ultimo:%d/%m/%Y}")
        )
        db.add(Calibracion_Realizada(
            fecha_d_realizacion=ultimo,
            formato_archivo=f"/calibracion_realizada/archivos/{nombre_archivo}",
            plan_calibracion_id=plan_cal.id,
        ))
    db.commit()

    cat_equip = crear_categoria(db, CategoriaIncidenteCreate(nombre="Equipamiento / Maquinaria", descripcion="Fallas mecánicas, eléctricas o desvíos térmicos en maquinarias de elaboración"))
    cat_hig = crear_categoria(db, CategoriaIncidenteCreate(nombre="Higiene y Limpieza", descripcion="Desvíos en POES, derrames, falta de sanitización o suciedad acumulada"))
    cat_edil = crear_categoria(db, CategoriaIncidenteCreate(nombre="Edilicio e Infraestructura", descripcion="Pérdidas de agua, rotura de vidrios, problemas de iluminación o desagües"))
    cat_mat = crear_categoria(db, CategoriaIncidenteCreate(nombre="Materia Prima e Insumos", descripcion="Desvíos en materias primas, rotulación, embalajes o conservación"))
    cat_plagas = crear_categoria(db, CategoriaIncidenteCreate(nombre="Control de Plagas", descripcion="Detección o indicios de vectores y problemas en barreras físicas"))
    cat_bpm = crear_categoria(db, CategoriaIncidenteCreate(nombre="Conducta y Buenas Prácticas", descripcion="Incumplimiento de indumentaria, cofia, higiene de manos o protocolos sanitarios"))

    incidentes_data = [
        ("Se detecto una perdida de agua debajo de la bacha del sector de lavado.", EstadoIncidente.PENDIENTE, 0.25, juan, None, None, None, TipoIncidente.EDILICIO, cat_edil.id),
        ("El cable de conexion de la batidora planetaria presenta desgaste exterior.", EstadoIncidente.PENDIENTE, 0.5, sofia, None, None, None, TipoIncidente.EQUIPAMIENTO, cat_equip.id),
        ("La balanza digital de cuadra muestra fluctuaciones de cero.", EstadoIncidente.PENDIENTE, 0.8, carlos, None, None, None, TipoIncidente.EQUIPAMIENTO, cat_equip.id),
        ("La heladera exhibidora marca 9 grados, por encima del limite permitido.", EstadoIncidente.PENDIENTE, 2.0, lucia, None, None, None, TipoIncidente.EQUIPAMIENTO, cat_equip.id),
        ("Desvio en la medicion de humedad en camara de fermentacion de cuadra.", EstadoIncidente.EN_REVISION, 1.5, marcos, None, None, None, TipoIncidente.EQUIPAMIENTO, cat_equip.id),
        ("Derrame accidental de aceite vegetal sobre el suelo del deposito.", EstadoIncidente.EN_REVISION, 2.5, diego, None, None, None, TipoIncidente.LIMPIEZA, cat_hig.id),
        ("Se encontro un envase de crema de leche abierto y sin rotular en la camara.", EstadoIncidente.EN_REVISION, 4.0, sofia, None, None, None, TipoIncidente.MATERIA_PRIMA, cat_mat.id),
        ("Cerradura del deposito secundario de quimicos trabada y sin llave de repuesto.", EstadoIncidente.PENDIENTE, 5.0, juan, None, None, None, TipoIncidente.EDILICIO, cat_edil.id),
        ("El termometro digital de la camara frigorifica no enciende ni registra.", EstadoIncidente.REABIERTO, 6.0, lucia, None, None, "El reemplazo temporal volvio a apagarse repentinamente.", TipoIncidente.EQUIPAMIENTO, cat_equip.id),
        ("Mancha de grasa persistente en base de la sobadora tras sanitizacion.", EstadoIncidente.REABIERTO, 7.0, martin, None, None, "Se observo nuevo goteo tras uso continuo en turno tarde.", TipoIncidente.LIMPIEZA, cat_hig.id),
        ("Falta de jabon antibacterial en el lavamanos de la cocina.", EstadoIncidente.CERRADO, 9.0, marcos, ana, "Se repuso el jabon antibacterial y se agrego control al checklist diario.", None, TipoIncidente.LIMPIEZA, cat_hig.id),
        ("Presencia de insectos cerca de la puerta del deposito.", EstadoIncidente.CERRADO, 15.0, juan, ana, "Se contrato fumigacion y se coloco cortina de aire en la puerta.", None, TipoIncidente.PLAGAS, cat_plagas.id),
        ("Un empleado ingreso a produccion sin cofia reglamentaria.", EstadoIncidente.DESCARTADO, 20.0, sofia, ana, "Se realizo apercibimiento y capacitacion verbal sobre BPM.", None, TipoIncidente.CONDUCTA, cat_bpm.id),
        ("Envase de desengrasante con rotulo secundario semiborrado.", EstadoIncidente.CERRADO, 25.0, marcos, ana, "Se reimprimio y coloco etiqueta normalizada segun norma SGA.", None, TipoIncidente.LIMPIEZA, cat_hig.id),
        ("Luminaria del sector cuadra con parpadeo constante.", EstadoIncidente.CERRADO, 30.0, carlos, laura, "Se reemplazo el tubo LED estanco por mantenimiento interno.", None, TipoIncidente.EDILICIO, cat_edil.id),
    ]

    for desc, estado, dias, reporta, resuelve, accion, motivo, tipo_inc, cat_id in incidentes_data:
        creado = hoy - timedelta(days=dias)
        cerrado = creado + timedelta(days=1) if estado in (EstadoIncidente.CERRADO, EstadoIncidente.DESCARTADO) else None
        db.add(Incidente(
            descripcion=desc,
            tipo=tipo_inc,
            categoria_id=cat_id,
            estado=estado,
            creado_el=creado,
            reportado_por_id=reporta.legajo,
            accion_correctiva=accion,
            cerrado_el=cerrado,
            resuelto_por_id=resuelve.legajo if resuelve else None,
            motivo_reapertura=motivo,
        ))
    db.commit()

    t_manip = crear_tipo_certificado(db, "Carnet de Manipulacion de Alimentos")
    t_libreta = crear_tipo_certificado(db, "Libreta Sanitaria")
    t_curso = crear_tipo_certificado(db, "Curso de BPM")
    t_hs = crear_tipo_certificado(db, "Capacitacion en Higiene y Seguridad")
    t_primeros = crear_tipo_certificado(db, "Primeros Auxilios y Evacuacion")

    def pdf_certificado(titulo: str, persona) -> UploadFile:
        contenido = generar_pdf_valido(titulo, f"{persona.nombre} {persona.apellido} - Legajo {persona.legajo}")
        return UploadFile(file=io.BytesIO(contenido), filename=f"{titulo.lower().replace(' ', '_')}.pdf")

    certificados = [
        (marcos, t_manip, -12, True),
        (sofia, t_hs, -25, True),
        (carlos, t_libreta, -5, True),
        (juan, t_libreta, 8, False),
        (lucia, t_libreta, 4, True),
        (diego, t_manip, 10, True),
        (juan, t_manip, 180, True),
        (ana, t_manip, 270, True),
        (ana, t_curso, 90, True),
        (marcos, t_hs, 45, False),
        (lucia, t_curso, 350, True),
        (sofia, t_manip, 30, False),
        (laura, t_libreta, 200, True),
        (laura, t_hs, 150, True),
        (valentina, t_manip, 310, True),
        (valentina, t_curso, 220, True),
        (martin, t_manip, 140, True),
        (martin, t_primeros, 60, True),
    ]
    for persona, tipo, dias, con_archivo in certificados:
        crear_certificado(
            db,
            id_tipo=tipo.id,
            fechaVencimiento=hoy + timedelta(days=dias),
            legajo_persona=persona.legajo,
            archivo=pdf_certificado(tipo.nombre, persona) if con_archivo else None,
        )
    db.commit()

    pdf_amb_plagas = UploadFile(file=io.BytesIO(generar_pdf_valido("Certificado de Desinsectacion y Desratizacion", "Servicio Mensual de Control de Plagas")), filename="control_plagas.pdf")
    crear_control_ambiental(
        db,
        tipo=TipoControlAmbiental.PLAGAS,
        periodicidad_dias=30,
        observaciones="Servicio periódico realizado por Fumigaciones Ambientales SRL. Cebaderas operativas y sin novedades.",
        fecha_realizacion_inicial=hoy.date() - timedelta(days=10),
        file=pdf_amb_plagas,
    )

    pdf_amb_agua = UploadFile(file=io.BytesIO(generar_pdf_valido("Analisis Fisico-Quimico y Microbiologico de Agua", "Laboratorio Central de Aguas")), filename="analisis_agua.pdf")
    crear_control_ambiental(
        db,
        tipo=TipoControlAmbiental.AGUA,
        periodicidad_dias=180,
        observaciones="Muestreo de red y pozo apto para consumo humano segun CAA Articulo 982.",
        fecha_realizacion_inicial=hoy.date() - timedelta(days=175),
        file=pdf_amb_agua,
    )

    pdf_amb_tanque = UploadFile(file=io.BytesIO(generar_pdf_valido("Certificado de Limpieza y Desinfeccion de Tanques", "Tanques de Reserva Agua Potable")), filename="limpieza_tanque.pdf")
    crear_control_ambiental(
        db,
        tipo=TipoControlAmbiental.TANQUE,
        periodicidad_dias=180,
        observaciones="Limpieza de sedimentos, lavado a presion y cloracion de cisternas y tanques elevados.",
        fecha_realizacion_inicial=hoy.date() - timedelta(days=190),
        file=pdf_amb_tanque,
    )

    notificaciones_seed = [
        (juan.legajo, "Tarea de Limpieza Asignada", "Tiene asignada la tarea Desinfeccion de Superficies en Heladera Exhibidora.", "TAREA", hoy - timedelta(hours=2), False),
        (juan.legajo, "Vencimiento Próximo de Materia Prima", "El insumo Queso de Maquina vence en 8 días.", "VENCIMIENTO", hoy - timedelta(hours=5), True),
        (ana.legajo, "Nuevo Incidente Reportado", "Se reportó pérdida de agua en Bacha del sector de lavado.", "INCIDENTE", hoy - timedelta(hours=3), False),
        (ana.legajo, "Documento Vencido", "El documento POES General ha vencido hace 8 días.", "VENCIMIENTO", hoy - timedelta(days=1), False),
        (marcos.legajo, "Calibración Requerida", "La Heladera Exhibidora se encuentra con calibración vencida.", "CALIBRACION", hoy - timedelta(days=2), True),
        (marcos.legajo, "Lote Registrado Exitosamente", "Se registró el lote de Pan de Campo.", "PRODUCCION", hoy - timedelta(hours=6), False),
        (lucia.legajo, "Inspección Programada", "Recordatorio de control de temperaturas de cámaras frigoríficas.", "TAREA", hoy - timedelta(hours=1), False),
        (sofia.legajo, "Actualización de Libreta Sanitaria", "Su Libreta Sanitaria vence en 4 días.", "VENCIMIENTO", hoy - timedelta(days=1), False),
        (carlos.legajo, "Tarea de Sanitización Asignada", "Limpieza de Vidrio y Burlete Frontal del Horno Convector asignada.", "TAREA", hoy - timedelta(hours=4), False),
        (laura.legajo, "Alerta de Stock Crítico", "El insumo Crema de Leche ha alcanzado el nivel de reposición.", "STOCK", hoy - timedelta(days=2), True),
    ]
    if operador_user:
        notificaciones_seed.append((operador_user.legajo, "Checklist Diario Asignado", "Tiene checklist pendiente de sanitización asignado para hoy.", "TAREA", hoy - timedelta(hours=1), False))
    if adminopp_user:
        notificaciones_seed.append((adminopp_user.legajo, "Control Ambiental Vencido", "El control de Limpieza de Tanque se encuentra vencido y requiere visita técnica.", "VENCIMIENTO", hoy - timedelta(days=1), False))

    for uid, tit, msg, tip, fec, lei in notificaciones_seed:
        db.add(Notificacion(
            usuario_id=uid,
            titulo=tit,
            mensaje=msg,
            tipo=tip,
            fecha=fec,
            leida=lei,
            leida_el=fec + timedelta(minutes=10) if lei else None,
        ))
    db.commit()

    p_pan = Producto(nombre="Pan de Campo", descripcion="Pan rústico de masa madre 500g", unidadMedida=UnidadMedida.KILOGRAMOS, activo=True, visible_publico=True, id_receta=doc_pan_receta.id)
    p_medialunas = Producto(nombre="Medialunas de Manteca", descripcion="Docena de medialunas dulces hojaldradas", unidadMedida=UnidadMedida.UNIDADES, activo=True, visible_publico=True, id_receta=doc_receta.id)
    p_baguette = Producto(nombre="Baguette Tradicional", descripcion="Baguette artesanal crujiente 250g", unidadMedida=UnidadMedida.UNIDADES, activo=True, visible_publico=True)
    p_torta = Producto(nombre="Torta de Chocolate", descripcion="Torta artesanal húmeda con cobertura semiamarga", unidadMedida=UnidadMedida.KILOGRAMOS, activo=True, visible_publico=True)
    p_lactal = Producto(nombre="Pan Lactal Blanco", descripcion="Pan de molde enriquecido con leche 450g", unidadMedida=UnidadMedida.UNIDADES, activo=True, visible_publico=True)
    p_salvado = Producto(nombre="Pan de Salvado y Semillas", descripcion="Pan integral con mix de semillas 450g", unidadMedida=UnidadMedida.UNIDADES, activo=True, visible_publico=True)
    p_facturas = Producto(nombre="Facturas Surtidas", descripcion="Variedad de medialunas, vigilantes y cañoncitos", unidadMedida=UnidadMedida.UNIDADES, activo=True, visible_publico=True)
    p_budin = Producto(nombre="Budin de Limon y Glaseado", descripcion="Budín esponjoso con glaseado de limón 350g", unidadMedida=UnidadMedida.UNIDADES, activo=True, visible_publico=False)
    p_chipa = Producto(nombre="Chipa Tradicional", descripcion="Chipa de queso y almidón de mandioca", unidadMedida=UnidadMedida.KILOGRAMOS, activo=True, visible_publico=True)
    p_ciabatta = Producto(nombre="Ciabatta Rústica", descripcion="Pan italiano de alta hidratación 300g", unidadMedida=UnidadMedida.UNIDADES, activo=True, visible_publico=False)

    db.add_all([p_pan, p_medialunas, p_baguette, p_torta, p_lactal, p_salvado, p_facturas, p_budin, p_chipa, p_ciabatta])
    db.commit()

    insumos_map = {i.nombre: i for i in db.query(Insumo).all()}

    lotes_cronograma = []

    for d in range(7):
        f_dia = hoy.date() - timedelta(days=6 - d)
        lotes_cronograma.append((p_pan, f_dia, 60.0 + (d * 5 % 25), juan.legajo, [("Harina 000", 32.0), ("Levadura Fresca", 1.1), ("Sal Fina", 0.7)]))
        lotes_cronograma.append((p_medialunas, f_dia, 150.0 + (d * 15 % 60), marcos.legajo, [("Harina 0000", 22.0), ("Manteca", 9.0), ("Azucar Comun", 5.5), ("Huevos", 30.0)]))
        if d % 2 == 0:
            lotes_cronograma.append((p_baguette, f_dia, 80.0 + (d * 4 % 20), carlos.legajo, [("Harina 000", 18.0), ("Levadura Fresca", 0.5), ("Sal Fina", 0.4)]))
        else:
            lotes_cronograma.append((p_facturas, f_dia, 110.0 + (d * 8 % 30), sofia.legajo, [("Harina 0000", 16.0), ("Manteca", 6.5), ("Dulce de Leche Repostero", 4.5)]))
        if d % 3 == 0:
            lotes_cronograma.append((p_torta, f_dia, 24.0 + (d * 3 % 10), marcos.legajo, [("Harina 0000", 7.5), ("Chocolate Cobertura Semiamargo", 5.5), ("Huevos", 18.0)]))
        elif d % 3 == 1:
            lotes_cronograma.append((p_lactal, f_dia, 75.0 + (d * 5 % 15), ana.legajo, [("Harina 0000", 18.0), ("Leche Entera", 5.5), ("Manteca", 2.8)]))
        else:
            lotes_cronograma.append((p_chipa, f_dia, 35.0 + (d * 4 % 12), diego.legajo, [("Almidon de Maiz", 15.0), ("Queso de Maquina", 6.0), ("Huevos", 20.0)]))

    fechas_oct_semanas = [
        date(hoy.year, 10, 2),
        date(hoy.year, 10, 3),
        date(hoy.year, 10, 5),
        date(hoy.year, 10, 7),
        date(hoy.year, 10, 9),
        date(hoy.year, 10, 12),
        date(hoy.year, 10, 14),
        date(hoy.year, 10, 16),
        date(hoy.year, 10, 19),
        date(hoy.year, 10, 21),
        date(hoy.year, 10, 23),
    ]
    for idx_f, f_sem in enumerate(fechas_oct_semanas):
        lotes_cronograma.append((p_pan, f_sem, 70.0 + (idx_f * 3 % 20), juan.legajo, [("Harina 000", 35.0), ("Levadura Fresca", 1.2)]))
        lotes_cronograma.append((p_medialunas, f_sem, 170.0 + (idx_f * 10 % 50), marcos.legajo, [("Harina 0000", 24.0), ("Manteca", 9.5)]))
        if idx_f % 2 == 0:
            lotes_cronograma.append((p_salvado, f_sem, 55.0 + (idx_f * 2 % 15), diego.legajo, [("Harina Integral Fina", 20.0), ("Semillas de Sesamo", 2.0)]))
        else:
            lotes_cronograma.append((p_ciabatta, f_sem, 65.0 + (idx_f * 3 % 15), carlos.legajo, [("Harina 000", 20.0), ("Aceite de Girasol", 1.5)]))

    for m in range(1, hoy.month):
        dias_mes = [5, 12, 19, 26]
        for idx_d, dia_num in enumerate(dias_mes):
            f_mes = date(hoy.year, m, dia_num)
            lotes_cronograma.append((p_pan, f_mes, 80.0 + ((m + idx_d) * 4 % 25), juan.legajo, [("Harina 000", 40.0), ("Levadura Fresca", 1.3)]))
            lotes_cronograma.append((p_medialunas, f_mes, 200.0 + ((m + idx_d) * 12 % 60), marcos.legajo, [("Harina 0000", 28.0), ("Manteca", 11.0)]))
            if idx_d % 2 == 0:
                lotes_cronograma.append((p_baguette, f_mes, 90.0 + (m * 3 % 20), carlos.legajo, [("Harina 000", 22.0), ("Sal Fina", 0.5)]))
                lotes_cronograma.append((p_torta, f_mes, 30.0 + (m * 2 % 10), sofia.legajo, [("Harina 0000", 9.0), ("Chocolate Cobertura Semiamargo", 7.0)]))
            else:
                lotes_cronograma.append((p_lactal, f_mes, 85.0 + (m * 4 % 20), ana.legajo, [("Harina 0000", 21.0), ("Leche Entera", 6.0)]))
                lotes_cronograma.append((p_facturas, f_mes, 130.0 + (m * 8 % 30), marcos.legajo, [("Harina 0000", 19.0), ("Manteca", 7.5)]))

    for idx, (prod, f_lote, cant, resp, ins_lista) in enumerate(lotes_cronograma, start=1):
        cod = f"L-{f_lote:%Y%m%d}-{idx:02d}"
        lote_obj = LoteProduccion(
            codigo=cod,
            producto_id=prod.id,
            fecha=f_lote,
            cantidad=cant,
            responsable_legajo=resp,
        )
        for nom_ins, cant_ins in ins_lista:
            ins_db = insumos_map.get(nom_ins)
            if ins_db:
                lote_obj.insumos.append(InsumoLote(insumo=ins_db, cantidad=cant_ins))
        db.add(lote_obj)
    db.commit()

    id_qr = str(uuid.uuid4())
    db.add(IndentificadorUnico(
        id_alfanumerico=id_qr,
        estado=True,
        urldelQR=f"http://localhost:5173/publico/{id_qr}",
        ver_grafico=True,
        verAcercaDeNosotros=True,
        verProductos=True,
    ))

    db.add(AcercaDeNosotros(
        id=1,
        descripcion="Somos una panificadora y elaboradora de alimentos artesanales comprometida con los más altos estándares de inocuidad alimentaria, trazabilidad de materias primas y buenas prácticas de manufactura (BPM).",
    ))
    db.commit()

    auditorias = [
        Auditoria(
            tabla="personal",
            registro_id=juan.legajo,
            accion=AccionAuditoria.CREAR,
            campo=None,
            valor_previo=None,
            valor_posterior="Juan Perez (operador)",
            creado_el=hoy - timedelta(days=60),
        ),
        Auditoria(
            tabla="documentos",
            registro_id=doc_bpm.id,
            accion=AccionAuditoria.MODIFICAR,
            campo="version_vigente",
            valor_previo="1.0",
            valor_posterior="2.0",
            creado_el=hoy - timedelta(days=10),
        ),
        Auditoria(
            tabla="controles_ambientales",
            registro_id=1,
            accion=AccionAuditoria.CREAR,
            campo=None,
            valor_previo=None,
            valor_posterior="Control de Plagas registrado",
            creado_el=hoy - timedelta(days=10),
        ),
        Auditoria(
            tabla="incidentes",
            registro_id=11,
            accion=AccionAuditoria.MODIFICAR,
            campo="estado",
            valor_previo="PENDIENTE",
            valor_posterior="CERRADO",
            creado_el=hoy - timedelta(days=8),
        ),
    ]
    db.add_all(auditorias)
    db.commit()

    db.close()

    backend_dir = Path(__file__).resolve().parent.parent
    root_dir = backend_dir.parent

    db_paths_to_sync = [
        backend_dir / "db.sqlite3",
        backend_dir / "app.db",
        root_dir / "db.sqlite3",
        root_dir / "app.db",
    ]

    source_db = Path(engine.url.database).resolve()
    if source_db.exists():
        for target in db_paths_to_sync:
            if target.resolve() != source_db:
                shutil.copy2(source_db, target)
        print(f"Base de datos sincronizada desde {source_db} hacia todas las ubicaciones.")

    print("Base de datos regenerada exitosamente con datos consistentes y completos para todas las entidades.")

if __name__ == "__main__":
    main()
