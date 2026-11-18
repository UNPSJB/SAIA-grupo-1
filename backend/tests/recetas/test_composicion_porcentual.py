from datetime import date, datetime, timedelta
import pytest
from sqlalchemy.orm import Session
from src.insumos.models import Insumo
from src.personal.models import Personal
from src.personal.schemas import Capacidades
from src.produccion.models import LoteProduccion
from src.producto.models import Producto
from src.recetas import exceptions, schemas, services
from src.tipoInsumo.models import TipoInsumo
from src.unidadesMedida.services import asegurar_unidades_base
from tests.database import session


def _preparar_base(session: Session):
    asegurar_unidades_base(session)
    admin = Personal(
        documento="99000111",
        nombre="Admin",
        apellido="Recetas",
        email="admin.recetas@saia.com",
        usuario="admin_rec",
        contrasenia_hash="hash",
        capacidad=Capacidades.AMBAS,
        activo=True,
    )
    operario = Personal(
        documento="99000222",
        nombre="Operario",
        apellido="Planta",
        email="op.planta@saia.com",
        usuario="op_planta",
        contrasenia_hash="hash",
        capacidad=Capacidades.OPERAR,
        activo=True,
    )
    session.add_all([admin, operario])
    session.commit()
    session.refresh(admin)
    session.refresh(operario)

    t_harina = TipoInsumo(
        nombre="Harina Test",
        unidad_medida_id=1,
        cantidad_referencia=1.0,
        equivalencia_gramos=1000.0,
        energia_kcal=350.0,
        carbohidratos=72.0,
        proteinas=10.0,
        grasas_totales=1.2,
        sodio_mg=5.0,
        activo=True,
    )
    t_huevos = TipoInsumo(
        nombre="Huevos Test",
        unidad_medida_id=5,
        cantidad_referencia=1.0,
        equivalencia_gramos=60.0,
        energia_kcal=143.0,
        proteinas=12.6,
        grasas_totales=9.5,
        sodio_mg=142.0,
        activo=True,
    )
    t_vainilla = TipoInsumo(
        nombre="Esencia Vainilla Test",
        unidad_medida_id=4,
        cantidad_referencia=1.0,
        equivalencia_gramos=1.0,
        es_aditivo=True,
        clase_funcional="AROMATIZANTE",
        es_aromatizante=True,
        activo=True,
    )
    session.add_all([t_harina, t_huevos, t_vainilla])
    session.commit()

    ins_harina = Insumo(
        nombre="Harina 000 Lote 1",
        lote="L-HAR-01",
        fechaRecepcion=datetime.now(),
        fechaVencimiento=datetime.now() + timedelta(days=90),
        cantRecibida=50.0,
        stock=50.0,
        unidad_medida_id=1,
        tipo_insumo_id=t_harina.id,
        activo=True,
    )
    ins_huevos = Insumo(
        nombre="Huevos Frescos Lote 1",
        lote="L-HUE-01",
        fechaRecepcion=datetime.now(),
        fechaVencimiento=datetime.now() + timedelta(days=30),
        cantRecibida=100.0,
        stock=100.0,
        unidad_medida_id=5,
        tipo_insumo_id=t_huevos.id,
        activo=True,
    )
    ins_vainilla = Insumo(
        nombre="Esencia Vainilla Lote 1",
        lote="L-VAI-01",
        fechaRecepcion=datetime.now(),
        fechaVencimiento=datetime.now() + timedelta(days=180),
        cantRecibida=500.0,
        stock=500.0,
        unidad_medida_id=4,
        tipo_insumo_id=t_vainilla.id,
        es_aditivo=True,
        activo=True,
    )
    session.add_all([ins_harina, ins_huevos, ins_vainilla])
    session.commit()

    producto = Producto(
        nombre="Bizcochuelo Test",
        unidad_medida_id=5,
        peso_unidad_g=500.0,
        aplica_rotulado=True,
        activo=True,
    )
    session.add(producto)
    session.commit()
    session.refresh(producto)

    return admin, operario, producto, t_harina, t_huevos, t_vainilla, ins_harina, ins_huevos, ins_vainilla


