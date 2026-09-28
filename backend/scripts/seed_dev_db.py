"""
Alimenta la base local (db.sqlite3, la que usa `fastapi dev` / `uvicorn`) con datos
de ejemplo para poder navegar y probar la app a mano.

Los insumos son materias primas alimenticias (harina, manteca, huevos, etc.).
Los productos de limpieza (lavandina, detergente, etc.) van como insumos quimicos.

No toca la base de tests (esa la maneja tests/database.py con su propia base en
memoria) ni pisa datos: si ya existe algo, se frena para no duplicar.

Uso (parado en backend/, con el venv activado):
    python scripts/seed_dev_db.py            # alimenta la base si esta vacia
    python scripts/seed_dev_db.py --reset    # hace backup de la base actual y la regenera desde cero
"""
import json
import shutil
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.database import SessionLocal, engine
from src.models import ModeloBase

from src.personal.services import crear_personal
from src.personal.schemas import PersonalCreate

from src.insumos.services import crear_insumo
from src.insumos.schemas import InsumoCreate
from src.insumos.models import UnidadMedida, Insumo

from src.insumos_quimicos.services import InsumoQuimicoService
from src.insumos_quimicos.schemas import InsumoQuimicoCreate
from src.insumos_quimicos.constants import TipoQuimicoEnum, UnidadMedidaEnum as UnidadQuimico

from src.equipos.services import crear_equipo
from src.equipos.schemas import EquipoCreate
from src.equipos.models import Categoria, Estado

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


# (nombre, lote, dias desde recepcion, dias hasta vencimiento o None, cantidad recibida, stock, medida)
INSUMOS = [
    ("Harina 000", "HAR3-2409", 12, 150, 250.0, 180.0, UnidadMedida.KILOGRAMOS),
    ("Harina 0000", "HAR4-2409", 12, 140, 100.0, 60.0, UnidadMedida.KILOGRAMOS),
    ("Manteca", "MAN-2409", 6, 25, 40.0, 22.0, UnidadMedida.KILOGRAMOS),
    ("Azucar Comun", "AZC-2408", 30, 365, 100.0, 75.0, UnidadMedida.KILOGRAMOS),
    ("Azucar Impalpable", "AZI-2408", 30, 300, 25.0, 14.0, UnidadMedida.KILOGRAMOS),
    ("Huevos", "HUE-2409", 4, 18, 360.0, 210.0, UnidadMedida.UNIDADES),
    ("Leche Entera", "LEC-2409", 3, 9, 60.0, 34.0, UnidadMedida.LITROS),
    ("Crema de Leche", "CRE-2409", 5, 12, 20.0, 8.0, UnidadMedida.LITROS),
    ("Queso Crema", "QCR-2409", 5, 11, 20.0, 6.0, UnidadMedida.KILOGRAMOS),
    ("Levadura Fresca", "LEV-2409", 2, 10, 5.0, 2.5, UnidadMedida.KILOGRAMOS),
    ("Sal Fina", "SAL-2407", 60, None, 25.0, 20.0, UnidadMedida.KILOGRAMOS),
    ("Dulce de Leche Repostero", "DDL-2409", 10, 90, 50.0, 30.0, UnidadMedida.KILOGRAMOS),
    ("Chocolate Cobertura Semiamargo", "CHO-2408", 20, 180, 20.0, 12.0, UnidadMedida.KILOGRAMOS),
    ("Aceite de Girasol", "ACE-2408", 25, 200, 30.0, 18.0, UnidadMedida.LITROS),
    ("Esencia de Vainilla", "VAI-2407", 45, 300, 2000.0, 1200.0, UnidadMedida.MILILITROS),
    ("Polvo de Hornear", "PHO-2408", 20, 240, 5000.0, 3500.0, UnidadMedida.GRAMOS),
    ("Membrillo", "MEM-2409", 8, 120, 30.0, 21.0, UnidadMedida.KILOGRAMOS),
]

