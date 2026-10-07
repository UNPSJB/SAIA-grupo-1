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
    # Líquidos en Litros (L)
    ("Lavandina Concentrada 55g", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.LITROS, 80.0),
    ("Detergente Neutro Espumante", TipoQuimicoEnum.DETERGENTE, UnidadQuimico.LITROS, 50.0),
    ("Amonio Cuaternario 5ta Generacion", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.LITROS, 40.0),
    ("Desengrasante Alcalino Pesado", TipoQuimicoEnum.DESENGRASANTE, UnidadQuimico.LITROS, 30.0),
    ("Sanitizante Clorado Liquido", TipoQuimicoEnum.SANITIZANTE, UnidadQuimico.LITROS, 25.0),
    
    # Líquidos y Sprays en Mililitros (ML)
    ("Alcohol Isopropilico 70 Spray", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.MILILITROS, 5000.0),
    ("Limpiavidrios Antiestatico", TipoQuimicoEnum.OTRO, UnidadQuimico.MILILITROS, 3500.0),
    ("Jabon Antibacterial Clorhexidina", TipoQuimicoEnum.OTRO, UnidadQuimico.MILILITROS, 4000.0),
    ("Desinfectante Concentrado Peracetico", TipoQuimicoEnum.SANITIZANTE, UnidadQuimico.MILILITROS, 2000.0),
    
    # Sólidos y Polvos en Kilogramos (KG)
    ("Soda Caustica en Escamas", TipoQuimicoEnum.DESENGRASANTE, UnidadQuimico.KILOGRAMOS, 40.0),
    ("Detergente en Polvo Enzimatico", TipoQuimicoEnum.DETERGENTE, UnidadQuimico.KILOGRAMOS, 35.0),
    ("Hipoclorito de Calcio Granulado", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.KILOGRAMOS, 20.0),
    
    # Sólidos en Gramos (G)
    ("Pastillas Efervescentes Cloradas", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.GRAMOS, 1500.0),
    ("Polvo Abrasivo Sanitizante", TipoQuimicoEnum.SANITIZANTE, UnidadQuimico.GRAMOS, 2500.0),
    
    # Unidades y Paquetes (UN)
    ("Toallitas Desinfectantes con Alcohol", TipoQuimicoEnum.DESINFECTANTE, UnidadQuimico.UNIDADES, 60.0),
    ("Pastillas Sanitizantes de Cisterna", TipoQuimicoEnum.SANITIZANTE, UnidadQuimico.UNIDADES, 50.0),
    ("Bloque Desincrustante Quimico", TipoQuimicoEnum.OTRO, UnidadQuimico.UNIDADES, 24.0),
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
    juan = crear_personal(db, PersonalCreate(documento="30111222", nombre="Juan", apellido="Perez", email="juan.perez@ejemplo.com", capacidad="OPERAR", contrasenia="Clave1234"))
    ana = crear_personal(db, PersonalCreate(documento="30222333", nombre="Ana", apellido="Gomez", email="ana.gomez@ejemplo.com", capacidad="ADMINISTRAR", contrasenia="Clave1234"))
    marcos = crear_personal(db, PersonalCreate(documento="30333444", nombre="Marcos", apellido="Diaz", email="marcos.diaz@ejemplo.com", capacidad="AMBAS", contrasenia="Clave1234"))
    lucia = crear_personal(db, PersonalCreate(documento="30444555", nombre="Lucia", apellido="Fernandez", email="lucia.fernandez@ejemplo.com", capacidad="OPERAR", contrasenia="Clave1234"))
    sofia = crear_personal(db, PersonalCreate(documento="30555666", nombre="Sofia", apellido="Martinez", email="sofia.martinez@ejemplo.com", capacidad="OPERAR", contrasenia="Clave1234"))

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

    print("Creando planes de limpieza y tareas (con procedimientos paso a paso)...")
    fecha_inicio_planes = hoy.date() - timedelta(days=21)
    plan_heladera = crear_plan(db, PlanDeLimpiezaCreate(nombre="Plan Heladera", fecha_inicio=fecha_inicio_planes, equipo_id=heladera.id))
    plan_freezer = crear_plan(db, PlanDeLimpiezaCreate(nombre="Plan Freezer", fecha_inicio=fecha_inicio_planes, equipo_id=freezer.id))
    plan_camara = crear_plan(db, PlanDeLimpiezaCreate(nombre="Plan Camara", fecha_inicio=fecha_inicio_planes, equipo_id=camara.id))
    plan_amasadora = crear_plan(db, PlanDeLimpiezaCreate(nombre="Plan Amasadora", fecha_inicio=fecha_inicio_planes, equipo_id=amasadora.id))
    plan_horno = crear_plan(db, PlanDeLimpiezaCreate(nombre="Plan Horno", fecha_inicio=fecha_inicio_planes, equipo_id=horno.id))

    t_heladera_diaria = crear_tarea(
        db,
        TareaCreate(
            nombre="Desinfeccion de Superficies",
            descripcion="Paso 1. Retirar temporalmente alimentos del estante. Paso 2. Pulverizar Alcohol Isopropilico 70 Spray a 20 cm de distancia. Paso 3. Dejar actuar durante 5 minutos para eliminar carga microbiana. Paso 4. Secar con paño descartable y restablecer la mercaderia.",
            frecuencia=Frecuencia.DIARIA,
            plan_id=plan_heladera.id,
            responsable_legajo=juan.legajo,
        ),
    )
    t_heladera_semanal = crear_tarea(
        db,
        TareaCreate(
            nombre="Descongelado y Lavado Profundo",
            descripcion="Paso 1. Desconectar la unidad electrica. Paso 2. Trasladar productos a camara auxiliar. Paso 3. Retirar rejillas y lavar en bacha con Detergente Neutro Espumante diluido. Paso 4. Enjuagar con agua caliente a 60°. Paso 5. Aplicar Sanitizante Clorado Liquido en paredes y dejar secar.",
            frecuencia=Frecuencia.SEMANAL,
            plan_id=plan_heladera.id,
            responsable_legajo=juan.legajo,
        ),
    )

    t_freezer_diaria = crear_tarea(
        db,
        TareaCreate(
            nombre="Sanitizacion Diaria de Puerta y Manija",
            descripcion="Paso 1. Limpiar manija exterior y panel con Toallitas Desinfectantes con Alcohol. Paso 2. Rociar marco con Alcohol Isopropilico 70 Spray. Paso 3. Dejar evaporar al aire sin frotar con trapo sucio.",
            frecuencia=Frecuencia.DIARIA,
            plan_id=plan_freezer.id,
            responsable_legajo=lucia.legajo,
        ),
    )
    t_freezer_mensual = crear_tarea(
        db,
        TareaCreate(
            nombre="Desinfeccion Mensual y Control de Burletes",
            descripcion="Paso 1. Inspeccionar burletes de goma imantada. Paso 2. Lavar con Detergente Neutro Espumante tibio usando esponja suave. Paso 3. Secar minuciosamente los pliegues para evitar moho. Paso 4. Pulverizar solucion de Amonio Cuaternario 5ta Generacion y cerrar hermeticamente.",
            frecuencia=Frecuencia.MENSUAL,
            plan_id=plan_freezer.id,
            responsable_legajo=lucia.legajo,
        ),
    )

    t_camara_diaria = crear_tarea(
        db,
        TareaCreate(
            nombre="Lavado y Sanitizacion de Pisos",
            descripcion="Paso 1. Barrer residuos solidos hacia la salida. Paso 2. Preparar solucion de Lavandina Concentrada 55g al 1 por ciento en balde con agua fria. Paso 3. Fregar con cepillo duro desde el fondo hacia el desague. Paso 4. Dejar actuar 10 minutos y escurrir.",
            frecuencia=Frecuencia.DIARIA,
            plan_id=plan_camara.id,
            responsable_legajo=marcos.legajo,
        ),
    )
    t_camara_semanal = crear_tarea(
        db,
        TareaCreate(
            nombre="Desinfeccion de Estanterias y Racks",
            descripcion="Paso 1. Despejar bandejas de cada nivel. Paso 2. Preparar solucion de Amonio Cuaternario 5ta Generacion a razon de 5 ml por litro de agua. Paso 3. Pulverizar sobre todos los perfiles de acero inoxidable. Paso 4. Respetar 10 minutos de contacto antes de reubicar insumos.",
            frecuencia=Frecuencia.SEMANAL,
            plan_id=plan_camara.id,
            responsable_legajo=marcos.legajo,
        ),
    )

    t_amasadora_diaria = crear_tarea(
        db,
        TareaCreate(
            nombre="Limpieza y Desinfeccion de Batea",
            descripcion="Paso 1. Cortar energia electrica y accionar parada de emergencia. Paso 2. Retirar restos secos de harina y masa con espatula plastica. Paso 3. Disolver 150 gramos de Detergente en Polvo Enzimatico en agua tibia a 45°. Paso 4. Cepillar batea y gancho espiral. Paso 5. Enjuagar con abundante agua potable y rociar con Alcohol Isopropilico 70 Spray.",
            frecuencia=Frecuencia.DIARIA,
            plan_id=plan_amasadora.id,
            responsable_legajo=sofia.legajo,
        ),
    )
    t_amasadora_semanal = crear_tarea(
        db,
        TareaCreate(
            nombre="Desengrase General de Motor y Guardas",
            descripcion="Paso 1. Verificar motor apagado. Paso 2. Aplicar Desengrasante Alcalino Pesado con trapo humedo sobre carcasa externa. Paso 3. Retirar gratitud acumulada frotando en movimientos circulares. Paso 4. Repasar con paño humedo limpio y secar.",
            frecuencia=Frecuencia.SEMANAL,
            plan_id=plan_amasadora.id,
            responsable_legajo=sofia.legajo,
        ),
    )

    t_horno_diaria = crear_tarea(
        db,
        TareaCreate(
            nombre="Limpieza de Vidrio y Burlete Frontal",
            descripcion="Paso 1. Pulverizar Limpiavidrios Antiestatico sobre el cristal exterior e interior. Paso 2. Limpiar con papel tissue descartable. Paso 3. Repasar la goma selladora con Detergente Neutro Espumante y secar suavemente.",
            frecuencia=Frecuencia.DIARIA,
            plan_id=plan_horno.id,
            responsable_legajo=juan.legajo,
        ),
    )
    t_horno_semanal = crear_tarea(
        db,
        TareaCreate(
            nombre="Desengrase Intensivo de Camara",
            descripcion="Paso 1. Esperar a que el horno baje a temperatura tibia menor a 50°. Paso 2. Colocar guantes y proteccion ocular. Paso 3. Pulverizar Desengrasante Alcalino Pesado en paredes, turbina y techo interno. Paso 4. Dejar actuar 15 minutos para emulsionar grasas. Paso 5. Fregar con fibra abrasiva y enjuagar 3 veces con agua limpia.",
            frecuencia=Frecuencia.SEMANAL,
            plan_id=plan_horno.id,
            responsable_legajo=juan.legajo,
        ),
    )

    db.commit()

    print("Generando historial de checklists completados (dias anteriores con insumos y procedimientos)...")
    tareas_diarias = [
        {
            "plan": plan_heladera,
            "tarea": t_heladera_diaria,
            "insumos": [
                {"nombre": "Alcohol Isopropilico 70 Spray", "cantidad": 200.0, "unidad": "ML"}
            ]
        },
        {
            "plan": plan_freezer,
            "tarea": t_freezer_diaria,
            "insumos": [
                {"nombre": "Toallitas Desinfectantes con Alcohol", "cantidad": 2.0, "unidad": "UN"},
                {"nombre": "Alcohol Isopropilico 70 Spray", "cantidad": 50.0, "unidad": "ML"}
            ]
        },
        {
            "plan": plan_camara,
            "tarea": t_camara_diaria,
            "insumos": [
                {"nombre": "Lavandina Concentrada 55g", "cantidad": 0.25, "unidad": "L"}
            ]
        },
        {
            "plan": plan_amasadora,
            "tarea": t_amasadora_diaria,
            "insumos": [
                {"nombre": "Detergente en Polvo Enzimatico", "cantidad": 150.0, "unidad": "G"},
                {"nombre": "Alcohol Isopropilico 70 Spray", "cantidad": 100.0, "unidad": "ML"}
            ]
        },
        {
            "plan": plan_horno,
            "tarea": t_horno_diaria,
            "insumos": [
                {"nombre": "Limpiavidrios Antiestatico", "cantidad": 80.0, "unidad": "ML"},
                {"nombre": "Detergente Neutro Espumante", "cantidad": 0.05, "unidad": "L"}
            ]
        },
    ]

    tareas_semanales = [
        {
            "plan": plan_heladera,
            "tarea": t_heladera_semanal,
            "insumos": [
                {"nombre": "Detergente Neutro Espumante", "cantidad": 0.4, "unidad": "L"},
                {"nombre": "Sanitizante Clorado Liquido", "cantidad": 0.2, "unidad": "L"}
            ]
        },
        {
            "plan": plan_camara,
            "tarea": t_camara_semanal,
            "insumos": [
                {"nombre": "Amonio Cuaternario 5ta Generacion", "cantidad": 0.4, "unidad": "L"}
            ]
        },
        {
            "plan": plan_horno,
            "tarea": t_horno_semanal,
            "insumos": [
                {"nombre": "Desengrasante Alcalino Pesado", "cantidad": 0.5, "unidad": "L"},
                {"nombre": "Soda Caustica en Escamas", "cantidad": 0.25, "unidad": "KG"}
            ]
        },
    ]

    responsables = [juan, ana, marcos, lucia, sofia]
    for i, offset in enumerate(range(12, 0, -1)):
        fecha = datetime.now().date() - timedelta(days=offset)
        responsable = responsables[i % len(responsables)]
        checklist = Checklist(fecha=fecha, responsable_legajo=responsable.legajo, activo=True)

        lista_tareas_del_dia = list(tareas_diarias)
        if offset % 7 == 0:
            lista_tareas_del_dia.extend(tareas_semanales)

        for j, t_info in enumerate(lista_tareas_del_dia):
            plan = t_info["plan"]
            tarea = t_info["tarea"]
            # En algunos dias dejamos 1 tarea sin hacer para variacion realista de metricas
            realizada = not (i % 4 == 0 and j == len(lista_tareas_del_dia) - 1)
            item = ChecklistItem(
                plan_id=plan.id,
                nombre_plan=plan.nombre,
                tarea_id=tarea.id,
                nombre_tarea=tarea.nombre,
                descripcion_tarea=tarea.descripcion,
                frecuencia=tarea.frecuencia,
                estado=EstadoTareaItem.REALIZADO if realizada else EstadoTareaItem.PENDIENTE,
                responsable_legajo=responsable.legajo if realizada else None,
                insumos_utilizados=json.dumps(
                    t_info["insumos"],
                    ensure_ascii=False,
                ) if realizada else None,
                fecha_hora_fin=datetime.combine(fecha, datetime.min.time()) + timedelta(hours=9, minutes=15 * j) if realizada else None,
            )
            checklist.items.append(item)
        db.add(checklist)
    db.commit()

    print("Generando el checklist de hoy (para probarlo en la app)...")
    checklist_hoy = generar_checklist(db, ChecklistGenerar(responsable_legajo=marcos.legajo, fecha=date.today()))
    if checklist_hoy.items:
        completar_tarea(
            db,
            checklist_hoy.id,
            checklist_hoy.items[0].id,
            CompletarTareaSchema(
                responsable_legajo=marcos.legajo,
                insumos_utilizados=[
                    InsumoUtilizadoPlaceholder(nombre="Alcohol Isopropilico 70 Spray", cantidad=200.0, unidad="ML")
                ],
            ),
        )

    # Juan es operador: su checklist de hoy trae solo las tareas que tiene asignadas
    generar_checklist(db, ChecklistGenerar(responsable_legajo=juan.legajo, fecha=date.today()))

    id_checklist_hoy = checklist_hoy.id
    db.close()
    print("\nListo. Base alimentada exitosamente:")
    print(f"  - 5 personas, {len(INSUMOS)} insumos (materias primas), {len(INSUMOS_QUIMICOS)} insumos quimicos con unidades variadas (L, ML, KG, G, UN)")
    print("  - 10 equipos, 6 elementos de limpieza")
    print("  - 5 planes de limpieza con 10 tareas con procedimientos paso a paso")
    print("  - 12 checklists historicos completados con registro detallado de insumos")
    print(f"  - 1 checklist de hoy (checklist #{id_checklist_hoy}), con tarea inicial completada y restantes pendientes para prueba en vivo")


if __name__ == "__main__":
    main()