def test_composicion_porcentual_con_equivalencias_y_aditivos(session: Session):
    admin, operario, producto, t_harina, t_huevos, t_vainilla, ins_harina, ins_huevos, ins_vainilla = _preparar_base(session)

    receta_in = schemas.RecetaCreate(
        nombre="Receta Bizcochuelo",
        rendimiento_final=2.0,
        tiempo_maximo_dias=2,
        fecha_creacion=datetime.now(),
        id_producto=producto.id,
        operario_legajo=operario.legajo,
        detalles=[
            schemas.RecetaDetalleCreate(
                nombre="Mezcla seca",
                ingrediente_id=ins_harina.id,
                tipo_insumo_id=t_harina.id,
                cantidad=0.35,
                unidad_medida="kilogramos",
                es_aditivo=False,
                descripcion_pasos="Tamizar 350g de harina.",
                parametros_control=[
                    schemas.ParametroControlReceta(
                        nombre_dato="Temperatura ambiente",
                        unidad_medida="°C",
                        umbral_minimo=18.0,
                        umbral_maximo=26.0,
                    )
                ],
            ),
            schemas.RecetaDetalleCreate(
                nombre="Batido de huevos",
                ingrediente_id=ins_huevos.id,
                tipo_insumo_id=t_huevos.id,
                cantidad=2.0,
                unidad_medida="unidades",
                es_aditivo=False,
                descripcion_pasos="Batir 2 huevos (120g).",
            ),
            schemas.RecetaDetalleCreate(
                nombre="Aromatizado",
                ingrediente_id=ins_vainilla.id,
                tipo_insumo_id=t_vainilla.id,
                cantidad=30.0,
                unidad_medida="mililitros",
                es_aditivo=True,
                clase_funcional="AROMATIZANTE",
                descripcion_pasos="Incorporar esencia de vainilla (30g).",
            ),
        ],
    )
    receta = services.crear_receta(session, receta_in, usuario=admin)

    comp = services.calcular_composicion_porcentual(session, receta.id)
    assert comp.peso_total_gramos == 500.0
    assert comp.cumple_cien_por_ciento is True
    assert comp.tiene_equivalencias_faltantes is False
    assert len(comp.ingredientes) == 2
    assert len(comp.aditivos) == 1

    assert comp.ingredientes[0].gramos_equivalentes == 350.0
    assert comp.ingredientes[0].porcentaje == 70.0
    assert comp.ingredientes[1].gramos_equivalentes == 120.0
    assert comp.ingredientes[1].porcentaje == 24.0
    assert comp.aditivos[0].gramos_equivalentes == 30.0
    assert comp.aditivos[0].porcentaje == 6.0


def test_aviso_cuando_falta_equivalencia_en_unidades(session: Session):
    admin, operario, producto, t_harina, _, _, ins_harina, _, _ = _preparar_base(session)

    t_sin_eq = TipoInsumo(
        nombre="Fruta Confitada Sin Eq",
        unidad_medida_id=5,
        cantidad_referencia=1.0,
        equivalencia_gramos=None,
        activo=True,
    )
    session.add(t_sin_eq)
    session.commit()

    ins_sin_eq = Insumo(
        nombre="Fruta Lote 1",
        lote="L-FRU-01",
        fechaRecepcion=datetime.now(),
        cantRecibida=10.0,
        stock=10.0,
        unidad_medida_id=5,
        tipo_insumo_id=t_sin_eq.id,
        activo=True,
    )
    session.add(ins_sin_eq)
    session.commit()

    receta = services.crear_receta(
        session,
        schemas.RecetaCreate(
            nombre="Receta Sin Equivalencia",
            rendimiento_final=1.0,
            fecha_creacion=datetime.now(),
            id_producto=producto.id,
            operario_legajo=operario.legajo,
            detalles=[
                schemas.RecetaDetalleCreate(
                    nombre="Base",
                    ingrediente_id=ins_harina.id,
                    cantidad=500.0,
                    unidad_medida="gramos",
                    es_aditivo=False,
                    descripcion_pasos="Pesar harina.",
                ),
                schemas.RecetaDetalleCreate(
                    nombre="Decorado",
                    ingrediente_id=ins_sin_eq.id,
                    cantidad=3.0,
                    unidad_medida="unidades",
                    es_aditivo=False,
                    descripcion_pasos="Colocar unidades.",
                ),
            ],
        ),
        usuario=admin,
    )

    comp = services.calcular_composicion_porcentual(session, receta.id)
    assert comp.tiene_equivalencias_faltantes is True
    assert len(comp.equivalencias_faltantes) == 1
    assert comp.cumple_cien_por_ciento is False


