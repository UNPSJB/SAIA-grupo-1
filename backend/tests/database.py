import pytest
from typing import Generator
from datetime import datetime, timedelta
from sqlalchemy import StaticPool, create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from src.main import app
from src.database import get_db
from src.config import settings
from src.models import ModeloBase
from src.personal.services import crear_personal
from src.personal.schemas import PersonalCreate
from src.insumos.services import crear_insumo
from src.insumos.schemas import InsumoCreate
from src.insumos.models import UnidadMedida
from src.equipos.services import crear_equipo
from src.equipos.schemas import EquipoCreate
from src.equipos.models import Categoria, Estado
from src.plan_De_limpieza.services import crear_plan
from src.plan_De_limpieza.schemas import PlanDeLimpiezaCreate
from src.tareas.services import crear_tarea
from src.tareas.schemas import TareaCreate
from src.tareas.models import Frecuencia


# creamos una db para testing
engine = create_engine(
    settings.DB_URL_TEST,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    # utilizaremos esta funcion para "pisar" la que definimos en src/database.py.
    db = TestingSessionLocal()
    # Para usar restricciones de FK en SQLite, debemos habilitar la siguiente opción:
    db.execute(text("PRAGMA foreign_keys = ON"))
    try:
        yield db
    finally:
        db.close()


# forzamos a fastapi para que utilice la db para testing.
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
def session() -> Generator[Session, None, None]:
    # Creamos las tablas en la db de pruebas
    ModeloBase.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    # Para usar restricciones de FK en SQLite, debemos habilitar la siguiente opción:
    db.execute(text("PRAGMA foreign_keys = ON"))

    # aqui podemos crear instancias de objetos para hacer tests
    # haciendo uso de las funciones "create_<clase>" de services y los schemas <Clase>Create.
    persona_1 = crear_personal(
        db,
        PersonalCreate(
            documento="30111222",
            nombre="Juan",
            apellido="Perez",
            email="juan.perez@gmail.com",
        ),
    )
    persona_2 = crear_personal(
        db,
        PersonalCreate(
            documento="30333444",
            nombre="Ana",
            apellido="Dominguez",
            email="ana.dominguez@gmail.com",
        ),
    )

    hoy = datetime.now()
    vencimiento_valido = (hoy + timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
    recepcion_valida = (hoy - timedelta(days=2)).replace(hour=0, minute=0, second=0, microsecond=0)

    # Insumos semilla para pruebas de POES y manipulación de alimentos
    insumo_1 = crear_insumo(
        db,
        InsumoCreate(
            nombre="Lavandina concentrada 55g/l",
            lote="POES-LAV-001",
            fechaRecepcion=recepcion_valida,
            fechaVencimiento=vencimiento_valido,
            cantRecibida=100.0,
            stock=80.0,
            medida=UnidadMedida.LITROS,
        ),
    )
    insumo_2 = crear_insumo(
        db,
        InsumoCreate(
            nombre="Detergente desengrasante alcalino",
            lote="POES-DET-002",
            fechaRecepcion=recepcion_valida,
            fechaVencimiento=vencimiento_valido,
            cantRecibida=50.0,
            stock=35.0,
            medida=UnidadMedida.LITROS,
        ),
    )
    insumo_3 = crear_insumo(
        db,
        InsumoCreate(
            nombre="Bobina de toallas secamanos",
            lote="POES-SEC-003",
            fechaRecepcion=recepcion_valida,
            fechaVencimiento=None,
            cantRecibida=50.0,
            stock=20.0,
            medida=UnidadMedida.UNIDADES,
        ),
    )

    equipo_1 = crear_equipo(
        db,
        EquipoCreate(
            nombre="Heladera",
            categoria=Categoria.CONSERVAMIENTO,
            ubicacion="Cocina",
            estado=Estado.ACTIVO,
            plan_de_calibracion="Semestral",
        ),
    )

    equipo_2 = crear_equipo(
        db,
        EquipoCreate(
            nombre="Freezer",
            categoria=Categoria.CONSERVAMIENTO,
            ubicacion="Deposito",
            estado=Estado.ACTIVO,
            plan_de_calibracion="Semestral",
        ),
    )

    plan_semilla = crear_plan(
        db,
        PlanDeLimpiezaCreate(
            nombre="PlanFreezer",
            fecha_inicio=hoy.date() - timedelta(days=14),
            equipo_id=equipo_2.id,
        ),
    )

    tarea_1 = crear_tarea(
        db,
        TareaCreate(
            nombre="Desinfeccion",
            descripcion="Desinfectar estantes con alcohol 70%",
            frecuencia=Frecuencia.DIARIO,
            plan_id=plan_semilla.id,
        ),
    )

    tarea_2 = crear_tarea(
        db,
        TareaCreate(
            nombre="Descongelar",
            descripcion="Descongelar y lavar burletes",
            frecuencia=Frecuencia.SEMANAL,
            plan_id=plan_semilla.id,
        ),
    )

    db.add_all([persona_1, persona_2, insumo_1, insumo_2, insumo_3, equipo_1, equipo_2, plan_semilla, tarea_1, tarea_2])
    db.commit()

    yield db

    db.close()
    ModeloBase.metadata.drop_all(bind=engine)
