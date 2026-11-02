import pytest
from sqlalchemy.orm import Session
from src.documentos.constants import TipoDocumento
from src.documentos.models import Documento
from src.insumos.models import UnidadMedida
from src.producto import exceptions
from src.producto.models import Producto
from src.producto.schemas import ProductoCreate, ProductoUpdate
from src.producto.services import (
    crear_producto,
    editar_producto,
    eliminar_producto,
    listar_productos,
    obtener_producto,
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
      tipo=TipoDocumento.RECETA,
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
      tipo=TipoDocumento.MANUAL_BPM,
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