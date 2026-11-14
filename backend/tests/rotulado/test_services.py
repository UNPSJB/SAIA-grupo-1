from datetime import date
import pytest
from sqlalchemy.orm import Session
from src.insumos.models import Insumo, UnidadMedida
from src.personal.models import Personal
from src.personal.schemas import Capacidades
from src.produccion.models import InsumoLote, LoteProduccion
from src.producto.models import Producto
from src.rotulado import constants, exceptions, models, schemas, services
from src.rotulado.models import FormatoDeclaracionAditivos
from tests.database import session


def test_ordenar_ingredientes_decreciente_por_porcentaje():
    class ItemMock:
        def __init__(self, nombre, pct, es_adit=False, funcion=None, ins=None, aroma=False):
            self.nombre = nombre
            self.denominacion_rotulo = nombre
            self.porcentaje = pct
            self.es_aditivo = es_adit
            self.funcion = funcion
            self.numero_ins = ins
            self.es_aromatizante = aroma
            self.orden = 0
            self.texto_declaracion = None

    items = [
        ItemMock("Agua", 20.0),
        ItemMock("Harina de trigo", 60.0),
        ItemMock("Azúcar", 10.0),
    ]
    res = services.ordenar_items_logica(items, FormatoDeclaracionAditivos.INS_Y_NOMBRE)
    assert [it.nombre for it in res] == ["Harina de trigo", "Agua", "Azúcar"]
    assert [it.orden for it in res] == [1, 2, 3]


def test_orden_estable_ante_porcentajes_iguales():
    class ItemMock:
        def __init__(self, nombre, denom, pct, es_adit=False):
            self.nombre = nombre
            self.denominacion_rotulo = denom
            self.porcentaje = pct
            self.es_aditivo = es_adit
            self.funcion = None
            self.numero_ins = None
            self.es_aromatizante = False
            self.orden = 0
            self.texto_declaracion = None

    items = [
        ItemMock("Zanahoria", "Zanahoria deshidratada", 15.0),
        ItemMock("Avena", "Avena arrollada", 15.0),
        ItemMock("Harina", "Harina de maíz", 70.0),
    ]
    res = services.ordenar_items_logica(items, FormatoDeclaracionAditivos.SOLO_NOMBRE)
    assert res[0].nombre == "Harina"
    assert res[1].nombre == "Avena"
    assert res[2].nombre == "Zanahoria"


def test_aditivos_a_continuacion_y_agrupados_por_funcion():
    class ItemMock:
        def __init__(self, nombre, pct, es_adit, funcion=None, ins=None, aroma=False):
            self.nombre = nombre
            self.denominacion_rotulo = nombre
            self.porcentaje = pct
            self.es_aditivo = es_adit
            self.funcion = funcion
            self.numero_ins = ins
            self.es_aromatizante = aroma
            self.orden = 0
            self.texto_declaracion = None

    items = [
        ItemMock("Lecitina de soja", 0.5, True, "Emulsionante", "322"),
        ItemMock("Harina", 80.0, False),
        ItemMock("Sorbato de potasio", 0.2, True, "Conservante", "202"),
        ItemMock("Benzoato de sodio", 0.1, True, "Conservante", "211"),
        ItemMock("Agua", 15.0, False),
    ]
    res = services.ordenar_items_logica(items, FormatoDeclaracionAditivos.INS_Y_NOMBRE)
    assert res[0].nombre == "Harina"
    assert res[1].nombre == "Agua"
    assert res[2].funcion == "Conservante"
    assert res[3].funcion == "Conservante"
    assert res[4].funcion == "Emulsionante"


def test_formatos_declaracion_aditivos():
    class ItemMock:
        def __init__(self, nombre, pct, funcion, ins):
            self.nombre = nombre
            self.denominacion_rotulo = nombre
            self.porcentaje = pct
            self.es_aditivo = True
            self.funcion = funcion
            self.numero_ins = ins
            self.es_aromatizante = False
            self.orden = 0
            self.texto_declaracion = None

    item_con_ins = ItemMock("Sorbato de potasio", 0.2, "Conservante", "202")
    item_sin_ins = ItemMock("Extracto natural", 0.1, "Antioxidante", None)

    assert (
        services.formatear_declaracion_item(
            item_con_ins, FormatoDeclaracionAditivos.SOLO_INS
        )
        == "Conservante (INS 202)"
    )
    assert (
        services.formatear_declaracion_item(
            item_con_ins, FormatoDeclaracionAditivos.SOLO_NOMBRE
        )
        == "Conservante (Sorbato de potasio)"
    )
    assert (
        services.formatear_declaracion_item(
            item_con_ins, FormatoDeclaracionAditivos.INS_Y_NOMBRE
        )
        == "Conservante (INS 202 - Sorbato de potasio)"
    )
    assert (
        services.formatear_declaracion_item(
            item_con_ins, FormatoDeclaracionAditivos.NOMBRE_E_INS
        )
        == "Conservante (Sorbato de potasio, INS 202)"
    )
    assert (
        services.formatear_declaracion_item(
            item_sin_ins, FormatoDeclaracionAditivos.SOLO_INS
        )
        == "Antioxidante (Extracto natural)"
    )