def test_checklist_secuencial_y_creacion_automatica_de_lote(session: Session):
    admin, operario, producto, t_harina, t_huevos, _, ins_harina, ins_huevos, _ = _preparar_base(session)

    services.crear_receta(
        session,
        schemas.RecetaCreate(
            nombre="Receta Lote Auto",
            rendimiento_final=2.0,
            tiempo_maximo_dias=3,
            fecha_creacion=datetime.now(),
            id_producto=producto.id,
            operario_legajo=operario.legajo,
            detalles=[
                schemas.RecetaDetalleCreate(
                    nombre="Paso 1 Harina",
                    ingrediente_id=ins_harina.id,
                    tipo_insumo_id=t_harina.id,
                    cantidad=1.0,
                    unidad_medida="kilogramos",
                    es_aditivo=False,
                    descripcion_pasos="Agregar harina.",
                ),
                schemas.RecetaDetalleCreate(
                    nombre="Paso 2 Huevos",
                    ingrediente_id=ins_huevos.id,
                    tipo_insumo_id=t_huevos.id,
                    cantidad=4.0,
                    unidad_medida="unidades",
                    es_aditivo=False,
                    descripcion_pasos="Agregar huevos.",
                ),
            ],
        ),
        usuario=admin,
    )

    with pytest.raises(exceptions.CantidadLoteNoDiscreta):
        services.generar_checklist_receta(
            session,
            schemas.ChecklistRecetaGenerar(
                responsable_legajo=operario.legajo,
                id_producto=producto.id,
                cantidad_objetivo=10.3,
            ),
        )

    chk = services.generar_checklist_receta(
        session,
        schemas.ChecklistRecetaGenerar(
            responsable_legajo=operario.legajo,
            id_producto=producto.id,
            cantidad_objetivo=4.0,
        ),
    )
    assert chk.tiempo_maximo_dias == 3
    assert len(chk.items) == 2
    paso1, paso2 = chk.items[0], chk.items[1]
    assert paso1.cantidad == 2.0
    assert paso2.cantidad == 8.0

    with pytest.raises(exceptions.PasoAnteriorPendiente):
        services.completar_etapa_checklist(session, chk.id, paso2.id, operario.legajo)

    services.completar_etapa_checklist(
        session,
        chk.id,
        paso1.id,
        operario.legajo,
        schemas.CompletarEtapaSchema(lote_insumo_id=ins_harina.id),
    )
    session.refresh(ins_harina)
    assert ins_harina.stock == 48.0

    services.completar_etapa_checklist(
        session,
        chk.id,
        paso2.id,
        operario.legajo,
        schemas.CompletarEtapaSchema(lote_insumo_id=ins_huevos.id),
    )
    session.refresh(ins_huevos)
    assert ins_huevos.stock == 92.0

    session.refresh(chk)
    assert chk.lote_produccion_id is not None
    lote_creado = session.get(LoteProduccion, chk.lote_produccion_id)
    assert lote_creado is not None
    assert lote_creado.cantidad == 4.0
    assert lote_creado.checklist_receta_id == chk.id
    assert len(lote_creado.insumos) == 2
