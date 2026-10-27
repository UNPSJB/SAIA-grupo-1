"""
Alimenta la base local (db.sqlite3 / app.db) con datos realistas, variados y cohesivos
para poder navegar y probar la app a mano y visualizar todas las estadísticas del Dashboard:
- Vencimientos consolidados (personal, calibraciones, elementos de limpieza, documentos y materias primas).
- Cumplimiento de tareas de limpieza (diario, semanal, mensual con tasas de ~85% y estado actual).
- Incidentes (críticos +72h, media urgencia 24h-72h, recientes <24h, reabiertos y cerrados con acción correctiva).
- Consumo histórico de insumos químicos (todas las unidades L, ML, KG, G, UN; todos los tipos; variación porcentual entre períodos; desglose por proveedor y curvas temporales).

Uso (parado en backend/, con el venv activado):
    python scripts/seed_dev_db.py
    python scripts/seed_dev_db.py --reset
"""
import io
import json
import shutil
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.database import SessionLocal, engine, asegurar_migraciones_esquema, migrar_esquema
from src.models import ModeloBase

import src.categorias_incidentes.models
import src.notificaciones.models
import src.plan_de_calibracion.models
import src.calibracion_realizada.models
import src.tipoCertificado.models
import src.incidentes.models

from src.personal.models import Personal
from src.personal.services import crear_personal
from src.personal.schemas import PersonalCreate
from src.autenticacion.services import asegurar_usuarios_dev

from src.insumos.services import crear_insumo
from src.insumos.schemas import InsumoCreate
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
import src.sectores.models

from src.elementosDeLimpieza.services import crear_elementoDeLimpieza
from src.elementosDeLimpieza.schemas import ElementoDeLimpiezaCreate

from src.plan_De_limpieza.services import crear_plan
from src.plan_De_limpieza.schemas import PlanDeLimpiezaCreate

from src.tareas.services import crear_tarea
from src.tareas.schemas import TareaCreate
from src.tareas.models import Frecuencia

from src.checklist.services import generar_checklist, completar_tarea
from src.checklist.schemas import ChecklistGenerar, CompletarTareaSchema, InsumoUtilizadoPlaceholder
from src.checklist.models import Checklist, ChecklistItem, EstadoTareaItem
from src.documentos.models import Documento, VersionDocumento
from src.documentos.services import crear_documento, subir_nueva_version
from src.documentos.constants import TipoDocumento
from src.auditoria.models import Auditoria
from fastapi import UploadFile