def test_validacion_aromatizantes_solo_por_funcion():
    class ItemMock:
        def __init__(self, nombre, pct, funcion, ins, aroma):
            self.nombre = nombre
            self.denominacion_rotulo = nombre
            self.porcentaje = pct
            self.es_aditivo = True
            self.funcion = funcion
            self.numero_ins = ins
            self.es_aromatizante = aroma
            self.orden = 0
            self.texto_declaracion = None

    item1 = ItemMock("Vainillina artificial", 0.05, "Aromatizante", "950", True)
    item2 = ItemMock("Esencia de limón", 0.05, "Saborizante natural", None, False)

    for formato in FormatoDeclaracionAditivos:
        assert services.formatear_declaracion_item(item1, formato) == "Aromatizante"
        assert (
            services.formatear_declaracion_item(item2, formato)
            == "Saborizante natural"
        )


def test_construir_texto_rotulo():
    assert services.construir_texto_rotulo([]) == ""

    class MockItem:
        def __init__(self, txt):
            self.texto_declaracion = txt

    items = [MockItem("Harina"), MockItem("Agua"), MockItem("Conservante (INS 202)")]
    txt = services.construir_texto_rotulo(items)
    assert txt == "INGREDIENTES: Harina, Agua, Conservante (INS 202)."


def test_aditivo_incompleto_lanza_excepcion():
    class ItemMock:
        def __init__(self):
            self.nombre = None
            self.denominacion_rotulo = None
            self.porcentaje = 1.0
            self.es_aditivo = True
            self.funcion = None
            self.numero_ins = None
            self.es_aromatizante = False

    with pytest.raises(exceptions.DatosIncompletosAditivo):
        services.ordenar_items_logica(
            [ItemMock()], FormatoDeclaracionAditivos.INS_Y_NOMBRE
        )


def test_previsualizar_orden():
    with pytest.raises(exceptions.ListaVacia):
        services.previsualizar_orden(
            schemas.PrevisualizarOrdenRequest(formato_aditivos=None, items=[])
        )

    req = schemas.PrevisualizarOrdenRequest(
        formato_aditivos=FormatoDeclaracionAditivos.SOLO_INS,
        items=[
            schemas.ItemIngredienteCreate(
                nombre="Agua",
                denominacion_rotulo="Agua potable",
                porcentaje=30.0,
                es_aditivo=False,
            ),
            schemas.ItemIngredienteCreate(
                nombre="Harina",
                denominacion_rotulo="Harina de trigo",
                porcentaje=69.0,
                es_aditivo=False,
            ),
            schemas.ItemIngredienteCreate(
                nombre="Sorbato",
                denominacion_rotulo="Sorbato de potasio",
                porcentaje=1.0,
                es_aditivo=True,
                funcion="Conservante",
                numero_ins="202",
            ),
        ],
    )
    resp = services.previsualizar_orden(req)
    assert len(resp.items) == 3
    assert resp.items[0].denominacion_rotulo == "Harina de trigo"
    assert resp.items[1].denominacion_rotulo == "Agua potable"
    assert resp.items[2].texto_declaracion == "Conservante (INS 202)"
    assert (
        resp.texto_rotulo
        == "INGREDIENTES: Harina de trigo, Agua potable, Conservante (INS 202)."
    )


def test_guardar_y_obtener_lista_rotulo_db(session: Session):
    prod = Producto(
        nombre="Pan Casero Test",
        unidadMedida=UnidadMedida.KILOGRAMOS,
        activo=True,
    )
    session.add(prod)
    session.commit()

    with pytest.raises(exceptions.ListaVacia):
        services.guardar_lista_rotulo(
            session,
            prod.id,
            schemas.ListaIngredientesCreate(items=[]),
            None,
        )

    datos = schemas.ListaIngredientesCreate(
        formato_aditivos=FormatoDeclaracionAditivos.INS_Y_NOMBRE,
        ajustado_manualmente=False,
        items=[
            schemas.ItemIngredienteCreate(
                nombre="Agua",
                porcentaje=40.0,
                es_aditivo=False,
            ),
            schemas.ItemIngredienteCreate(
                nombre="Harina",
                porcentaje=59.0,
                es_aditivo=False,
            ),
            schemas.ItemIngredienteCreate(
                nombre="Lecitina",
                porcentaje=1.0,
                es_aditivo=True,
                funcion="Emulsionante",
                numero_ins="322",
            ),
        ],
    )
    lista = services.guardar_lista_rotulo(session, prod.id, datos, None)
    assert lista.producto_id == prod.id
    assert lista.ajustado_manualmente is False
    assert len(lista.items) == 3
    assert lista.items[0].nombre == "Harina"
    assert lista.items[1].nombre == "Agua"
    assert lista.items[2].nombre == "Lecitina"

    resp_map = services.mapear_respuesta_lista(lista)
    assert resp_map.producto_nombre == "Pan Casero Test"
    assert len(resp_map.items) == 3

    obtenida = services.obtener_lista_rotulo(session, prod.id)
    assert obtenida is not None
    assert obtenida.id == lista.id

    datos_actualizados = schemas.ListaIngredientesCreate(
        formato_aditivos=FormatoDeclaracionAditivos.SOLO_NOMBRE,
        ajustado_manualmente=False,
        items=[
            schemas.ItemIngredienteCreate(
                nombre="Harina Integral",
                porcentaje=80.0,
                es_aditivo=False,
            ),
            schemas.ItemIngredienteCreate(
                nombre="Agua",
                porcentaje=20.0,
                es_aditivo=False,
            ),
        ],
    )
    lista_act = services.guardar_lista_rotulo(
        session, prod.id, datos_actualizados, None
    )
    assert len(lista_act.items) == 2
    assert lista_act.items[0].nombre == "Harina Integral"


