from datetime import date, timedelta
from typing import Any
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from src.insumos.exceptions import InsumoNoEncontrado
from src.insumos.models import Insumo, UnidadMedida
from src.produccion import exceptions, schemas, services
from src.produccion.models import InsumoLote, LoteProduccion, Producto
from tests.database import session  # noqa: F401  (session es una fixture)

LEGAJO = 1  # Juan Perez, el del seed de tests
# ids de los insumos del seed de tests: 80 kg de harina, 35 l de aceite y 1500 g de levadura
HARINA, ACEITE, LEVADURA = 1, 2, 3


def _datos(**cambios: Any) -> schemas.LoteProduccionCreate:
    base: dict[str, Any] = dict(
        producto_nombre="Pan lactal",
        fecha=date.today(),
        cantidad=120.5,
        unidad_medida=UnidadMedida.KILOGRAMOS,
    )
    base.update(cambios)
    return schemas.LoteProduccionCreate(**base)


def _cantidad_de(db: Session, modelo: type) -> int:
    return db.scalar(select(func.count()).select_from(modelo))


# ------------------------------------------------------------------ registro


def test_registrar_lote_con_producto_nuevo(session: Session) -> None:
    lote = services.registrar_lote(session, LEGAJO, _datos())

    assert lote.id is not None
    assert lote.producto.nombre == "Pan lactal"
    assert lote.fecha == date.today()
    assert lote.cantidad == 120.5
    assert lote.unidad_medida == UnidadMedida.KILOGRAMOS
    assert lote.responsable_legajo == LEGAJO
    assert lote.nombre_responsable == "Juan Perez"
    assert _cantidad_de(session, Producto) == 1


def test_registrar_lote_con_producto_existente(session: Session) -> None:
    producto = services.obtener_o_crear_producto(session, "Galletitas")
    session.commit()

    lote = services.registrar_lote(session, LEGAJO, _datos(producto_nombre=None, producto_id=producto.id))

    assert lote.producto_id == producto.id
    assert _cantidad_de(session, Producto) == 1


def test_producto_repetido_con_otras_mayusculas_y_espacios_se_reutiliza(session: Session) -> None:
    primero = services.registrar_lote(session, LEGAJO, _datos(producto_nombre="Pan Lactal"))
    segundo = services.registrar_lote(session, LEGAJO, _datos(producto_nombre="  pan   LACTAL "))

    assert segundo.producto_id == primero.producto_id
    assert _cantidad_de(session, Producto) == 1
    assert primero.producto.nombre == "Pan Lactal"


def test_producto_inexistente(session: Session) -> None:
    with pytest.raises(exceptions.ProductoNoEncontrado):
        services.registrar_lote(session, LEGAJO, _datos(producto_nombre=None, producto_id=999))
    assert _cantidad_de(session, LoteProduccion) == 0


def test_se_puede_registrar_con_fecha_pasada(session: Session) -> None:
    fecha = date.today() - timedelta(days=400)
    lote = services.registrar_lote(session, LEGAJO, _datos(fecha=fecha))
    assert lote.fecha == fecha


# ------------------------------------------------------------------ validaciones


def test_no_se_permite_lote_sin_producto() -> None:
    with pytest.raises(exceptions.ProductoRequerido):
        _datos(producto_nombre=None)


def test_no_se_permite_producto_existente_y_nuevo_a_la_vez() -> None:
    with pytest.raises(exceptions.ProductoAmbiguo):
        _datos(producto_id=1)


@pytest.mark.parametrize("nombre", ["", "   "])
def test_nombre_de_producto_vacio(nombre: str) -> None:
    with pytest.raises(exceptions.NombreProductoVacio):
        _datos(producto_nombre=nombre)


def test_nombre_de_producto_demasiado_largo() -> None:
    with pytest.raises(exceptions.NombreProductoDemasiadoLargo):
        _datos(producto_nombre="x" * 101)


