from typing import Optional

from sqlalchemy import select
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
    if cambios.habilitada is False:
        ident.estado = False

    db.commit()
    db.refresh(ident)
    return _a_schema(ident if ident.estado else None)