def test_guardar_ajuste_manual_deja_constancia(session: Session):
    prod = Producto(
        nombre="Alfajor Test",
        unidadMedida=UnidadMedida.UNIDADES,
        activo=True,
    )
    session.add(prod)
    session.commit()

    user = Personal(
        legajo=123,
        documento="12345678",
        nombre="Juan",
        apellido="Perez",
        email="juan@test.com",
        capacidad=Capacidades.ADMINISTRAR,
        activo=True,
        usuario="jperez",
    )
    session.add(user)
    session.commit()

    datos = schemas.ListaIngredientesCreate(
        formato_aditivos=FormatoDeclaracionAditivos.INS_Y_NOMBRE,
        ajustado_manualmente=False,
        items=[
            schemas.ItemIngredienteCreate(
                nombre="Dulce de leche", porcentaje=60.0, es_aditivo=False
            ),
            schemas.ItemIngredienteCreate(
                nombre="Galletita", porcentaje=38.0, es_aditivo=False
            ),
            schemas.ItemIngredienteCreate(
                nombre="Sorbato",
                porcentaje=2.0,
                es_aditivo=True,
                funcion="Conservante",
                numero_ins="202",
            ),
        ],
    )
    lista = services.guardar_lista_rotulo(session, prod.id, datos, user)
    assert lista.ajustado_manualmente is False

    id_ddl = next(it.id for it in lista.items if it.nombre == "Dulce de leche")
    id_gall = next(it.id for it in lista.items if it.nombre == "Galletita")
    id_sorb = next(it.id for it in lista.items if it.nombre == "Sorbato")

    reorden = schemas.ReordenarItemsManual(item_ids=[id_sorb, id_gall, id_ddl])
    lista_manual = services.reordenar_manualmente(
        session, prod.id, reorden, user
    )
    assert lista_manual.ajustado_manualmente is True
    assert lista_manual.usuario_ajuste_manual == "jperez"
    assert lista_manual.fecha_ajuste_manual is not None
    assert lista_manual.items[0].id == id_sorb
    assert lista_manual.items[1].id == id_gall
    assert lista_manual.items[2].id == id_ddl

    with pytest.raises(exceptions.ItemsReordenarInvalidos):
        services.reordenar_manualmente(
            session, prod.id, schemas.ReordenarItemsManual(item_ids=[id_sorb, 9999]), user
        )

    lista_auto = services.restablecer_automatico(session, prod.id, user)
    assert lista_auto.ajustado_manualmente is False
    assert lista_auto.usuario_ajuste_manual is None
    assert lista_auto.fecha_ajuste_manual is None
    assert lista_auto.items[0].id == id_ddl


def test_guardar_directo_con_ajuste_manual(session: Session):
    prod = Producto(
        nombre="Galleta Manual Test",
        unidadMedida=UnidadMedida.UNIDADES,
        activo=True,
    )
    session.add(prod)
    session.commit()

    user = Personal(
        legajo=124,
        documento="87654321",
        nombre="Ana",
        apellido="Gomez",
        email="ana@test.com",
        capacidad=Capacidades.ADMINISTRAR,
        activo=True,
        usuario="agomez",
    )
    session.add(user)
    session.commit()

    datos = schemas.ListaIngredientesCreate(
        formato_aditivos=FormatoDeclaracionAditivos.INS_Y_NOMBRE,
        ajustado_manualmente=True,
        items=[
            schemas.ItemIngredienteCreate(
                nombre="Sal", porcentaje=2.0, es_aditivo=False
            ),
            schemas.ItemIngredienteCreate(
                nombre="Harina", porcentaje=98.0, es_aditivo=False
            ),
        ],
    )
    lista = services.guardar_lista_rotulo(session, prod.id, datos, user)
    assert lista.ajustado_manualmente is True
    assert lista.usuario_ajuste_manual == "agomez"
    assert lista.items[0].nombre == "Sal"
    assert lista.items[1].nombre == "Harina"