INSUMOS = [
    ("Harina 000", "HAR3-2409", 12, 150, 250.0, 180.0, UnidadMedida.KILOGRAMOS),
    ("Harina 0000", "HAR4-2409", 12, 140, 100.0, 60.0, UnidadMedida.KILOGRAMOS),
    ("Manteca", "MAN-2409", 6, 12, 40.0, 22.0, UnidadMedida.KILOGRAMOS),
    ("Azucar Comun", "AZC-2408", 30, 365, 100.0, 75.0, UnidadMedida.KILOGRAMOS),
    ("Azucar Impalpable", "AZI-2408", 30, 300, 25.0, 14.0, UnidadMedida.KILOGRAMOS),
    ("Huevos", "HUE-2409", 4, 18, 360.0, 210.0, UnidadMedida.UNIDADES),
    ("Leche Entera", "LEC-2409", 8, 4, 60.0, 34.0, UnidadMedida.LITROS),
    ("Crema de Leche", "CRE-2409", 14, -3, 20.0, 8.0, UnidadMedida.LITROS),
    ("Queso Crema", "QCR-2409", 7, 5, 20.0, 6.0, UnidadMedida.KILOGRAMOS),
    ("Levadura Fresca", "LEV-2409", 6, 3, 5.0, 2.5, UnidadMedida.KILOGRAMOS),
    ("Sal Fina", "SAL-2407", 60, None, 25.0, 20.0, UnidadMedida.KILOGRAMOS),
    ("Dulce de Leche Repostero", "DDL-2409", 10, 90, 50.0, 30.0, UnidadMedida.KILOGRAMOS),
    ("Chocolate Cobertura Semiamargo", "CHO-2408", 20, 180, 20.0, 12.0, UnidadMedida.KILOGRAMOS),
    ("Aceite de Girasol", "ACE-2408", 25, 200, 30.0, 18.0, UnidadMedida.LITROS),
    ("Esencia de Vainilla", "VAI-2407", 45, 300, 2000.0, 1200.0, UnidadMedida.MILILITROS),
    ("Polvo de Hornear", "PHO-2408", 20, 240, 5000.0, 3500.0, UnidadMedida.GRAMOS),
    ("Membrillo", "MEM-2409", 8, 120, 30.0, 21.0, UnidadMedida.KILOGRAMOS),
    ("Jamon Cocido", "JAM-2410", 10, -1, 10.0, 3.5, UnidadMedida.KILOGRAMOS),
    ("Queso de Maquina", "QMA-2410", 5, 8, 12.0, 2.0, UnidadMedida.KILOGRAMOS),
    ("Cacao Amargo en Polvo", "CAC-2408", 25, 270, 10.0, 7.5, UnidadMedida.KILOGRAMOS),
    ("Nueces Mariposa", "NUE-2408", 20, 150, 8.0, 1.2, UnidadMedida.KILOGRAMOS),
    ("Pasas de Uva", "PAS-2408", 18, 180, 10.0, 6.0, UnidadMedida.KILOGRAMOS),
    ("Coco Rallado", "COC-2408", 22, 160, 6.0, 4.0, UnidadMedida.KILOGRAMOS),
    ("Almidon de Maiz", "ALM-2407", 40, 330, 20.0, 15.0, UnidadMedida.KILOGRAMOS),
    ("Mermelada de Frutilla", "MER-2409", 9, 120, 15.0, 9.0, UnidadMedida.KILOGRAMOS),
    ("Miel Pura", "MIE-2407", 35, 365, 12.0, 10.0, UnidadMedida.KILOGRAMOS),
]

INSUMOS_QUIMICOS = [
    ("Lavandina Concentrada 55g", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.LITROS, 80.0, "Clorox Profesional"),
    ("Detergente Neutro Espumante", TipoQuimicoEnum.DETERGENTE, UnidadQuimico.LITROS, 50.0, "Spartan Chemical"),
    ("Amonio Cuaternario 5ta Generacion", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.LITROS, 40.0, "Ecolab"),
    ("Desengrasante Alcalino Pesado", TipoQuimicoEnum.DESENGRASANTE, UnidadQuimico.LITROS, 30.0, "Diversey"),
    ("Sanitizante Clorado Liquido", TipoQuimicoEnum.SANITIZANTE, UnidadQuimico.LITROS, 25.0, "Ecolab"),

    ("Alcohol Isopropilico 70 Spray", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.MILILITROS, 5000.0, "Química del Sur"),
    ("Limpiavidrios Antiestatico", TipoQuimicoEnum.OTRO, UnidadQuimico.MILILITROS, 3500.0, "Spartan Chemical"),
    ("Jabon Antibacterial Clorhexidina", TipoQuimicoEnum.OTRO, UnidadQuimico.MILILITROS, 4000.0, "Diversey"),
    ("Desinfectante Concentrado Peracetico", TipoQuimicoEnum.SANITIZANTE, UnidadQuimico.MILILITROS, 2000.0, "Ecolab"),

    ("Soda Caustica en Escamas", TipoQuimicoEnum.DESENGRASANTE, UnidadQuimico.KILOGRAMOS, 40.0, "Química Industrial"),
    ("Detergente en Polvo Enzimatico", TipoQuimicoEnum.DETERGENTE, UnidadQuimico.KILOGRAMOS, 35.0, "Spartan Chemical"),
    ("Hipoclorito de Calcio Granulado", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.KILOGRAMOS, 20.0, "Clorox Profesional"),

    ("Pastillas Efervescentes Cloradas", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.GRAMOS, 1500.0, "Química del Sur"),
    ("Polvo Abrasivo Sanitizante", TipoQuimicoEnum.SANITIZANTE, UnidadQuimico.GRAMOS, 2500.0, "Diversey"),

    ("Toallitas Desinfectantes con Alcohol", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.UNIDADES, 60.0, "Química del Sur"),
    ("Pastillas Sanitizantes de Cisterna", TipoQuimicoEnum.SANITIZANTE, UnidadQuimico.UNIDADES, 50.0, "Ecolab"),
    ("Bloque Desincrustante Quimico", TipoQuimicoEnum.OTRO, UnidadQuimico.UNIDADES, 24.0, "Spartan Chemical"),
]

