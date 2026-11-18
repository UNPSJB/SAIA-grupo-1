from datetime import datetime, timedelta, timezone
import json
import logging
import os
from pathlib import Path
import threading
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from src.AcercaDeNostros.models import AcercaDeNosotros
from src.indentificadorDeQR.models import IndentificadorUnico

logger = logging.getLogger(__name__)

SNAPSHOT_DIR = Path(__file__).resolve().parent / "archivos"
SNAPSHOT_FILE = SNAPSHOT_DIR / "vista_publica.json"
_SNAPSHOT_LOCK = threading.Lock()


def _sanitizar_estadisticas(
    estadisticas_crudas: Dict[str, Any],
    config_publica: Dict[str, bool],
) -> Dict[str, Any]:
    return {
        "dias_sin_incidentes": (
            estadisticas_crudas.get("dias_sin_incidentes")
            if config_publica["ver_dias_sin_incidentes"]
            else None
        ),
        "total_lotes": (
            int(estadisticas_crudas.get("total_lotes") or 0)
            if config_publica["ver_total_lotes"]
            else 0
        ),
        "volumen_fabricado": (
            float(estadisticas_crudas.get("volumen_fabricado") or 0.0)
            if config_publica["ver_volumen_fabricado"]
            else 0.0
        ),
        "unidad_volumen": (
            str(estadisticas_crudas.get("unidad_volumen") or "kilogramos")
            if config_publica["ver_volumen_fabricado"]
            else "kilogramos"
        ),
        "producto_mas_elaborado": (
            estadisticas_crudas.get("producto_mas_elaborado")
            if config_publica["ver_producto_mas_elaborado"]
            else None
        ),
        "totales_productos": (
            list(estadisticas_crudas.get("totales_productos") or [])
            if config_publica["ver_grafico_totales_productos"]
            else []
        ),
        "red_arana_cumplimiento": (
            list(estadisticas_crudas.get("red_arana_cumplimiento") or [])
            if config_publica["ver_grafico_red_arana"]
            else []
        ),
    }


def _construir_cumplimiento_limpieza(db: Session) -> Dict[str, Any]:
    from src.dashboard import services as dashboard_services

    hoy = datetime.now().date()
    resultado: Dict[str, Any] = {}
    for dias in (7, 14, 30, 90):
        desde = hoy - timedelta(days=dias)
        for agrupacion in ("dia", "semana"):
            clave = f"{dias}_{agrupacion}"
            grafico = dashboard_services.obtener_grafico_cumplimiento(
                db,
                desde=desde,
                hasta=hoy,
                agrupacion=agrupacion,
                hoy=hoy,
            )
            resultado[clave] = {
                "total_checklists": int(grafico.total_checklists),
                "total_tareas": int(grafico.total_tareas),
                "tareas_completadas": int(grafico.tareas_completadas),
                "promedio_cumplimiento": float(grafico.promedio_cumplimiento),
                "puntos": [
                    {
                        "etiqueta": str(p.etiqueta),
                        "porcentaje": float(p.porcentaje),
                        "tareas_completadas": int(p.tareas_completadas),
                        "tareas_pendientes": int(p.tareas_pendientes),
                        "total_tareas": int(p.total_tareas),
                        "total_checklists": int(p.total_checklists),
                    }
                    for p in grafico.puntos
                ],
            }
    return resultado


def construir_snapshot_vista_publica(db: Session) -> Dict[str, Any]:
    from src.indentificadorDeQR import services as qr_services

    ident = db.scalar(
        select(IndentificadorUnico).where(IndentificadorUnico.estado.is_(True)).limit(1)
    )
    generado_el = datetime.now(timezone.utc).isoformat()

    if ident is None:
        return {
            "generado_el": generado_el,
            "qr": None,
            "estadisticas": None,
            "cumplimiento_limpieza": {},
            "acerca_de_nosotros": None,
            "productos": [],
        }

    config_publica: Dict[str, bool] = {
        "ver_grafico": bool(ident.ver_grafico),
        "verAcercaDeNosotros": bool(ident.verAcercaDeNosotros),
        "verProductos": bool(ident.verProductos),
        "ver_dias_sin_incidentes": bool(getattr(ident, "ver_dias_sin_incidentes", False)),
        "ver_total_lotes": bool(getattr(ident, "ver_total_lotes", False)),
        "ver_volumen_fabricado": bool(getattr(ident, "ver_volumen_fabricado", False)),
        "ver_producto_mas_elaborado": bool(getattr(ident, "ver_producto_mas_elaborado", False)),
        "ver_grafico_totales_productos": bool(getattr(ident, "ver_grafico_totales_productos", False)),
        "ver_grafico_red_arana": bool(getattr(ident, "ver_grafico_red_arana", False)),
    }

    estadisticas_crudas = qr_services.obtener_estadisticas_publicas(db, ident.id_alfanumerico)
    estadisticas = _sanitizar_estadisticas(estadisticas_crudas, config_publica)

    cumplimiento_limpieza = (
        _construir_cumplimiento_limpieza(db)
        if config_publica["ver_grafico"]
        else {}
    )

    acerca_publico: Optional[Dict[str, str]] = None
    if config_publica["verAcercaDeNosotros"]:
        acerca = db.query(AcercaDeNosotros).first()
        if acerca and acerca.descripcion:
            acerca_publico = {"descripcion": str(acerca.descripcion)}

    productos_publicos: List[Dict[str, Any]] = []
    if config_publica["verProductos"]:
        from src.producto import services as producto_services

        productos = producto_services.listar_productos_publicos(db)
        productos_publicos = [
            {
                "id": int(p.id),
                "nombre": str(p.nombre),
                "descripcion": str(p.descripcion) if p.descripcion is not None else None,
            }
            for p in productos
        ]

    return {
        "generado_el": generado_el,
        "qr": {
            "id_alfanumerico": str(ident.id_alfanumerico),
            "estado": True,
            "config": config_publica,
        },
        "estadisticas": estadisticas,
        "cumplimiento_limpieza": cumplimiento_limpieza,
        "acerca_de_nosotros": acerca_publico,
        "productos": productos_publicos,
    }


def escribir_snapshot_vista_publica(
    payload: Dict[str, Any],
    snapshot_path: Optional[Path] = None,
) -> Path:
    destino = snapshot_path or SNAPSHOT_FILE
    destino.parent.mkdir(parents=True, exist_ok=True)
    contenido = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    tmp_path = destino.with_suffix(".json.tmp")
    with _SNAPSHOT_LOCK:
        tmp_path.write_text(contenido, encoding="utf-8")
        os.replace(tmp_path, destino)
    return destino


def regenerar_snapshot_vista_publica(
    db: Session,
    snapshot_path: Optional[Path] = None,
) -> Dict[str, Any]:
    payload = construir_snapshot_vista_publica(db)
    escribir_snapshot_vista_publica(payload, snapshot_path=snapshot_path)
    return payload


def regenerar_snapshot_seguro(
    db: Session,
    snapshot_path: Optional[Path] = None,
) -> None:
    try:
        regenerar_snapshot_vista_publica(db, snapshot_path=snapshot_path)
    except Exception:
        logger.exception("Error al regenerar el snapshot estático de la vista pública")


def leer_snapshot_vista_publica(snapshot_path: Optional[Path] = None) -> Optional[str]:
    origen = snapshot_path or SNAPSHOT_FILE
    if not origen.is_file():
        return None
    try:
        return origen.read_text(encoding="utf-8")
    except OSError:
        logger.exception("Error al leer el snapshot estático de la vista pública")
        return None