def test_cambiar_formato_aditivos(session: Session):
    prod = Producto(
        nombre="Budín Test",
        unidadMedida=UnidadMedida.UNIDADES,
        activo=True,
    )
    session.add(prod)
    session.commit()

    datos = schemas.ListaIngredientesCreate(
        formato_aditivos=FormatoDeclaracionAditivos.SOLO_INS,
        ajustado_manualmente=False,
        items=[
            schemas.ItemIngredienteCreate(
                nombre="Harina", porcentaje=95.0, es_aditivo=False
            ),
            schemas.ItemIngredienteCreate(
                nombre="Ácido cítrico",
                porcentaje=5.0,
                es_aditivo=True,
                funcion="Acidulante",
                numero_ins="330",
            ),
        ],
    )
    lista = services.guardar_lista_rotulo(session, prod.id, datos, None)
    assert "Acidulante (INS 330)" in lista.texto_rotulo

    lista_mod = services.cambiar_formato_aditivos(
        session, prod.id, FormatoDeclaracionAditivos.SOLO_NOMBRE, None
    )
    assert lista_mod.formato_aditivos == FormatoDeclaracionAditivos.SOLO_NOMBRE
    assert "Acidulante (Ácido cítrico)" in lista_mod.texto_rotulo


def test_disponibilidad_para_rotulado_e13(session: Session):
    prod = Producto(
        nombre="Cerveza Test",
        unidadMedida=UnidadMedida.LITROS,
        activo=True,
    )
    session.add(prod)
    session.commit()

    e13_vacio = services.obtener_para_e13(session, prod.id)
    assert e13_vacio.disponible is False
    assert e13_vacio.texto_rotulo is None
    assert e13_vacio.items == []

    datos = schemas.ListaIngredientesCreate(
        formato_aditivos=FormatoDeclaracionAditivos.INS_Y_NOMBRE,
        ajustado_manualmente=False,
        items=[
            schemas.ItemIngredienteCreate(
                nombre="Agua", porcentaje=85.0, es_aditivo=False
            ),
            schemas.ItemIngredienteCreate(
                nombre="Cebada", porcentaje=15.0, es_aditivo=False
            ),
        ],
    )
    services.guardar_lista_rotulo(session, prod.id, datos, None)

    e13_listo = services.obtener_para_e13(session, prod.id)
    assert e13_listo.disponible is True
    assert e13_listo.producto_nombre == "Cerveza Test"
    assert e13_listo.texto_rotulo == "INGREDIENTES: Agua, Cebada."
    assert len(e13_listo.items) == 2


def test_importar_desde_lote(session: Session):
    prod = Producto(
        nombre="Pan de Molde Lote Test",
        unidadMedida=UnidadMedida.KILOGRAMOS,
        activo=True,
    )
    session.add(prod)
    session.commit()

    with pytest.raises(exceptions.SinLotesDisponibles):
        services.importar_desde_lote(session, prod.id)

    user = Personal(
        legajo=125,
        documento="22334455",
        nombre="Pedro",
        apellido="Lote",
        email="pedro@lote.com",
        capacidad=Capacidades.OPERAR,
        activo=True,
        usuario="pedro",
    )
    session.add(user)

    ins1 = Insumo(
        nombre="Harina de Trigo",
        lote="H-01",
        fechaRecepcion=date.today(),
        cantRecibida=100.0,
        stock=100.0,
        medida=UnidadMedida.KILOGRAMOS,
    )
    ins2 = Insumo(
        nombre="Esencia de Vainilla",
        lote="V-01",
        fechaRecepcion=date.today(),
        cantRecibida=10.0,
        stock=10.0,
        medida=UnidadMedida.LITROS,
    )
    ins3 = Insumo(
        nombre="Polvo de Hornear",
        lote="P-01",
        fechaRecepcion=date.today(),
        cantRecibida=10.0,
        stock=10.0,
        medida=UnidadMedida.KILOGRAMOS,
    )
    session.add_all([ins1, ins2, ins3])
    session.commit()

    lote = LoteProduccion(
        codigo="L-TEST-01",
        producto_id=prod.id,
        fecha=date.today(),
        cantidad=50.0,
        responsable_legajo=user.legajo,
    )
    session.add(lote)
    session.commit()

    lote.insumos.append(InsumoLote(insumo_id=ins1.id, cantidad=40.0))
    lote.insumos.append(InsumoLote(insumo_id=ins2.id, cantidad=2.0))
    lote.insumos.append(InsumoLote(insumo_id=ins3.id, cantidad=8.0))
    session.commit()

    preview = services.importar_desde_lote(session, prod.id, lote.id)
    assert len(preview.items) == 3
    assert preview.items[0].nombre == "Harina de Trigo"
    assert preview.items[0].es_aditivo is False

    aroma_item = next(it for it in preview.items if it.nombre == "Esencia de Vainilla")
    assert aroma_item.es_aromatizante is True
    assert aroma_item.es_aditivo is True
    assert aroma_item.texto_declaracion == "Aromatizante"

    leudante_item = next(it for it in preview.items if it.nombre == "Polvo de Hornear")
    assert leudante_item.es_aditivo is True
    assert leudante_item.funcion == "Leudante químico"