def generar_pdf_valido(titulo: str, subtitulo: str = "") -> bytes:
    stream_content = (
        f"BT\n/F1 18 Tf\n50 720 Td\n({titulo}) Tj\n"
        f"/F1 12 Tf\n0 -30 Td\n({subtitulo}) Tj\nET\n"
    ).encode("latin-1")
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

def resetear_base() -> None:
    root_dir = Path(__file__).resolve().parent.parent.parent
    backend_dir = Path(__file__).resolve().parent.parent
    all_dbs = [
        root_dir / "app.db",
        backend_dir / "app.db",
        root_dir / "db.sqlite3",
        backend_dir / "db.sqlite3",
    ]
    for db_path in all_dbs:
        if db_path.is_file():
            backup = db_path.with_name(f"{db_path.name}.bak-{datetime.now():%Y%m%d-%H%M%S}")
            shutil.copy2(db_path, backup)
            print(f"Backup de {db_path.name} en: {backup}")
    ModeloBase.metadata.drop_all(bind=engine)

def sincronizar_archivos_db() -> None:
    root_dir = Path(__file__).resolve().parent.parent.parent
    backend_dir = Path(__file__).resolve().parent.parent
    all_dbs = [
        (root_dir / "app.db").resolve(),
        (backend_dir / "app.db").resolve(),
        (root_dir / "db.sqlite3").resolve(),
        (backend_dir / "db.sqlite3").resolve(),
    ]

    db_actual = Path(engine.url.database or "").resolve()
    if db_actual.exists():
        for target in all_dbs:
            if target != db_actual:
                shutil.copy2(db_actual, target)
        print("Base de datos sincronizada hacia todas las ubicaciones (app.db y db.sqlite3 en root y backend).")

