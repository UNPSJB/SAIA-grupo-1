import pytest
from sqlalchemy.orm import Session
from src.documentos.models import Documento
from src.insumos.models import UnidadMedida
from src.producto import exceptions
from src.producto.models import Producto
from src.producto.schemas import ProductoCreate, ProductoUpdate
from src.producto.services import (
    actualizar_visibilidad_publica,
    listar_productos_publicos,
    crear_producto,
    editar_producto,
    eliminar_producto,
    listar_productos,
    obtener_producto,
    obtener_productos_para_csv,
    restaurar_producto,
)
from tests.database import session


def test_listar_productos(session: Session) -> None:
  # Crear un producto de prueba
  dto = ProductoCreate(
      nombre="Pan de Molde",
      descripcion="Pan de lactal",
      unidadMedida=UnidadMedida.KILOGRAMOS,
  )
  prod = crear_producto(session, dto)

  productos = listar_productos(session)
  assert len(productos) >= 1
  assert any(p.id == prod.id for p in productos)


def test_baja_y_restauracion_producto(session: Session) -> None:
  dto = ProductoCreate(
      nombre="Masa Hoja",
      descripcion="Para empanadas",
      unidadMedida=UnidadMedida.KILOGRAMOS,
  )
  prod = crear_producto(session, dto)
  assert prod.activo is True

  # Baja lógica
  prod_baja = eliminar_producto(session, prod.id)
  assert prod_baja.activo is False

  # Restauración
  prod_restaurado = restaurar_producto(session, prod.id)
  assert prod_restaurado.activo is True


def test_eliminar_producto_inexistente(session: Session) -> None:
  with pytest.raises(exceptions.ProductoNoEncontrado):
    eliminar_producto(session, 9999)


def test_restaurar_producto_inexistente(session: Session) -> None:
  with pytest.raises(exceptions.ProductoNoEncontrado):
    restaurar_producto(session, 9999)


def test_crear_producto_con_receta_valida(session: Session) -> None:
  # Crear un documento de tipo RECETA previo
  receta = Documento(
      titulo="Receta Pan Francés",
      tipo="Receta",
      descripcion="Receta estándar",
      activo=True,
  )
  session.add(receta)
  session.commit()
  session.refresh(receta)

  dto = ProductoCreate(
      nombre="Pan Francés Test",
      descripcion="Barra clásica",
      unidadMedida=UnidadMedida.KILOGRAMOS,
      id_receta=receta.id,
  )
  nuevo = crear_producto(session, dto)

  assert nuevo.id is not None
  assert nuevo.id_receta == receta.id
  assert nuevo.nombre_receta == "Receta Pan Francés"


def test_crear_producto_con_receta_invalida(session: Session) -> None:
  # Crear documento de tipo NO Receta (ej. MANUAL_BPM)
  doc = Documento(
      titulo="Manual de BPM",
      tipo="Manual de BPM",
      descripcion="Manual de planta",
      activo=True,
  )
  session.add(doc)
  session.commit()
  session.refresh(doc)

  dto = ProductoCreate(
      nombre="Producto Fallido",
      descripcion="Prueba error receta",
      unidadMedida=UnidadMedida.UNIDADES,
      id_receta=doc.id,
  )

  with pytest.raises(exceptions.DocumentoNoEsReceta):
    crear_producto(session, dto)


def test_validar_nombre_duplicado(session: Session) -> None:
  dto1 = ProductoCreate(
      nombre="Galletas de Agua",
      descripcion="Caja por 100g",
      unidadMedida=UnidadMedida.GRAMOS,
  )
  crear_producto(session, dto1)

  # Intento de creación con el mismo nombre (variando espacios y mayúsculas)
  dto2 = ProductoCreate(
      nombre="  GALLETAS  de   agua ",
      descripcion="Otra caja",
      unidadMedida=UnidadMedida.GRAMOS,
  )
  with pytest.raises(exceptions.NombreProductoDuplicado):
    crear_producto(session, dto2)


# ---------------------------------------------------------------- visibilidad en la vista publica

def _producto(session: Session, nombre: str) -> Producto:
  return crear_producto(session, ProductoCreate(nombre=nombre, unidadMedida=UnidadMedida.UNIDADES))


def test_producto_nuevo_no_es_visible_en_la_vista_publica(session: Session) -> None:
  prod = _producto(session, "Medialuna")
  assert prod.visible_publico is False
  assert listar_productos_publicos(session) == []


def test_actualizar_visibilidad_muestra_los_elegidos_y_oculta_el_resto(session: Session) -> None:
  pan = _producto(session, "Pan Casero")
  torta = _producto(session, "Torta Negra")
  alfajor = _producto(session, "Alfajor")

  actualizar_visibilidad_publica(session, [pan.id, torta.id])
  assert {p.id for p in listar_productos_publicos(session)} == {pan.id, torta.id}

  # la segunda seleccion reemplaza a la primera
  actualizar_visibilidad_publica(session, [alfajor.id])
  assert [p.id for p in listar_productos_publicos(session)] == [alfajor.id]

  actualizar_visibilidad_publica(session, [])
  assert listar_productos_publicos(session) == []