def test_excepciones_varias(session: Session):
    with pytest.raises(exceptions.ProductoNoEncontrado):
        services.obtener_producto_o_404(session, 99999)

    with pytest.raises(exceptions.ProductoNoEncontrado):
        services.reordenar_manualmente(
            session, 99999, schemas.ReordenarItemsManual(item_ids=[1]), None
        )

    prod_sin_lista = Producto(
        nombre="Prod Sin Lista Test",
        unidadMedida=UnidadMedida.UNIDADES,
        activo=True,
    )
    session.add(prod_sin_lista)
    session.commit()

    with pytest.raises(exceptions.ListaIngredientesNoEncontrada):
        services.reordenar_manualmente(
            session, prod_sin_lista.id, schemas.ReordenarItemsManual(item_ids=[1]), None
        )

    with pytest.raises(exceptions.ListaIngredientesNoEncontrada):
        services.restablecer_automatico(session, prod_sin_lista.id, None)

    with pytest.raises(exceptions.ListaIngredientesNoEncontrada):
        services.cambiar_formato_aditivos(
            session, prod_sin_lista.id, FormatoDeclaracionAditivos.SOLO_INS, None
        )


def test_ramas_auxiliares_cobertura(session: Session):
    from types import SimpleNamespace
    from src.rotulado.migraciones import actualizar_tablas_rotulado
    from tests.database import engine

    actualizar_tablas_rotulado(engine)

    assert services._obtener_nombre_usuario(None) is None
    assert (
        services._obtener_nombre_usuario(
            SimpleNamespace(nombre="Carlos", apellido="G")
        )
        == "Carlos G"
    )
    assert services._obtener_nombre_usuario(SimpleNamespace()) == "Administrador"

    class AditivoSinFuncion:
        def __init__(self):
            self.nombre = "Compuesto X"
            self.denominacion_rotulo = None
            self.porcentaje = 0.5
            self.es_aditivo = True
            self.funcion = ""
            self.numero_ins = None
            self.es_aromatizante = False

    dec = services.formatear_declaracion_item(
        AditivoSinFuncion(), FormatoDeclaracionAditivos.SOLO_NOMBRE
    )
    assert dec == "Aditivo (Compuesto X)"

    prod1 = Producto(
        nombre="Prod Lote Rama 1", unidadMedida=UnidadMedida.KILOGRAMOS, activo=True
    )
    prod2 = Producto(
        nombre="Prod Lote Rama 2", unidadMedida=UnidadMedida.KILOGRAMOS, activo=True
    )
    user = Personal(
        legajo=777,
        documento="11223344",
        nombre="Mario",
        apellido="Lote",
        email="mario@lote.com",
        capacidad=Capacidades.OPERAR,
        activo=True,
        usuario="mlote",
    )
    session.add_all([prod1, prod2, user])
    session.commit()

    lote_otro_prod = LoteProduccion(
        codigo="L-OTRO-01",
        producto_id=prod2.id,
        fecha=date.today(),
        cantidad=10.0,
        responsable_legajo=user.legajo,
    )
    session.add(lote_otro_prod)
    session.commit()

    with pytest.raises(exceptions.SinLotesDisponibles):
        services.importar_desde_lote(session, prod1.id, lote_otro_prod.id)

    ins_cero = Insumo(
        nombre="Insumo Cero",
        lote="C-01",
        fechaRecepcion=date.today(),
        cantRecibida=10.0,
        stock=10.0,
        medida=UnidadMedida.KILOGRAMOS,
    )
    session.add(ins_cero)
    session.commit()

    lote_cero = LoteProduccion(
        codigo="L-CERO-01",
        producto_id=prod1.id,
        fecha=date.today(),
        cantidad=10.0,
        responsable_legajo=user.legajo,
    )
    session.add(lote_cero)
    session.commit()
    lote_cero.insumos.append(InsumoLote(insumo_id=ins_cero.id, cantidad=0.0))
    session.commit()

    with pytest.raises(exceptions.PorcentajeInvalido):
        services.importar_desde_lote(session, prod1.id, lote_cero.id)

    ins_grande = Insumo(
        nombre="Harina Grande",
        lote="G-01",
        fechaRecepcion=date.today(),
        cantRecibida=10000.0,
        stock=10000.0,
        medida=UnidadMedida.KILOGRAMOS,
    )
    ins_diminuto = Insumo(
        nombre="Aditivo Diminuto",
        lote="D-01",
        fechaRecepcion=date.today(),
        cantRecibida=1.0,
        stock=1.0,
        medida=UnidadMedida.GRAMOS,
    )
    session.add_all([ins_grande, ins_diminuto])
    session.commit()

    lote_diminuto = LoteProduccion(
        codigo="L-DIM-01",
        producto_id=prod1.id,
        fecha=date.today(),
        cantidad=100.0,
        responsable_legajo=user.legajo,
    )
    session.add(lote_diminuto)
    session.commit()
    lote_diminuto.insumos.append(InsumoLote(insumo_id=ins_grande.id, cantidad=100000.0))
    lote_diminuto.insumos.append(InsumoLote(insumo_id=ins_diminuto.id, cantidad=0.0001))
    session.commit()

    res_dim = services.importar_desde_lote(session, prod1.id, lote_diminuto.id)
    item_dim = next(it for it in res_dim.items if it.nombre == "Aditivo Diminuto")
    assert item_dim.porcentaje == 0.01