@pytest.mark.parametrize("campo", ["fecha", "cantidad", "unidad_medida"])
def test_no_se_permite_lote_sin_fecha_cantidad_o_unidad(campo: str) -> None:
    datos = dict(producto_nombre="Pan", fecha=date.today(), cantidad=1, unidad_medida="kilogramos")
    del datos[campo]
    with pytest.raises(Exception) as error:
        schemas.LoteProduccionCreate(**datos)
    assert campo in str(error.value)


@pytest.mark.parametrize("cantidad", [0, -1, -0.01])
def test_la_cantidad_debe_ser_mayor_a_cero(cantidad: float) -> None:
    with pytest.raises(exceptions.CantidadInvalida):
        _datos(cantidad=cantidad)


def test_la_fecha_no_puede_ser_futura() -> None:
    with pytest.raises(exceptions.FechaLoteInvalida):
        _datos(fecha=date.today() + timedelta(days=1))


# ------------------------------------------------------------------ codigo


def test_codigo_con_fecha_del_lote_y_correlativo_del_dia(session: Session) -> None:
    fecha = date(2026, 10, 22)
    codigos = [services.registrar_lote(session, LEGAJO, _datos(fecha=fecha)).codigo for _ in range(3)]
    assert codigos == ["L-20261022-01", "L-20261022-02", "L-20261022-03"]


def test_el_correlativo_se_reinicia_cada_dia_y_usa_la_fecha_del_lote(session: Session) -> None:
    a = services.registrar_lote(session, LEGAJO, _datos(fecha=date(2026, 10, 22)))
    b = services.registrar_lote(session, LEGAJO, _datos(fecha=date(2026, 10, 21)))
    c = services.registrar_lote(session, LEGAJO, _datos(fecha=date(2026, 10, 22)))
    assert (a.codigo, b.codigo, c.codigo) == ("L-20261022-01", "L-20261021-01", "L-20261022-02")


def test_el_correlativo_pasa_de_99_sin_romper_el_orden(session: Session) -> None:
    fecha = date(2026, 10, 22)
    producto = services.obtener_o_crear_producto(session, "Pan")
    for n in range(1, 100):
        session.add(LoteProduccion(codigo=f"L-20261022-{n:02d}", producto_id=producto.id, fecha=fecha,
                                   cantidad=1, unidad_medida=UnidadMedida.UNIDADES, responsable_legajo=LEGAJO))
    session.commit()

    assert services.registrar_lote(session, LEGAJO, _datos(fecha=fecha)).codigo == "L-20261022-100"