def main() -> None:
    if "--reset" in sys.argv:
        resetear_base()

    ModeloBase.metadata.create_all(bind=engine)
    asegurar_migraciones_esquema(engine)
    migrar_esquema(engine)
    db = SessionLocal()

    ya_hay_datos = db.query(Insumo).count() > 0
    if ya_hay_datos:
        print("La base ya tiene datos (hay insumos cargados). No hago nada para no duplicar.")
        print("Si querés regenerarla desde cero con todas las estadísticas, corré: python scripts/seed_dev_db.py --reset")
        db.close()
        sincronizar_archivos_db()
        return

    hoy = datetime.now()

    print("Creando personal...")
    juan = crear_personal(db, PersonalCreate(documento="30111222", nombre="Juan", apellido="Perez", email="juan.perez@ejemplo.com", capacidad="OPERAR", contrasenia="Clave1234"))
    ana = crear_personal(db, PersonalCreate(documento="30222333", nombre="Ana", apellido="Gomez", email="ana.gomez@ejemplo.com", capacidad="ADMINISTRAR", contrasenia="Clave1234"))
    marcos = crear_personal(db, PersonalCreate(documento="30333444", nombre="Marcos", apellido="Diaz", email="marcos.diaz@ejemplo.com", capacidad="AMBAS", contrasenia="Clave1234"))
    lucia = crear_personal(db, PersonalCreate(documento="30444555", nombre="Lucia", apellido="Fernandez", email="lucia.fernandez@ejemplo.com", capacidad="OPERAR", contrasenia="Clave1234"))
    sofia = crear_personal(db, PersonalCreate(documento="30555666", nombre="Sofia", apellido="Martinez", email="sofia.martinez@ejemplo.com", capacidad="OPERAR", contrasenia="Clave1234"))
    asegurar_usuarios_dev(db)

    print("Creando insumos (materias primas alimenticias)...")
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

    print("Creando catálogo de insumos químicos...")
    for item in INSUMOS_QUIMICOS:
        if len(item) == 5:
            nombre, tipo, unidad, stock, proveedor = item
        else:
            nombre, tipo, unidad, stock = item
            proveedor = None
        InsumoQuimicoService.create(db, InsumoQuimicoCreate(
            nombre=nombre, tipo=tipo, unidad_medida=unidad, stock_actual=stock, proveedor=proveedor
        ))

    print("Creando sectores...")
    s_salon = crear_sector(db, SectorCreate(nombre="Salon Principal"))
    s_deposito = crear_sector(db, SectorCreate(nombre="Deposito"))
    s_cuadra = crear_sector(db, SectorCreate(nombre="Cuadra"))
    s_pasteleria = crear_sector(db, SectorCreate(nombre="Pasteleria"))
    s_bacha = crear_sector(db, SectorCreate(nombre="Bacha"))
    s_cocina = crear_sector(db, SectorCreate(nombre="Cocina"))

    print("Creando equipos...")
    heladera = crear_equipo(db, EquipoCreate(nombre="Heladera Exhibidora", categoria=Categoria.CONSERVAMIENTO, sector_id=s_salon.id, estado=Estado.ACTIVO, plan_de_calibracion="Semestral"))
    freezer = crear_equipo(db, EquipoCreate(nombre="Freezer Deposito", categoria=Categoria.CONSERVAMIENTO, sector_id=s_deposito.id, estado=Estado.ACTIVO, plan_de_calibracion="Semestral"))
    camara = crear_equipo(db, EquipoCreate(nombre="Camara Frigorifica", categoria=Categoria.CONSERVAMIENTO, sector_id=s_deposito.id, estado=Estado.ACTIVO, plan_de_calibracion="Trimestral"))
    amasadora = crear_equipo(db, EquipoCreate(nombre="Amasadora Industrial", categoria=Categoria.MANTENIMIENTO, sector_id=s_cuadra.id, estado=Estado.ACTIVO, plan_de_calibracion="Anual"))
    horno = crear_equipo(db, EquipoCreate(nombre="Horno Convector", categoria=Categoria.MANTENIMIENTO, sector_id=s_cuadra.id, estado=Estado.ACTIVO, plan_de_calibracion="Semestral"))
    crear_equipo(db, EquipoCreate(nombre="Batidora Planetaria", categoria=Categoria.MANTENIMIENTO, sector_id=s_pasteleria.id, estado=Estado.ACTIVO, plan_de_calibracion="Anual"))
    crear_equipo(db, EquipoCreate(nombre="Sobadora", categoria=Categoria.MANTENIMIENTO, sector_id=s_cuadra.id, estado=Estado.ACTIVO, plan_de_calibracion="Anual"))
    crear_equipo(db, EquipoCreate(nombre="Termometro Pinche", categoria=Categoria.MANTENIMIENTO, sector_id=s_pasteleria.id, estado=Estado.ACTIVO, plan_de_calibracion="Mensual"))
    crear_equipo(db, EquipoCreate(nombre="Lavavajillas", categoria=Categoria.SANAMIENTO, sector_id=s_bacha.id, estado=Estado.ACTIVO, plan_de_calibracion="Anual"))
    crear_equipo(db, EquipoCreate(nombre="Freidora Electrica", categoria=Categoria.MANTENIMIENTO, sector_id=s_cocina.id, estado=Estado.INACTIVO, plan_de_calibracion="Anual"))

    print("Creando elementos de limpieza...")
    el1 = crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Trapo de Piso Bacha", frecuenciaDeCambio=1))
    el2 = crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Esponja de Fibra Verde", frecuenciaDeCambio=7))
    el3 = crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Repasador Cuadra", frecuenciaDeCambio=3))
    el4 = crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Cepillo de Mesada", frecuenciaDeCambio=60))
    el5 = crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Escobillon Salon", frecuenciaDeCambio=30))
    el6 = crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Guantes de Nitrilo", frecuenciaDeCambio=None))

    el1.fechaCambio = hoy - timedelta(days=2)
    el2.fechaCambio = hoy - timedelta(days=1)
    el3.fechaCambio = hoy + timedelta(days=1)
    el4.fechaCambio = hoy + timedelta(days=2)
    el5.fechaCambio = hoy + timedelta(days=20)
    el6.fechaCambio = None
    db.commit()

    print("Creando planes de limpieza y tareas...")
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
            personal_id=juan.legajo,
        ),
    )
    t_horno_semanal = crear_tarea(
        db,
        TareaCreate(
            nombre="Desengrase Intensivo de Camara",
            descripcion="Paso 1. Aplicar Desengrasante Alcalino Pesado y Soda Caustica en Escamas diluida. Paso 2. Fregar paredes y enjuagar.",
            frecuencia=Frecuencia.SEMANAL,
            plan_id=plan_horno.id,
            personal_id=juan.legajo,
        ),
    )

    op_dev = db.query(Personal).filter(Personal.usuario == "operador").first()
    adminop_dev = db.query(Personal).filter(Personal.usuario == "adminopp").first()

    if op_dev:
        crear_tarea(
            db,
            TareaCreate(
                nombre="Sanitizacion Diaria de Bandejas y Rejillas",
                descripcion="Paso 1. Pulverizar Alcohol Isopropilico 70 Spray. Paso 2. Secar con toallitas desinfectantes descartables.",
                frecuencia=Frecuencia.DIARIA,
                plan_id=plan_heladera.id,
                personal_id=op_dev.legajo,
            ),
        )
        crear_tarea(
            db,
            TareaCreate(
                nombre="Control Semanal de Condensador y Filtros",
                descripcion="Paso 1. Cepillar rejilla trasera y aspirar polvo acumulado.",
                frecuencia=Frecuencia.SEMANAL,
                plan_id=plan_heladera.id,
                personal_id=op_dev.legajo,
            ),
        )
        crear_tarea(
            db,
            TareaCreate(
                nombre="Desinfeccion Diaria de Manijas y Burletes",
                descripcion="Paso 1. Limpiar manija exterior con Toallitas Desinfectantes con Alcohol. Paso 2. Dejar secar al aire.",
                frecuencia=Frecuencia.DIARIA,
                plan_id=plan_freezer.id,
                personal_id=op_dev.legajo,
            ),
        )

    if adminop_dev:
        crear_tarea(
            db,
            TareaCreate(
                nombre="Limpieza Diaria de Tolva y Protector",
                descripcion="Paso 1. Desconectar y retirar restos secos de harina. Paso 2. Pulverizar sanitizante neutro.",
                frecuencia=Frecuencia.DIARIA,
                plan_id=plan_amasadora.id,
                personal_id=adminop_dev.legajo,
            ),
        )
        crear_tarea(
            db,
            TareaCreate(
                nombre="Sanitizacion Diaria de Puerta y Cristales",
                descripcion="Paso 1. Pulverizar Limpiavidrios Antiestatico. Paso 2. Repasar con papel tissue.",
                frecuencia=Frecuencia.DIARIA,
                plan_id=plan_horno.id,
                personal_id=adminop_dev.legajo,
            ),
        )
    db.commit()

    print("Generando historial de 75 días de checklists con insumos químicos variados...")
    responsables = [juan, ana, marcos, lucia, sofia]

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
            realizada = not (offset % 6 == 0 and j == len(items_del_dia) - 1)
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

    print("Generando checklist para hoy (con tareas completadas en L, ML y UN para probar el día en vivo)...")
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

    print("Creando documentos versionados con vencimientos...")
    pdf_poes = UploadFile(file=io.BytesIO(generar_pdf_valido("POES - Sanitizacion General", "Procedimiento Operativo Estandarizado de Saneamiento")), filename="poes_general.pdf")
    crear_documento(
        db,
        titulo="POES - Procedimiento Operativo Estandarizado de Saneamiento",
        tipo=TipoDocumento.PROCEDIMIENTO,
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
        tipo=TipoDocumento.PROCEDIMIENTO,
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
        tipo=TipoDocumento.MANUAL_BPM,
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
    crear_documento(
        db,
        titulo="Receta Estandar: Medialunas de Manteca",
        tipo=TipoDocumento.RECETA,
        version="1.0",
        file=pdf_receta,
        descripcion="Formulacion oficial para panificados",
        fecha_vigencia=hoy.date() - timedelta(days=30),
        fecha_vencimiento=hoy.date() + timedelta(days=335),
        responsable_legajo=marcos.legajo,
    )

    print("Creando planes de calibracion y calibraciones realizadas...")
    from src.plan_de_calibracion.models import Plan_de_Calibracion
    from src.calibracion_realizada.models import Calibracion_Realizada

    carpeta_calibraciones = Path("uploads") / "certificados"
    carpeta_calibraciones.mkdir(parents=True, exist_ok=True)

    planes_cal = [
        ("Heladera Exhibidora", 180, 210),
        ("Horno Convector", 180, 195),
        ("Freezer Deposito", 180, 172),
        ("Termometro Pinche", 30, 26),
        ("Camara Frigorifica", 90, 20),
        ("Amasadora Industrial", 365, 90),
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
            formato_archivo=str(carpeta_calibraciones / nombre_archivo).replace("\\", "/"),
            plan_calibracion_id=plan_cal.id,
        ))
    db.commit()

    print("Creando incidentes (críticos, medios, recientes y resueltos)...")
    from src.incidentes.models import Incidente
    from src.incidentes.constants import EstadoIncidente

    incidentes = [
        ("Se detecto una perdida de agua debajo de la bacha del sector de lavado.", EstadoIncidente.PENDIENTE, 0.25, juan, None, None, None),
        ("El cable de conexion de la batidora planetaria presenta desgaste exterior.", EstadoIncidente.PENDIENTE, 0.5, sofia, None, None, None),

        ("La heladera exhibidora marca 9 grados, por encima del limite permitido.", EstadoIncidente.PENDIENTE, 2.0, lucia, None, None, None),
        ("Desvio en la medicion de humedad en camara de fermentacion de cuadra.", EstadoIncidente.EN_REVISION, 1.5, marcos, None, None, None),

        ("Se encontro un envase de crema de leche abierto y sin rotular en la camara.", EstadoIncidente.EN_REVISION, 4.0, sofia, None, None, None),
        ("Cerradura del deposito secundario de quimicos trabada y sin llave de repuesto.", EstadoIncidente.PENDIENTE, 5.0, juan, None, None, None),
        ("El termometro digital de la camara frigorifica no enciende ni registra.", EstadoIncidente.REABIERTO, 6.0, lucia, None, None, "El reemplazo temporal volvio a apagarse repentinamente."),

        ("Falta de jabon antibacterial en el lavamanos de la cocina.", EstadoIncidente.CERRADO, 9.0, marcos, ana, "Se repuso el jabon antibacterial y se agrego control al checklist diario.", None),
        ("Presencia de insectos cerca de la puerta del deposito.", EstadoIncidente.CERRADO, 15.0, juan, ana, "Se contrato fumigacion y se coloco cortina de aire en la puerta.", None),
        ("Un empleado ingreso a produccion sin cofia.", EstadoIncidente.DESCARTADO, 20.0, sofia, ana, "Se realizo apercibimiento y capacitacion verbal sobre BPM.", None),
        ("Envase de desengrasante con rotulo secundario semiborrado.", EstadoIncidente.CERRADO, 25.0, marcos, ana, "Se reimprimio y coloco etiqueta normalizada segun norma SGA.", None),
    ]

    for desc, estado, dias, reporta, resuelve, accion, motivo in incidentes:
        creado = hoy - timedelta(days=dias)
        cerrado = creado + timedelta(days=1) if estado in (EstadoIncidente.CERRADO, EstadoIncidente.DESCARTADO) else None
        db.add(Incidente(
            descripcion=desc,
            estado=estado,
            creado_el=creado,
            reportado_por_id=reporta.legajo,
            accion_correctiva=accion,
            cerrado_el=cerrado,
            resuelto_por_id=resuelve.legajo if resuelve else None,
            motivo_reapertura=motivo,
        ))
    db.commit()

    print("Creando tipos de certificado y certificados del personal...")
    from src.tipoCertificado.services import crear_tipo_certificado
    from src.certificado.services import crear_certificado

    t_manip = crear_tipo_certificado(db, "Carnet de Manipulacion de Alimentos")
    t_libreta = crear_tipo_certificado(db, "Libreta Sanitaria")
    t_curso = crear_tipo_certificado(db, "Curso de BPM")
    t_hs = crear_tipo_certificado(db, "Capacitacion en Higiene y Seguridad")

    def pdf_certificado(titulo: str, persona) -> UploadFile:
        contenido = generar_pdf_valido(titulo, f"{persona.nombre} {persona.apellido} - Legajo {persona.legajo}")
        return UploadFile(file=io.BytesIO(contenido), filename=f"{titulo.lower().replace(' ', '_')}.pdf")

    certificados = [
        (marcos, t_manip, -12, True),
        (sofia, t_hs, -25, True),
        (juan, t_libreta, 8, False),
        (lucia, t_libreta, 4, True),
        (juan, t_manip, 180, True),
        (ana, t_manip, 270, True),
        (ana, t_curso, 90, True),
        (marcos, t_hs, 45, False),
        (lucia, t_curso, 350, True),
        (sofia, t_manip, 30, False),
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

    db.close()
    sincronizar_archivos_db()

    print("\n=======================================================")
    print("Base de datos poblada exitosamente para todas las estadísticas:")
    print("  - Vencimientos de Personal: 2 vencidos, 2 próximos, 6 vigentes")
    print("  - Calibraciones de Equipos: 2 vencidos, 2 próximos, 2 vigentes")
    print("  - Recambio de Elementos: 2 vencidos, 2 próximos, 1 vigente, 1 sin vencimiento")
    print("  - Vencimiento de Documentos: 1 vencido (POES), 1 próximo (MIP), 2 vigentes (BPM v2, Receta)")
    print("  - Insumos Alimenticios: 2 vencidos (Crema, Jamón), 4 próximos, 20 vigentes")
    print("  - Incidentes: 3 críticos (+72h), 2 urgencia media (24-72h), 2 recientes (<24h), 1 reabierto, 4 resueltos")
    print("  - Consumo Insumos Químicos: 75 días históricos en L, ML, KG, G, UN con variación calculada (+8%)")
    print("  - Cumplimiento de Limpieza: ~85% en semana y mes, y tareas completadas hoy en L, ML y UN")
    print("=======================================================\n")

if __name__ == "__main__":
    main()