def _crear_prod_y_user_aux(session: Session, nombre_prod: str):
    prod = Producto(
        nombre=nombre_prod,
        unidadMedida=UnidadMedida.KILOGRAMOS,
        activo=True,
    )
    user = Personal(
        nombre="Admin",
        apellido="Rotulo",
        email=f"admin_{abs(hash(nombre_prod)) % 100000}@saia.com",
        usuario=f"user_{abs(hash(nombre_prod)) % 100000}",
        documento=f"99{abs(hash(nombre_prod)) % 1000000:06d}",
        capacidad=Capacidades.ADMINISTRAR,
    )
    session.add_all([prod, user])
    session.commit()
    return prod, user


def test_obtener_o_crear_borrador_y_guardar(session: Session):
    prod1, user = _crear_prod_y_user_aux(session, "Prod Borrador 1")
    borrador = services.obtener_o_crear_borrador(session, prod1.id)
    assert borrador.producto_id == prod1.id
    assert borrador.denominacion_venta == prod1.nombre
    assert borrador.pais_origen == "Industria Argentina"

    mismo = services.obtener_o_crear_borrador(session, prod1.id)
    assert mismo.id == borrador.id

    datos_up = schemas.BorradorRotuloUpdate(
        denominacion_venta="Pan Lactal Blanco Especial Enriquecido",
        contenido_neto="550 g",
        rnpa_rppa="RNPA 02-567890",
        rne="RNE 02-034567",
        razon_social="SAIA Panificados S.A.",
        porcion="50 g (2 rebanadas)",
        porciones_por_envase="11",
        valor_energetico_kcal=140.0,
        valor_energetico_kj=586.0,
        carbohidratos=26.0,
        azucares_totales=2.5,
        azucares_anadidos=1.5,
        proteinas=4.5,
        grasas_totales=2.0,
        grasas_saturadas=0.5,
        grasas_trans=0.0,
        fibra_alimentaria=1.5,
        sodio=240.0,
        modo_calculo_octogonos="manual",
        tiene_exceso_sodio=True,
    )
    actualizado = services.guardar_borrador(session, prod1.id, datos_up, user)
    assert actualizado.denominacion_venta == "Pan Lactal Blanco Especial Enriquecido"
    assert actualizado.contenido_neto == "550 g"
    assert actualizado.rnpa_rppa == "RNPA 02-567890"
    assert actualizado.tiene_exceso_sodio is True


def test_octogonos_automaticos_y_manuales(session: Session):
    prod1, user = _crear_prod_y_user_aux(session, "Prod Octogonos 2")
    borrador = services.obtener_o_crear_borrador(session, prod1.id)
    borrador.modo_calculo_octogonos = "manual"
    borrador.tiene_exceso_azucares = True
    borrador.tiene_exceso_grasas_totales = True
    borrador.tiene_exceso_grasas_saturadas = True
    borrador.tiene_exceso_calorias = True
    borrador.tiene_exceso_sodio = True
    borrador.contiene_edulcorantes = True
    borrador.contiene_cafeina = True
    session.commit()

    octs, tiene, msg = services.calcular_octogonos_e12(borrador, None)
    assert tiene is True
    assert len(octs) == 7
    assert any(o.id == "azucares" for o in octs)
    assert any(o.id == "edulcorantes" for o in octs)

    borrador.modo_calculo_octogonos = "automatico"
    borrador.valor_energetico_kcal = 300.0
    borrador.azucares_anadidos = 15.0
    borrador.grasas_totales = 15.0
    borrador.grasas_saturadas = 5.0
    borrador.sodio = 400.0
    session.commit()

    lista_mock = models.ListaIngredientesRotulo(producto_id=prod1.id)
    item_aroma = models.ItemIngredienteRotulo(
        lista=lista_mock,
        orden=1,
        nombre="Extracto de Café y Edulcorante Sucralosa",
        denominacion_rotulo="Saborizante",
        porcentaje=2.0,
        es_aditivo=True,
    )
    lista_mock.items = [item_aroma]

    octs_auto, tiene_auto, msg_auto = services.calcular_octogonos_e12(borrador, lista_mock)
    assert tiene_auto is True
    assert any(o.id == "azucares" for o in octs_auto)
    assert any(o.id == "grasas_totales" for o in octs_auto)
    assert any(o.id == "calorias" for o in octs_auto)
    assert any(o.id == "sodio" for o in octs_auto)
    assert any(o.id == "edulcorantes" for o in octs_auto)
    assert any(o.id == "cafeina" for o in octs_auto)

    borrador_sano = models.BorradorRotulo(
        producto_id=prod1.id,
        modo_calculo_octogonos="automatico",
        valor_energetico_kcal=80.0,
        azucares_anadidos=0.0,
        grasas_totales=1.0,
        grasas_saturadas=0.2,
        sodio=30.0,
    )
    octs_sano, tiene_sano, msg_sano = services.calcular_octogonos_e12(borrador_sano, None)
    assert tiene_sano is False
    assert len(octs_sano) == 0
    assert msg_sano == constants.MENSAJE_SIN_OCTOGONOS