def test_si_el_codigo_se_repite_se_reintenta(session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    existente = services.registrar_lote(session, LEGAJO, _datos())
    reales = services._siguiente_codigo
    llamadas = []

    def con_un_choque(db: Session, fecha: date) -> str:
        llamadas.append(fecha)
        return existente.codigo if len(llamadas) == 1 else reales(db, fecha)

    monkeypatch.setattr(services, "_siguiente_codigo", con_un_choque)
    lote = services.registrar_lote(session, LEGAJO, _datos())

    assert len(llamadas) == 2
    assert lote.codigo != existente.codigo


def test_si_nunca_se_genera_un_codigo_no_queda_nada_guardado(session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    existente = services.registrar_lote(session, LEGAJO, _datos(producto_nombre="Pan"))
    monkeypatch.setattr(services, "_siguiente_codigo", lambda db, fecha: existente.codigo)

    with pytest.raises(exceptions.CodigoLoteNoGenerado):
        services.registrar_lote(session, LEGAJO, _datos(producto_nombre="Producto nuevo"))

    # el producto nuevo se descarta junto con el lote: no queda un producto huérfano
    assert _cantidad_de(session, LoteProduccion) == 1
    assert [p.nombre for p in services.listar_productos(session)] == ["Pan"]


# ------------------------------------------------------------------ consultas


def test_leer_lote(session: Session) -> None:
    lote = services.registrar_lote(session, LEGAJO, _datos())
    assert services.leer_lote(session, lote.id).codigo == lote.codigo
    with pytest.raises(exceptions.LoteNoEncontrado):
        services.leer_lote(session, 999)


def test_listar_productos_ordenados_por_nombre(session: Session) -> None:
    for nombre in ["Tarta", "alfajor", "Budín"]:
        services.obtener_o_crear_producto(session, nombre)
    session.commit()
    assert [p.nombre for p in services.listar_productos(session)] == ["alfajor", "Budín", "Tarta"]


def test_listar_lotes_del_mas_reciente_al_mas_antiguo(session: Session) -> None:
    hoy = date.today()
    viejo = services.registrar_lote(session, LEGAJO, _datos(fecha=hoy - timedelta(days=5)))
    nuevo = services.registrar_lote(session, LEGAJO, _datos(fecha=hoy))
    medio = services.registrar_lote(session, LEGAJO, _datos(fecha=hoy - timedelta(days=2)))

    assert [l.id for l in services.listar_lotes(session)] == [nuevo.id, medio.id, viejo.id]


def test_listar_lotes_filtra_por_producto_y_fechas(session: Session) -> None:
    hoy = date.today()
    pan = services.registrar_lote(session, LEGAJO, _datos(producto_nombre="Pan", fecha=hoy - timedelta(days=10)))
    pan_hoy = services.registrar_lote(session, LEGAJO, _datos(producto_nombre="Pan", fecha=hoy))
    tarta = services.registrar_lote(session, LEGAJO, _datos(producto_nombre="Tarta", fecha=hoy))

    assert {l.id for l in services.listar_lotes(session, producto_id=pan.producto_id)} == {pan.id, pan_hoy.id}
    assert {l.id for l in services.listar_lotes(session, desde=hoy - timedelta(days=1))} == {pan_hoy.id, tarta.id}
    assert {l.id for l in services.listar_lotes(session, hasta=hoy - timedelta(days=1))} == {pan.id}


def test_listar_lotes_con_rango_de_fechas_invalido(session: Session) -> None:
    hoy = date.today()
    with pytest.raises(exceptions.RangoFechasInvalido):
        services.listar_lotes(session, desde=hoy, hasta=hoy - timedelta(days=1))


# ------------------------------------------------------------------ insumos del lote


def _insumos(*pares: tuple) -> schemas.AsociarInsumos:
    return schemas.AsociarInsumos(insumos=[{"insumo_id": i, "cantidad": c} for i, c in pares])


def _stock(db: Session, insumo_id: int) -> float:
    db.expire_all()
    return db.get(Insumo, insumo_id).stock


def test_asociar_insumos_descuenta_el_stock(session: Session) -> None:
    lote = services.registrar_lote(session, LEGAJO, _datos())

    lote = services.asociar_insumos(session, lote.id, _insumos((HARINA, 30), (LEVADURA, 250.5)))

    assert [(i.insumo.nombre, i.insumo.lote, i.cantidad) for i in lote.insumos] == [
        ("Harina de Trigo 000", "ING-HAR-001", 30),
        ("Levadura Fresca", "ING-LEV-003", 250.5),
    ]
    assert _stock(session, HARINA) == 50
    assert _stock(session, LEVADURA) == 1249.5


def test_se_pueden_agregar_insumos_en_varias_veces(session: Session) -> None:
    lote = services.registrar_lote(session, LEGAJO, _datos())
    services.asociar_insumos(session, lote.id, _insumos((HARINA, 10)))
    services.asociar_insumos(session, lote.id, _insumos((ACEITE, 5)))

    assert [i.insumo_id for i in services.leer_lote(session, lote.id).insumos] == [HARINA, ACEITE]


def test_se_puede_usar_todo_el_stock(session: Session) -> None:
    lote = services.registrar_lote(session, LEGAJO, _datos())
    services.asociar_insumos(session, lote.id, _insumos((ACEITE, 35)))

    assert _stock(session, ACEITE) == 0
    assert ACEITE not in [i.id for i in services.listar_insumos_disponibles(session)]


def test_el_mismo_insumo_puede_usarse_en_lotes_distintos(session: Session) -> None:
    uno = services.registrar_lote(session, LEGAJO, _datos())
    otro = services.registrar_lote(session, LEGAJO, _datos())
    services.asociar_insumos(session, uno.id, _insumos((HARINA, 10)))
    services.asociar_insumos(session, otro.id, _insumos((HARINA, 10)))

    assert _stock(session, HARINA) == 60


def test_no_se_puede_asociar_un_insumo_ya_asociado(session: Session) -> None:
    lote = services.registrar_lote(session, LEGAJO, _datos())
    services.asociar_insumos(session, lote.id, _insumos((HARINA, 10)))

    with pytest.raises(exceptions.InsumoYaAsociado):
        services.asociar_insumos(session, lote.id, _insumos((HARINA, 5)))
    assert _stock(session, HARINA) == 70


def test_no_se_puede_usar_mas_que_el_stock(session: Session) -> None:
    lote = services.registrar_lote(session, LEGAJO, _datos())
    with pytest.raises(exceptions.StockInsuficiente):
        services.asociar_insumos(session, lote.id, _insumos((ACEITE, 35.01)))
    assert _stock(session, ACEITE) == 35


@pytest.mark.parametrize(
    "error, pares",
    [
        (exceptions.StockInsuficiente, ((HARINA, 10), (ACEITE, 999))),
        (InsumoNoEncontrado, ((HARINA, 10), (999, 1))),
    ],
)
def test_si_un_insumo_falla_no_se_guarda_ninguno(session: Session, error: type, pares: tuple) -> None:
    lote = services.registrar_lote(session, LEGAJO, _datos())

    with pytest.raises(error):
        services.asociar_insumos(session, lote.id, _insumos(*pares))

    # la harina, que sí era válida, tampoco se descuenta
    assert _stock(session, HARINA) == 80
    assert _cantidad_de(session, InsumoLote) == 0


def test_asociar_insumos_a_un_lote_inexistente(session: Session) -> None:
    with pytest.raises(exceptions.LoteNoEncontrado):
        services.asociar_insumos(session, 999, _insumos((HARINA, 1)))


def test_quitar_insumo_devuelve_el_stock(session: Session) -> None:
    lote = services.registrar_lote(session, LEGAJO, _datos())
    services.asociar_insumos(session, lote.id, _insumos((HARINA, 30), (ACEITE, 5)))

    lote = services.quitar_insumo(session, lote.id, HARINA)

    assert [i.insumo_id for i in lote.insumos] == [ACEITE]
    assert _stock(session, HARINA) == 80
    assert _cantidad_de(session, InsumoLote) == 1
    # una vez quitado se puede volver a asociar
    services.asociar_insumos(session, lote.id, _insumos((HARINA, 1)))


def test_quitar_un_insumo_no_asociado(session: Session) -> None:
    lote = services.registrar_lote(session, LEGAJO, _datos())
    with pytest.raises(exceptions.InsumoNoAsociado):
        services.quitar_insumo(session, lote.id, HARINA)
    with pytest.raises(exceptions.LoteNoEncontrado):
        services.quitar_insumo(session, 999, HARINA)


def test_listar_insumos_disponibles_ordenados_por_nombre(session: Session) -> None:
    nombres = [i.nombre for i in services.listar_insumos_disponibles(session)]
    assert nombres == ["Aceite de Girasol", "Harina de Trigo 000", "Levadura Fresca"]


@pytest.mark.parametrize("cantidad", [0, -1, -0.01])
def test_la_cantidad_del_insumo_debe_ser_mayor_a_cero(cantidad: float) -> None:
    with pytest.raises(exceptions.CantidadInsumoInvalida):
        _insumos((HARINA, cantidad))


def test_no_se_permite_insumo_sin_cantidad() -> None:
    with pytest.raises(Exception) as error:
        schemas.AsociarInsumos(insumos=[{"insumo_id": HARINA}])
    assert "cantidad" in str(error.value)


def test_hay_que_indicar_al_menos_un_insumo() -> None:
    with pytest.raises(exceptions.InsumosRequeridos):
        _insumos()


def test_no_se_permite_el_mismo_insumo_dos_veces_en_el_pedido() -> None:
    with pytest.raises(exceptions.InsumoRepetido):
        _insumos((HARINA, 1), (HARINA, 2))