# (nombre, tipo, unidad, stock)
INSUMOS_QUIMICOS = [
    ("Lavandina Comercial 55g/l", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.LITROS, 80.0),
    ("Detergente Neutro", TipoQuimicoEnum.DETERGENTE, UnidadQuimico.LITROS, 30.0),
    ("Amonio Cuaternario", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.LITROS, 40.0),
    ("Desengrasante Industrial", TipoQuimicoEnum.DESENGRASANTE, UnidadQuimico.LITROS, 25.0),
    ("Sanitizante Multiuso", TipoQuimicoEnum.SANITIZANTE, UnidadQuimico.LITROS, 15.0),
    ("Alcohol al 70%", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.LITROS, 20.0),
    ("Jabon Liquido de Manos", TipoQuimicoEnum.OTRO, UnidadQuimico.LITROS, 12.0),
]


def resetear_base() -> None:
    db_path = Path(engine.url.database or "")
    if db_path.is_file():
        backup = db_path.with_name(f"{db_path.name}.bak-{datetime.now():%Y%m%d-%H%M%S}")
        shutil.copy2(db_path, backup)
        print(f"Backup de la base anterior en: {backup}")
    ModeloBase.metadata.drop_all(bind=engine)


def main() -> None:
    if "--reset" in sys.argv:
        resetear_base()

    ModeloBase.metadata.create_all(bind=engine)
    db = SessionLocal()

    ya_hay_datos = db.query(Insumo).count() > 0
    if ya_hay_datos:
        print("La base ya tiene datos (hay insumos cargados). No hago nada para no duplicar.")
        print("Si querés regenerarla desde cero, corré: python scripts/seed_dev_db.py --reset")
        db.close()
        return

    hoy = datetime.now()

    print("Creando personal...")
    juan = crear_personal(db, PersonalCreate(documento="30111222", nombre="Juan", apellido="Perez", email="juan.perez@ejemplo.com", capacidad="OPERAR"))
    ana = crear_personal(db, PersonalCreate(documento="30222333", nombre="Ana", apellido="Gomez", email="ana.gomez@ejemplo.com", capacidad="ADMINISTRAR"))
    marcos = crear_personal(db, PersonalCreate(documento="30333444", nombre="Marcos", apellido="Diaz", email="marcos.diaz@ejemplo.com", capacidad="AMBAS"))
    crear_personal(db, PersonalCreate(documento="30444555", nombre="Lucia", apellido="Fernandez", email="lucia.fernandez@ejemplo.com", capacidad="OPERAR"))
    crear_personal(db, PersonalCreate(documento="30555666", nombre="Sofia", apellido="Martinez", email="sofia.martinez@ejemplo.com", capacidad="OPERAR"))

    print("Creando insumos (materias primas)...")
    for nombre, lote, dias_recepcion, dias_venc, cant, stock, medida in INSUMOS:
        crear_insumo(db, InsumoCreate(
            nombre=nombre, lote=lote,
            fechaRecepcion=hoy - timedelta(days=dias_recepcion),
            fechaVencimiento=hoy + timedelta(days=dias_venc) if dias_venc is not None else None,
            cantRecibida=cant, stock=stock, medida=medida,
        ))

    print("Creando insumos quimicos...")
    for nombre, tipo, unidad, stock in INSUMOS_QUIMICOS:
        InsumoQuimicoService.create(db, InsumoQuimicoCreate(nombre=nombre, tipo=tipo, unidad_medida=unidad, stock_actual=stock))

    print("Creando equipos...")
    heladera = crear_equipo(db, EquipoCreate(nombre="Heladera Exhibidora", categoria=Categoria.CONSERVAMIENTO, ubicacion="Salon Principal", estado=Estado.ACTIVO, plan_de_calibracion="Semestral"))
    freezer = crear_equipo(db, EquipoCreate(nombre="Freezer Deposito", categoria=Categoria.CONSERVAMIENTO, ubicacion="Deposito", estado=Estado.ACTIVO, plan_de_calibracion="Semestral"))
    camara = crear_equipo(db, EquipoCreate(nombre="Camara Frigorifica", categoria=Categoria.CONSERVAMIENTO, ubicacion="Deposito", estado=Estado.ACTIVO, plan_de_calibracion="Trimestral"))
    amasadora = crear_equipo(db, EquipoCreate(nombre="Amasadora Industrial", categoria=Categoria.MANTENIMIENTO, ubicacion="Cuadra", estado=Estado.ACTIVO, plan_de_calibracion="Anual"))
    horno = crear_equipo(db, EquipoCreate(nombre="Horno Convector", categoria=Categoria.MANTENIMIENTO, ubicacion="Cuadra", estado=Estado.ACTIVO, plan_de_calibracion="Semestral"))
    crear_equipo(db, EquipoCreate(nombre="Batidora Planetaria", categoria=Categoria.MANTENIMIENTO, ubicacion="Pasteleria", estado=Estado.ACTIVO, plan_de_calibracion="Anual"))
    crear_equipo(db, EquipoCreate(nombre="Sobadora", categoria=Categoria.MANTENIMIENTO, ubicacion="Cuadra", estado=Estado.ACTIVO, plan_de_calibracion="Anual"))
    crear_equipo(db, EquipoCreate(nombre="Termometro Pinche", categoria=Categoria.MANTENIMIENTO, ubicacion="Pasteleria", estado=Estado.ACTIVO, plan_de_calibracion="Mensual"))
    crear_equipo(db, EquipoCreate(nombre="Lavavajillas", categoria=Categoria.SANAMIENTO, ubicacion="Bacha", estado=Estado.ACTIVO, plan_de_calibracion="Anual"))
    crear_equipo(db, EquipoCreate(nombre="Freidora Electrica", categoria=Categoria.MANTENIMIENTO, ubicacion="Cocina", estado=Estado.INACTIVO, plan_de_calibracion="Anual"))

    print("Creando elementos de limpieza...")
    crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Trapo de Piso", frecuenciaDeCambio=1))
    crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Escobillon", frecuenciaDeCambio=30))
    crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Repasador", frecuenciaDeCambio=3))
    crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Esponja", frecuenciaDeCambio=7))
    crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Cepillo de Mesada", frecuenciaDeCambio=60))
    crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Guantes Limpieza", frecuenciaDeCambio=None))

    print("Creando planes de limpieza y tareas...")
    fecha_inicio_planes = hoy.date() - timedelta(days=21)
    plan_heladera = crear_plan(db, PlanDeLimpiezaCreate(nombre="Plan Heladera", fecha_inicio=fecha_inicio_planes, equipo_id=heladera.id))
    plan_freezer = crear_plan(db, PlanDeLimpiezaCreate(nombre="Plan Freezer", fecha_inicio=fecha_inicio_planes, equipo_id=freezer.id))
    plan_camara = crear_plan(db, PlanDeLimpiezaCreate(nombre="Plan Camara", fecha_inicio=fecha_inicio_planes, equipo_id=camara.id))
    plan_amasadora = crear_plan(db, PlanDeLimpiezaCreate(nombre="Plan Amasadora", fecha_inicio=fecha_inicio_planes, equipo_id=amasadora.id))
    plan_horno = crear_plan(db, PlanDeLimpiezaCreate(nombre="Plan Horno", fecha_inicio=fecha_inicio_planes, equipo_id=horno.id))

    crear_tarea(db, TareaCreate(nombre="Desinfeccion Diaria", descripcion="Desinfectar superficies con alcohol", frecuencia=Frecuencia.DIARIA, plan_id=plan_heladera.id))
    crear_tarea(db, TareaCreate(nombre="Descongelado Semanal", descripcion="Descongelar y limpiar bandejas", frecuencia=Frecuencia.SEMANAL, plan_id=plan_heladera.id))
    crear_tarea(db, TareaCreate(nombre="Limpieza Diaria", descripcion="Limpiar exterior e interior del freezer", frecuencia=Frecuencia.DIARIA, plan_id=plan_freezer.id))
    crear_tarea(db, TareaCreate(nombre="Revision Mensual", descripcion="Revisar burletes y temperatura", frecuencia=Frecuencia.MENSUAL, plan_id=plan_freezer.id))
    crear_tarea(db, TareaCreate(nombre="Limpieza de Pisos", descripcion="Barrer y trapear piso de la camara con lavandina", frecuencia=Frecuencia.DIARIA, plan_id=plan_camara.id))
    crear_tarea(db, TareaCreate(nombre="Limpieza Estantes", descripcion="Vaciar y desinfectar estantes con amonio cuaternario", frecuencia=Frecuencia.SEMANAL, plan_id=plan_camara.id))
    crear_tarea(db, TareaCreate(nombre="Limpieza de Batea", descripcion="Retirar restos de masa y sanitizar batea y gancho", frecuencia=Frecuencia.DIARIA, plan_id=plan_amasadora.id))
    crear_tarea(db, TareaCreate(nombre="Desengrase Interior", descripcion="Desengrasar paredes internas y bandejas del horno", frecuencia=Frecuencia.SEMANAL, plan_id=plan_horno.id))
    crear_tarea(db, TareaCreate(nombre="Limpieza de Burletes", descripcion="Limpiar burletes y vidrio de la puerta", frecuencia=Frecuencia.MENSUAL, plan_id=plan_horno.id))

    db.commit()

    print("Generando historial de checklists completados (dias anteriores)...")
    insumos_rotativos = [
        ("Lavandina Comercial 55g/l", "L"),
        ("Detergente Neutro", "L"),
        ("Amonio Cuaternario", "L"),
        ("Sanitizante Multiuso", "L"),
    ]
    tareas_diarias = (
        (plan_heladera, "Desinfeccion Diaria", "Desinfectar superficies con alcohol"),
        (plan_freezer, "Limpieza Diaria", "Limpiar exterior e interior del freezer"),
        (plan_camara, "Limpieza de Pisos", "Barrer y trapear piso de la camara con lavandina"),
        (plan_amasadora, "Limpieza de Batea", "Retirar restos de masa y sanitizar batea y gancho"),
    )
    responsables = [juan, ana, marcos]
    for i, offset in enumerate(range(10, 0, -1)):
        fecha = datetime.now().date() - timedelta(days=offset)
        responsable = responsables[i % len(responsables)]
        checklist = Checklist(fecha=fecha, responsable_legajo=responsable.legajo, activo=True)
        for j, (plan, tarea_nombre, tarea_desc) in enumerate(tareas_diarias):
            # algunos dias quedan tareas sin hacer para que el cumplimiento no sea siempre 100%
            realizada = not (i % 4 == 3 and j == len(tareas_diarias) - 1)
            nombre_insumo, unidad_insumo = insumos_rotativos[(i + j) % len(insumos_rotativos)]
            item = ChecklistItem(
                plan_id=plan.id,
                nombre_plan=plan.nombre,
                tarea_id=None,
                nombre_tarea=tarea_nombre,
                descripcion_tarea=tarea_desc,
                frecuencia=Frecuencia.DIARIA,
                estado=EstadoTareaItem.REALIZADO if realizada else EstadoTareaItem.PENDIENTE,
                responsable_legajo=responsable.legajo if realizada else None,
                insumos_utilizados=json.dumps(
                    [{"nombre": nombre_insumo, "cantidad": 0.5 + (i + j) % 3, "unidad": unidad_insumo}],
                    ensure_ascii=False,
                ) if realizada else None,
                fecha_hora_fin=datetime.combine(fecha, datetime.min.time()) + timedelta(hours=9, minutes=15 * j) if realizada else None,
            )
            checklist.items.append(item)
        db.add(checklist)
    db.commit()

    print("Generando el checklist de hoy (queda pendiente para que lo pruebes en la app)...")
    checklist_hoy = generar_checklist(db, ChecklistGenerar(responsable_legajo=marcos.legajo, fecha=date.today()))
    # completamos solo el primero, el resto queda pendiente para probar la UI
    completar_tarea(
        db,
        checklist_hoy.id,
        checklist_hoy.items[0].id,
        CompletarTareaSchema(
            responsable_legajo=marcos.legajo,
            insumos_utilizados=[InsumoUtilizadoPlaceholder(nombre="Amonio Cuaternario", cantidad=2.0, unidad="L")],
        ),
    )

    id_checklist_hoy = checklist_hoy.id
    db.close()
    print("\nListo. Base alimentada:")
    print(f"  - 5 personas, {len(INSUMOS)} insumos (alimentos), {len(INSUMOS_QUIMICOS)} insumos quimicos")
    print("  - 10 equipos (1 inactivo), 6 elementos de limpieza")
    print("  - 5 planes de limpieza con 9 tareas en total")
    print("  - 10 checklists de dias anteriores (para probar el historial y el dashboard)")
    print(f"  - 1 checklist de hoy (checklist #{id_checklist_hoy}), parcialmente completado (para probarlo en vivo)")


if __name__ == "__main__":
    main()
