from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from src.configuracion import exceptions, schemas
from src.indentificadorDeQR.models import IndentificadorUnico


def _identificador_activo(db: Session) -> Optional[IndentificadorUnico]:
    return db.scalar(select(IndentificadorUnico).where(IndentificadorUnico.estado.is_(True)).limit(1))


def _a_schema(ident: Optional[IndentificadorUnico]) -> schemas.ConfiguracionVistaPublica:
    if ident is None:
        return schemas.ConfiguracionVistaPublica(habilitada=False)
    return schemas.ConfiguracionVistaPublica(
        habilitada=True,
        id_alfanumerico=ident.id_alfanumerico,
        urldelQR=ident.urldelQR,
        ver_grafico=ident.ver_grafico,
        verAcercaDeNosotros=ident.verAcercaDeNosotros,
        verProductos=ident.verProductos,
        ver_dias_sin_incidentes=getattr(ident, "ver_dias_sin_incidentes", False),
        ver_total_lotes=getattr(ident, "ver_total_lotes", False),
        ver_volumen_fabricado=getattr(ident, "ver_volumen_fabricado", False),
        ver_producto_mas_elaborado=getattr(ident, "ver_producto_mas_elaborado", False),
        ver_grafico_totales_productos=getattr(ident, "ver_grafico_totales_productos", False),
        ver_grafico_red_arana=getattr(ident, "ver_grafico_red_arana", False),
    )


def obtener_vista_publica(db: Session) -> schemas.ConfiguracionVistaPublica:
    return _a_schema(_identificador_activo(db))


def actualizar_vista_publica(
    db: Session, cambios: schemas.ConfiguracionVistaPublicaUpdate
) -> schemas.ConfiguracionVistaPublica:
    ident = _identificador_activo(db)
    if ident is None:
        raise exceptions.VistaPublicaNoHabilitada()

    if cambios.ver_grafico is not None:
        ident.ver_grafico = cambios.ver_grafico
    if cambios.verAcercaDeNosotros is not None:
        ident.verAcercaDeNosotros = cambios.verAcercaDeNosotros
    if cambios.verProductos is not None:
        ident.verProductos = cambios.verProductos
    if cambios.ver_dias_sin_incidentes is not None:
        ident.ver_dias_sin_incidentes = cambios.ver_dias_sin_incidentes
    if cambios.ver_total_lotes is not None:
        ident.ver_total_lotes = cambios.ver_total_lotes
    if cambios.ver_volumen_fabricado is not None:
        ident.ver_volumen_fabricado = cambios.ver_volumen_fabricado
    if cambios.ver_producto_mas_elaborado is not None:
        ident.ver_producto_mas_elaborado = cambios.ver_producto_mas_elaborado
    if cambios.ver_grafico_totales_productos is not None:
        ident.ver_grafico_totales_productos = cambios.ver_grafico_totales_productos
    if cambios.ver_grafico_red_arana is not None:
        ident.ver_grafico_red_arana = cambios.ver_grafico_red_arana
    if cambios.habilitada is False:
        # se deshabilitan todas, por si quedaron varias activas de antes
        db.execute(update(IndentificadorUnico).where(IndentificadorUnico.estado.is_(True)).values(estado=False))

    db.commit()
    db.refresh(ident)
    return _a_schema(ident if ident.estado else None)