def test_detectar_datos_faltantes_y_tabla(session: Session):
    prod1, user = _crear_prod_y_user_aux(session, "Prod Faltantes 3")
    borrador = services.obtener_o_crear_borrador(session, prod1.id)
    borrador.denominacion_venta = ""
    borrador.contenido_neto = ""
    borrador.rnpa_rppa = None
    borrador.rne = None
    borrador.razon_social = ""
    borrador.direccion_origen = ""
    borrador.pais_origen = ""
    borrador.lote = ""
    borrador.fecha_duracion = ""
    borrador.tabla_marcada_incompleta = True
    session.commit()

    faltantes, tabla_inc, motivos, es_comp, pct, tot, comp = (
        services.detectar_datos_faltantes_y_tabla(borrador, None)
    )
    assert es_comp is False
    assert tabla_inc is True
    assert any("denominación de venta" in f for f in faltantes)
    assert any("contenido neto" in f for f in faltantes)
    assert any("RNPA o RPPA" in f for f in faltantes)
    assert any("RNE o RPE" in f for f in faltantes)
    assert any("razón social" in f for f in faltantes)
    assert any("dirección o domicilio" in f for f in faltantes)
    assert any("país de origen" in f for f in faltantes)
    assert any("lote" in f for f in faltantes)
    assert any("duración" in f for f in faltantes)
    assert any("incompleta" in m for m in motivos)

    borrador.denominacion_venta = "Pan de molde"
    borrador.contenido_neto = "500 g"
    borrador.rnpa_rppa = "02-12345"
    borrador.rne = "02-54321"
    borrador.razon_social = "SAIA Alimentos S.A."
    borrador.direccion_origen = "Parque Industrial Trelew"
    borrador.pais_origen = "Industria Argentina"
    borrador.lote = "L-001"
    borrador.fecha_duracion = "Vence: 30/12/2026"
    borrador.tabla_marcada_incompleta = False
    borrador.porcion = "50 g"
    borrador.valor_energetico_kcal = 120.0
    borrador.carbohidratos = 22.0
    borrador.proteinas = 4.0
    borrador.grasas_totales = 1.5
    borrador.sodio = 180.0
    session.commit()

    lista_ok = models.ListaIngredientesRotulo(producto_id=prod1.id)
    lista_ok.items = [
        models.ItemIngredienteRotulo(
            lista=lista_ok,
            orden=1,
            nombre="Harina",
            denominacion_rotulo="Harina de trigo",
            porcentaje=80.0,
        )
    ]
    falt_ok, tab_ok, mot_ok, comp_ok, pct_ok, tot_ok, c_ok = (
        services.detectar_datos_faltantes_y_tabla(borrador, lista_ok)
    )
    assert comp_ok is True
    assert tab_ok is False
    assert len(falt_ok) == 0
    assert pct_ok == 100
    assert tot_ok == 11
    assert c_ok == 11

    borrador.es_importado = True
    borrador.razon_social_importador = None
    borrador.domicilio_importador = None
    session.commit()
    falt_imp, _, _, comp_imp, pct_imp, tot_imp, ok_imp = (
        services.detectar_datos_faltantes_y_tabla(borrador, lista_ok)
    )
    assert comp_imp is False
    assert tot_imp == 13
    assert any("importador" in f for f in falt_imp)

    borrador.razon_social_importador = "Importadora Patagónica S.A."
    borrador.domicilio_importador = "Ruta 3 km 1400"
    session.commit()
    falt_imp_ok, _, _, comp_imp_ok, pct_imp_ok, tot_imp_ok, ok_imp_ok = (
        services.detectar_datos_faltantes_y_tabla(borrador, lista_ok)
    )
    assert comp_imp_ok is True
    assert pct_imp_ok == 100
    assert tot_imp_ok == 13
    assert ok_imp_ok == 13


