import json
from datetime import date, timedelta
from typing import Tuple

from sqlalchemy.orm import Session

from src.checklist import services as checklist_services
from src.checklist.models import EstadoTareaItem
from src.dashboard import schemas


def _rango_periodo(periodo: schemas.Periodo, hoy: date) -> Tuple[date, date]:
    dias = 7 if periodo == "semana" else 30
    return hoy - timedelta(days=dias), hoy


def _resumen_checklists(checklists) -> schemas.CumplimientoResumen:
    hechas = sum(c.tareas_completadas for c in checklists)
    total = sum(c.total_tareas for c in checklists)
    pendientes = total - hechas
    porcentaje = round((hechas / total) * 100.0, 1) if total > 0 else 0.0
    return schemas.CumplimientoResumen(hechas=hechas, pendientes=pendientes, porcentaje=porcentaje)


def obtener_cumplimiento_actual(db: Session, periodo: schemas.Periodo, hoy: date | None = None) -> schemas.CumplimientoResumen:
    hoy = hoy or date.today()
    desde, hasta = _rango_periodo(periodo, hoy)
    checklists = checklist_services.listar_checklists(db, fecha_desde=desde, fecha_hasta=hasta)
    return _resumen_checklists(checklists)


def obtener_consumo_insumos(db: Session, periodo: schemas.Periodo, hoy: date | None = None, limite: int = 8) -> list[schemas.ConsumoInsumo]:
    hoy = hoy or date.today()
    desde, hasta = _rango_periodo(periodo, hoy)
    checklists = checklist_services.listar_checklists(db, fecha_desde=desde, fecha_hasta=hasta)

    acumulado: dict[str, dict] = {}
    for c in checklists:
        for item in c.items:
            if item.estado != EstadoTareaItem.REALIZADO or not item.insumos_utilizados:
                continue
            try:
                usados = json.loads(item.insumos_utilizados)
            except (TypeError, ValueError):
                continue
            for u in usados:
                nombre = str(u.get("nombre", "")).strip()
                if not nombre:
                    continue
                clave = nombre.lower()
                cantidad = float(u.get("cantidad") or 0)
                unidad = str(u.get("unidad") or "unidades")
                if clave not in acumulado:
                    acumulado[clave] = {"nombre": nombre, "cantidad": 0.0, "unidad": unidad}
                acumulado[clave]["cantidad"] += cantidad

    consumo = sorted(acumulado.values(), key=lambda x: x["cantidad"], reverse=True)[:limite]
    return [schemas.ConsumoInsumo(**c) for c in consumo]


def obtener_resumen(db: Session, periodo: schemas.Periodo = "semana") -> schemas.DashboardResumen:
    return schemas.DashboardResumen(
        cumplimiento_actual=obtener_cumplimiento_actual(db, periodo),
        consumo_insumos=obtener_consumo_insumos(db, periodo),
    )
