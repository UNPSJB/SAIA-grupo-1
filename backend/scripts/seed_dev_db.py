"""
Alimenta la base local (db.sqlite3, la que usa `fastapi dev` / `uvicorn`) con datos
de ejemplo para poder navegar y probar la app a mano.

No toca la base de tests (esa la maneja tests/database.py con su propia base en
memoria) ni pisa datos: si ya existe algo, se frena para no duplicar.

Uso (parado en backend/, con el venv activado):
    python scripts/seed_dev_db.py
"""
import json
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


def main() -> None:
    ModeloBase.metadata.create_all(bind=engine)
    db = SessionLocal()

    ya_hay_datos = db.query(Insumo).count() > 0
    if ya_hay_datos:
        print("La base ya tiene datos (hay insumos cargados). No hago nada para no duplicar.")
        print("Si querés volver a alimentarla desde cero, borrá backend/db.sqlite3 y corré este script de nuevo.")
        db.close()
        return

    hoy = datetime.now()

    print("Creando personal...")
    juan = crear_personal(db, PersonalCreate(documento="30111222", nombre="Juan", apellido="Perez", email="juan.perez@ejemplo.com", capacidad="OPERAR"))
    ana = crear_personal(db, PersonalCreate(documento="30222333", nombre="Ana", apellido="Gomez", email="ana.gomez@ejemplo.com", capacidad="ADMINISTRAR"))
    marcos = crear_personal(db, PersonalCreate(documento="30333444", nombre="Marcos", apellido="Diaz", email="marcos.diaz@ejemplo.com", capacidad="AMBAS"))
    crear_personal(db, PersonalCreate(documento="30444555", nombre="Lucia", apellido="Fernandez", email="lucia.fernandez@ejemplo.com", capacidad="OPERAR"))

    print("Creando insumos (ingredientes)...")
    crear_insumo(db, InsumoCreate(
        nombre="Harina de Trigo 000", lote="ING-HAR-001",
        fechaRecepcion=hoy - timedelta(days=5), fechaVencimiento=hoy + timedelta(days=120),
        cantRecibida=100.0, stock=80.0, medida=UnidadMedida.KILOGRAMOS,
    ))
    crear_insumo(db, InsumoCreate(
        nombre="Aceite de Girasol", lote="ING-ACE-002",
        fechaRecepcion=hoy - timedelta(days=10), fechaVencimiento=hoy + timedelta(days=180),
        cantRecibida=50.0, stock=30.0, medida=UnidadMedida.LITROS,
    ))
    crear_insumo(db, InsumoCreate(
        nombre="Levadura Fresca", lote="ING-LEV-003",
        fechaRecepcion=hoy - timedelta(days=2), fechaVencimiento=hoy + timedelta(days=25),
        cantRecibida=5000.0, stock=3500.0, medida=UnidadMedida.GRAMOS,
    ))
    crear_insumo(db, InsumoCreate(
        nombre="Carne Vacuna (Lomo)", lote="ING-CAR-004",
        fechaRecepcion=hoy - timedelta(days=3), fechaVencimiento=hoy + timedelta(days=15),
        cantRecibida=40.0, stock=25.0, medida=UnidadMedida.KILOGRAMOS,
    ))
    crear_insumo(db, InsumoCreate(
        nombre="Sal Fina", lote="ING-SAL-005",
        fechaRecepcion=hoy - timedelta(days=20), fechaVencimiento=hoy + timedelta(days=365),
        cantRecibida=30.0, stock=20.0, medida=UnidadMedida.KILOGRAMOS,
    ))
    crear_insumo(db, InsumoCreate(
        nombre="Huevos Frescos", lote="ING-HUE-006",
        fechaRecepcion=hoy - timedelta(days=1), fechaVencimiento=hoy + timedelta(days=20),
        cantRecibida=360.0, stock=240.0, medida=UnidadMedida.UNIDADES,
    ))

    print("Creando insumos quimicos...")
    InsumoQuimicoService.create(db, InsumoQuimicoCreate(nombre="Lavandina Comercial 55g/l", tipo=TipoQuimicoEnum.DESINFECTANTE, unidad_medida=UnidadQuimico.LITROS, stock_actual=80.0))
    InsumoQuimicoService.create(db, InsumoQuimicoCreate(nombre="Detergente Neutro", tipo=TipoQuimicoEnum.DESENGRASANTE, unidad_medida=UnidadQuimico.LITROS, stock_actual=30.0))
    InsumoQuimicoService.create(db, InsumoQuimicoCreate(nombre="Amonio Cuaternario", tipo=TipoQuimicoEnum.DESINFECTANTE, unidad_medida=UnidadQuimico.LITROS, stock_actual=40.0))
    InsumoQuimicoService.create(db, InsumoQuimicoCreate(nombre="Desengrasante Industrial", tipo=TipoQuimicoEnum.DESENGRASANTE, unidad_medida=UnidadQuimico.LITROS, stock_actual=25.0))
    InsumoQuimicoService.create(db, InsumoQuimicoCreate(nombre="Sanitizante Multiuso", tipo=TipoQuimicoEnum.SANITIZANTE, unidad_medida=UnidadQuimico.LITROS, stock_actual=15.0))

    print("Creando equipos...")
    heladera = crear_equipo(db, EquipoCreate(nombre="Heladera Exhibidora", categoria=Categoria.CONSERVAMIENTO, ubicacion="Salon Principal", estado=Estado.ACTIVO, plan_de_calibracion="Semestral"))
    freezer = crear_equipo(db, EquipoCreate(nombre="Freezer Deposito", categoria=Categoria.CONSERVAMIENTO, ubicacion="Deposito", estado=Estado.ACTIVO, plan_de_calibracion="Semestral"))
    crear_equipo(db, EquipoCreate(nombre="Amasadora Industrial", categoria=Categoria.MANTENIMIENTO, ubicacion="Cocina", estado=Estado.ACTIVO, plan_de_calibracion="Anual"))

    print("Creando elementos de limpieza...")
    crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Trapo de Piso", frecuenciaDeCambio=1))
    crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Escobillon", frecuenciaDeCambio=30))
    crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Repasador", frecuenciaDeCambio=3))
    crear_elementoDeLimpieza(db, ElementoDeLimpiezaCreate(nombre="Guantes Limpieza", frecuenciaDeCambio=None))

    print("Creando planes de limpieza y tareas...")
    fecha_inicio_planes = hoy.date() - timedelta(days=21)
    plan_heladera = crear_plan(db, PlanDeLimpiezaCreate(nombre="Plan Heladera", fecha_inicio=fecha_inicio_planes, equipo_id=heladera.id))
    plan_freezer = crear_plan(db, PlanDeLimpiezaCreate(nombre="Plan Freezer", fecha_inicio=fecha_inicio_planes, equipo_id=freezer.id))

    crear_tarea(db, TareaCreate(nombre="Desinfeccion Diaria", descripcion="Desinfectar superficies con alcohol", frecuencia=Frecuencia.DIARIA, plan_id=plan_heladera.id))
    crear_tarea(db, TareaCreate(nombre="Descongelado Semanal", descripcion="Descongelar y limpiar bandejas", frecuencia=Frecuencia.SEMANAL, plan_id=plan_heladera.id))
    crear_tarea(db, TareaCreate(nombre="Limpieza Diaria", descripcion="Limpiar exterior e interior del freezer", frecuencia=Frecuencia.DIARIA, plan_id=plan_freezer.id))
    crear_tarea(db, TareaCreate(nombre="Revision Mensual", descripcion="Revisar burletes y temperatura", frecuencia=Frecuencia.MENSUAL, plan_id=plan_freezer.id))

    db.commit()

    print("Generando historial de checklists completados (dias anteriores)...")
    insumos_rotativos = [
        ("Lavandina Comercial 55g/l", "L"),
        ("Detergente Neutro", "L"),
        ("Amonio Cuaternario", "L"),
    ]
    for i, offset in enumerate(range(5, 0, -1)):
        fecha = hoy.date() - timedelta(days=offset)
        checklist = Checklist(fecha=fecha, responsable_legajo=juan.legajo if i % 2 == 0 else ana.legajo, activo=True)
        for plan, tarea_nombre, tarea_desc, frecuencia in (
            (plan_heladera, "Desinfeccion Diaria", "Desinfectar superficies con alcohol", Frecuencia.DIARIA),
            (plan_freezer, "Limpieza Diaria", "Limpiar exterior e interior del freezer", Frecuencia.DIARIA),
        ):
            nombre_insumo, unidad_insumo = insumos_rotativos[i % len(insumos_rotativos)]
            item = ChecklistItem(
                plan_id=plan.id,
                nombre_plan=plan.nombre,
                tarea_id=None,
                nombre_tarea=tarea_nombre,
                descripcion_tarea=tarea_desc,
                frecuencia=frecuencia,
                estado=EstadoTareaItem.REALIZADO,
                responsable_legajo=checklist.responsable_legajo,
                insumos_utilizados=json.dumps(
                    [{"nombre": nombre_insumo, "cantidad": 1.5 + i, "unidad": unidad_insumo}],
                    ensure_ascii=False,
                ),
                fecha_hora_fin=datetime.combine(fecha, datetime.min.time()) + timedelta(hours=10),
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
    print("  - 4 personas, 4 insumos, 3 insumos quimicos, 3 equipos, 4 elementos de limpieza")
    print("  - 2 planes de limpieza con 2 tareas cada uno")
    print("  - 5 checklists de dias anteriores ya completados (para probar el historial)")
    print(f"  - 1 checklist de hoy (checklist #{id_checklist_hoy}), parcialmente completado (para probarlo en vivo)")


if __name__ == "__main__":
    main()