def test_generar_filas_tabla_nutricional_y_mapeo(session: Session):
    prod1, user = _crear_prod_y_user_aux(session, "Prod Tabla 4")
    borrador = services.obtener_o_crear_borrador(session, prod1.id)
    borrador.valor_energetico_kcal = 200.0
    borrador.valor_energetico_kj = 840.0
    borrador.carbohidratos = 30.0
    borrador.azucares_totales = 5.0
    borrador.azucares_anadidos = 2.0
    borrador.proteinas = 7.5
    borrador.grasas_totales = 5.5
    borrador.grasas_saturadas = 2.2
    borrador.grasas_trans = 0.0
    borrador.fibra_alimentaria = 2.5
    borrador.sodio = 200.0
    session.commit()

    filas = services.generar_filas_tabla_nutricional(borrador)
    assert len(filas) >= 7
    fila_energia = next(f for f in filas if f.nutriente == "Valor energético")
    assert "200 kcal" in (fila_energia.por_porcion or "")
    assert fila_energia.porcentaje_vd == "10 %"

    resp = services.mapear_respuesta_borrador(borrador, None)
    assert resp.producto_id == prod1.id
    assert resp.leyenda_obligatoria == constants.LEYENDA_BORRADOR_OBLIGATORIA


def test_exportar_borrador_validaciones(session: Session):
    prod1, user = _crear_prod_y_user_aux(session, "Prod Exportar 5")
    req_invalido = schemas.ExportarBorradorRequest(incluir_leyenda=False)
    with pytest.raises(exceptions.ExportacionSinLeyendaError):
        services.exportar_borrador(session, prod1.id, req_invalido)

    req_sin_sellos = schemas.ExportarBorradorRequest(incluir_leyenda=True)
    res_sin_sellos = services.exportar_borrador(session, prod1.id, req_sin_sellos)
    assert res_sin_sellos.leyenda_incluida is True
    assert constants.MENSAJE_SIN_OCTOGONOS in res_sin_sellos.contenido_html

    borrador = services.obtener_o_crear_borrador(session, prod1.id)
    borrador.contiene_edulcorantes = True
    borrador.modo_calculo_octogonos = "manual"
    borrador.tiene_exceso_azucares = True
    session.commit()

    req_con_sellos = schemas.ExportarBorradorRequest(incluir_leyenda=True)
    res = services.exportar_borrador(session, prod1.id, req_con_sellos)
    assert res.leyenda_incluida is True
    assert constants.LEYENDA_BORRADOR_OBLIGATORIA in res.contenido_html
    assert prod1.nombre in res.contenido_html
    assert "CONTIENE EDULCORANTES" in res.contenido_html

    borrador.es_importado = True
    borrador.razon_social_importador = "Importador Patagónico S.A."
    borrador.domicilio_importador = "Ruta 3 km 1400"
    session.commit()
    res_imp = services.exportar_borrador(session, prod1.id, req_con_sellos)
    assert "Importador Patagónico S.A." in res_imp.contenido_html


def test_autocompletar_datos_borrador(session: Session):
    prod, user = _crear_prod_y_user_aux(session, "Prod Auto 1")
    borrador = services.obtener_o_crear_borrador(session, prod.id)
    borrador.lote = "LOTE-MANUAL"
    borrador.lote_editado_manualmente = True
    borrador.denominacion_venta = "Denom Manual"
    borrador.denominacion_editada_manualmente = True
    session.commit()

    borrador_auto = services.autocompletar_datos_borrador(
        session, prod.id, campos=["lote"], usuario=user
    )
    assert borrador_auto.lote_editado_manualmente is False
    assert borrador_auto.denominacion_editada_manualmente is True

    borrador_todo = services.autocompletar_datos_borrador(
        session, prod.id, campos=None, usuario=user
    )
    assert borrador_todo.denominacion_editada_manualmente is False
    assert borrador_todo.denominacion_venta == "Prod Auto 1"


def test_migraciones_tablas_rotulado_en_motor_vacio():
    from sqlalchemy import create_engine, text
    from src.rotulado.migraciones import actualizar_tablas_rotulado

    engine_limpio = create_engine("sqlite:///:memory:")
    actualizar_tablas_rotulado(engine_limpio)

    engine_nuevo = create_engine("sqlite:///:memory:")
    with engine_nuevo.begin() as conn:
        conn.execute(
            text(
                "CREATE TABLE borradores_rotulo (id INTEGER PRIMARY KEY, producto_id INTEGER UNIQUE)"
            )
        )
    actualizar_tablas_rotulado(engine_nuevo)
    actualizar_tablas_rotulado(engine_nuevo)



