from datetime import datetime, timedelta
from typing import Any, Dict, Optional
import uuid
from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from src.indentificadorDeQR.models import IndentificadorUnico
from src.indentificadorDeQR import schemas, exceptions
from src.incidentes.models import Incidente
from src.categorias_incidentes.models import CategoriaIncidente
from src.produccion.models import LoteProduccion
from src.producto import services as producto_services
from src.dashboard import services as dashboard_services
from src.tareas.models import Tarea



def crear_IdentificadorUnico(db:Session,ident:schemas.IdentificadorQRCreate,urldelQR:str = "") -> schemas.IdentificadorQR:
    datos = ident.model_dump()

    datos["id_alfanumerico"]=str(uuid.uuid4())
    datos["estado"]=True
    datos["urldelQR"]=urldelQR or datos.get("urldelQR", "")
    if "ver_grafico" not in datos or datos["ver_grafico"] is None:
        datos["ver_grafico"] = False
    if "verAcercaDeNosotros" not in datos or datos["verAcercaDeNosotros"] is None:
            datos["verAcercaDeNosotros"] = False
    # el listado de productos arranca desactivado
    if datos.get("verProductos") is None:
        datos["verProductos"] = False
    for campo_extra in [
        "ver_dias_sin_incidentes",
        "ver_total_lotes",
        "ver_volumen_fabricado",
        "ver_producto_mas_elaborado",
        "ver_grafico_totales_productos",
        "ver_grafico_red_arana",
    ]:
        if datos.get(campo_extra) is None:
            datos[campo_extra] = False
    # solo puede haber una vista pública habilitada: el QR nuevo reemplaza a los anteriores
    db.execute(update(IndentificadorUnico).where(IndentificadorUnico.estado.is_(True)).values(estado=False))
    _ident=IndentificadorUnico(**datos)
    db.add(_ident)
    db.commit()
    db.refresh(_ident)
    return _ident



def verificar_identificadorQR(db:Session,identificador_id:str) -> schemas.IdentificadorQR:
    db_identQR = db.scalar(select(IndentificadorUnico).where(IndentificadorUnico.id_alfanumerico == identificador_id))
    if not db_identQR:
        raise HTTPException(status_code=404, detail="El código QR no existe")
    if db_identQR.estado is False:
            raise exceptions.CodigoQRInHabilitado()
    return db_identQR


def editar_identificadorQr(db:Session,identificador_id:str)-> schemas.IdentificadorQR:
     db_identQR = db.scalar(select(IndentificadorUnico).where(IndentificadorUnico.id_alfanumerico == identificador_id))
     if not db_identQR:
         raise HTTPException(status_code=404, detail="El código QR no existe")

     db_identQR.estado=False

     db.commit()
     db.refresh(db_identQR)
     return db_identQR

def actualizar_ver_grafico(db: Session, identificador_id: str, ident: schemas.IdentifacadorQRUpdate) -> schemas.IdentificadorQR:
    db_identQR = db.scalar(select(IndentificadorUnico).where(IndentificadorUnico.id_alfanumerico == identificador_id))
    
    if not db_identQR:
        raise HTTPException(status_code=404, detail="El código QR no existe")

    # Si viene el valor de ver_grafico, lo actualizamos
    if ident.ver_grafico is not None:
        db_identQR.ver_grafico = ident.ver_grafico

    db.commit()
    db.refresh(db_identQR)
    return db_identQR

def actualizar_ver_acercaDeNosotros(db: Session, identificador_id: str, ident: schemas.IdentifacadorQRUpdate) -> schemas.IdentificadorQR:
    db_identQR = db.scalar(select(IndentificadorUnico).where(IndentificadorUnico.id_alfanumerico == identificador_id))
    
    if not db_identQR:
        raise HTTPException(status_code=404, detail="El código QR no existe")

    
    if ident.verAcercaDeNosotros is not None:
        db_identQR.verAcercaDeNosotros = ident.verAcercaDeNosotros

    db.commit()
    db.refresh(db_identQR)
    return db_identQR

def actualizar_ver_productos(db: Session, identificador_id: str, ident: schemas.IdentifacadorQRUpdate) -> schemas.IdentificadorQR:
    db_identQR = db.scalar(select(IndentificadorUnico).where(IndentificadorUnico.id_alfanumerico == identificador_id))

    if not db_identQR:
        raise HTTPException(status_code=404, detail="El código QR no existe")

    if ident.verProductos is not None:
        db_identQR.verProductos = ident.verProductos

    db.commit()
    db.refresh(db_identQR)
    return db_identQR


def listar_productos_publicos(db: Session, identificador_id: str):
    """Catalogo que ve cualquiera con el QR: vacio si el administrador no habilito la seccion."""
    db_identQR = verificar_identificadorQR(db, identificador_id)
    if not db_identQR.verProductos:
        return []
    return producto_services.listar_productos_publicos(db)


def obtener_estadisticas_publicas(db: Session, identificador_id: str) -> Dict[str, Any]:
    verificar_identificadorQR(db, identificador_id)

    ultimo_incidente = db.scalar(
        select(Incidente.creado_el).order_by(Incidente.creado_el.desc()).limit(1)
    )
    if ultimo_incidente is not None:
        dias_sin_incidentes = max(0, (datetime.now().date() - ultimo_incidente.date()).days)
    else:
        dias_sin_incidentes = None

    hoy = datetime.now().date()
    desde_7d = hoy - timedelta(days=6)
    lotes = db.scalars(
        select(LoteProduccion)
        .where(LoteProduccion.fecha >= desde_7d, LoteProduccion.fecha <= hoy)
    ).all()
    total_lotes = len(lotes)

    agrupados_prod: Dict[int, Dict[str, Any]] = {}
    for l in lotes:
        p = l.producto
        if p:
            unidad_raw = getattr(p, "unidadMedida", None)
            unidad_str = str(unidad_raw.value if hasattr(unidad_raw, "value") else unidad_raw or "kilogramos")
            if p.id not in agrupados_prod:
                agrupados_prod[p.id] = {
                    "id": p.id,
                    "nombre": p.nombre,
                    "cantidad": 0.0,
                    "lotes": 0,
                    "unidad": unidad_str,
                }
            agrupados_prod[p.id]["cantidad"] = round(agrupados_prod[p.id]["cantidad"] + float(l.cantidad), 2)
            agrupados_prod[p.id]["lotes"] += 1

    totales_productos = sorted(agrupados_prod.values(), key=lambda x: x["cantidad"], reverse=True)
    producto_mas_elaborado = totales_productos[0] if totales_productos else None
    unidad_volumen = producto_mas_elaborado["unidad"] if producto_mas_elaborado else "kilogramos"
    volumen_fabricado = round(
        sum(float(item["cantidad"]) for item in totales_productos if item["unidad"] == unidad_volumen),
        2,
    )

    cumplimiento_detallado = dashboard_services.obtener_cumplimiento_detallado(db)
    red_arana_cumplimiento = [
        {
            "dimension": item.nombre,
            "porcentaje": round(item.porcentaje, 1),
            "meta": 80,
            "tareas_completadas": item.tareas_completadas,
            "total_tareas": item.total_tareas,
        }
        for item in cumplimiento_detallado.desglose_por_sector
    ]

    return {
        "dias_sin_incidentes": dias_sin_incidentes,
        "total_lotes": total_lotes,
        "volumen_fabricado": volumen_fabricado,
        "unidad_volumen": unidad_volumen,
        "producto_mas_elaborado": producto_mas_elaborado,
        "totales_productos": totales_productos,
        "red_arana_cumplimiento": red_arana_cumplimiento,
    }