def test_no_se_puede_mostrar_un_producto_dado_de_baja(session: Session) -> None:
  pan = _producto(session, "Pan Integral")
  torta = _producto(session, "Torta Frita")
  actualizar_visibilidad_publica(session, [pan.id])
  eliminar_producto(session, torta.id)

  with pytest.raises(exceptions.ProductoInactivoNoPublicable):
    actualizar_visibilidad_publica(session, [torta.id])
  # no se cambio nada
  assert [p.id for p in listar_productos_publicos(session)] == [pan.id]


def test_visibilidad_con_producto_inexistente_no_cambia_nada(session: Session) -> None:
  pan = _producto(session, "Pan Dulce")
  actualizar_visibilidad_publica(session, [pan.id])

  with pytest.raises(exceptions.ProductoNoEncontrado):
    actualizar_visibilidad_publica(session, [9999])
  assert [p.id for p in listar_productos_publicos(session)] == [pan.id]


def test_la_baja_oculta_el_producto_y_al_restaurarlo_sigue_oculto(session: Session) -> None:
  pan = _producto(session, "Chipa")
  actualizar_visibilidad_publica(session, [pan.id])

  eliminar_producto(session, pan.id)
  assert obtener_producto(session, pan.id).visible_publico is False
  assert listar_productos_publicos(session) == []

  restaurar_producto(session, pan.id)
  assert obtener_producto(session, pan.id).visible_publico is False


def test_listado_publico_ordenado_por_nombre(session: Session) -> None:
  b = _producto(session, "Bizcochuelo")
  a = _producto(session, "Alfajor de Maicena")
  actualizar_visibilidad_publica(session, [b.id, a.id])
  assert [p.nombre for p in listar_productos_publicos(session)] == ["Alfajor de Maicena", "Bizcochuelo"]


def test_editar_producto_exitoso(session: Session) -> None:
  receta = Documento(titulo="Receta Croissant", tipo="RECETA", descripcion="Desc", activo=True)
  session.add(receta)
  session.commit()
  session.refresh(receta)

  prod = crear_producto(session, ProductoCreate(nombre="Croissant", unidadMedida=UnidadMedida.UNIDADES))
  editado = editar_producto(
      session,
      prod.id,
      ProductoUpdate(nombre="Croissant Frances", descripcion="Con manteca", id_receta=receta.id),
  )
  assert editado.nombre == "Croissant Frances"
  assert editado.descripcion == "Con manteca"
  assert editado.id_receta == receta.id
  assert editado.nombre_receta == "Receta Croissant"


def test_editar_producto_duplicado(session: Session) -> None:
  prod1 = crear_producto(session, ProductoCreate(nombre="Medialuna Manteca", unidadMedida=UnidadMedida.UNIDADES))
  prod2 = crear_producto(session, ProductoCreate(nombre="Medialuna Grasa", unidadMedida=UnidadMedida.UNIDADES))
  with pytest.raises(exceptions.NombreProductoDuplicado):
    editar_producto(session, prod2.id, ProductoUpdate(nombre="Medialuna Manteca"))


def test_editar_producto_inexistente(session: Session) -> None:
  with pytest.raises(exceptions.ProductoNoEncontrado):
    editar_producto(session, 99999, ProductoUpdate(nombre="Inexistente"))


def test_crear_y_editar_producto_receta_inexistente(session: Session) -> None:
  with pytest.raises(exceptions.RecetaNoEncontrada):
    crear_producto(session, ProductoCreate(nombre="Prod Con Receta Falsa", unidadMedida=UnidadMedida.UNIDADES, id_receta=99999))

  prod = crear_producto(session, ProductoCreate(nombre="Prod Sin Receta", unidadMedida=UnidadMedida.UNIDADES))
  with pytest.raises(exceptions.RecetaNoEncontrada):
    editar_producto(session, prod.id, ProductoUpdate(id_receta=99999))


def test_obtener_productos_para_csv(session: Session) -> None:
  receta = Documento(titulo="Receta Baguette", tipo="RECETA", descripcion="Desc", activo=True)
  session.add(receta)
  session.commit()
  session.refresh(receta)

  p1 = crear_producto(session, ProductoCreate(nombre="Baguette Tradicional", descripcion="Pan crocante", unidadMedida=UnidadMedida.UNIDADES, id_receta=receta.id))
  p2 = crear_producto(session, ProductoCreate(nombre="Flauta Simple", descripcion="Pan blanco", unidadMedida=UnidadMedida.UNIDADES))
  eliminar_producto(session, p2.id)

  todos = obtener_productos_para_csv(session)
  assert len(todos) >= 2

  activos = obtener_productos_para_csv(session, activo=True)
  assert any(p["id"] == p1.id for p in activos)
  assert not any(p["id"] == p2.id for p in activos)

  inactivos = obtener_productos_para_csv(session, activo=False)
  assert any(p["id"] == p2.id for p in inactivos)
  assert not any(p["id"] == p1.id for p in inactivos)

  busqueda_receta = obtener_productos_para_csv(session, busqueda="Baguette")
  assert any(p["id"] == p1.id for p in busqueda_receta)
  assert not any(p["id"] == p2.id for p in busqueda_receta)
