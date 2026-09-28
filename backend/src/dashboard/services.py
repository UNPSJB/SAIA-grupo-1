import json
from datetime import date, timedelta
from typing import Tuple

from sqlalchemy.orm import Session

from src.checklist import services as checklist_services
from src.checklist.models import DIAS_POR_FRECUENCIA, EstadoTareaItem
from src.dashboard import schemas


def _rango_periodo(periodo: str, hoy: date) -> Tuple[date, date]:
    p = str(periodo).lower()
    if p in ("dia", "diaria", "diario"):
        return hoy, hoy
    elif p in ("mes", "mensual"):
        return hoy - timedelta(days=30), hoy
    else:  # semana, semanal o default
        return hoy - timedelta(days=7), hoy


def _resumen_checklists(checklists, hoy: date | None = None) -> schemas.CumplimientoResumen:
    hoy = hoy or date.today()
    hechas = 0
    pendientes = 0
    vencidas = 0

    for c in checklists:
        dias_transcurridos = (hoy - c.fecha).days
        for item in c.items:
            if item.estado == EstadoTareaItem.REALIZADO:
                hechas += 1
            else:
                dias_limite = DIAS_POR_FRECUENCIA.get(item.frecuencia, 1)
                if dias_transcurridos >= dias_limite:
                    vencidas += 1
                else:
                    pendientes += 1

    total = hechas + pendientes + vencidas
    porcentaje = round((hechas / total) * 100.0, 1) if total > 0 else 0.0
    return schemas.CumplimientoResumen(
        hechas=hechas,
        pendientes=pendientes,
        vencidas=vencidas,
        porcentaje=porcentaje,
    )


def obtener_cumplimiento_actual(
    db: Session, periodo: schemas.Periodo, hoy: date | None = None
) -> schemas.CumplimientoResumen:
    hoy = hoy or date.today()
    desde, hasta = _rango_periodo(periodo, hoy)
    checklists = checklist_services.listar_checklists(db, fecha_desde=desde, fecha_hasta=hasta)
    return _resumen_checklists(checklists, hoy)


def obtener_unidades_insumos(
    db: Session, periodo: schemas.Periodo, hoy: date | None = None
) -> list[str]:
    hoy = hoy or date.today()
    desde, hasta = _rango_periodo(periodo, hoy)
    checklists = checklist_services.listar_checklists(db, fecha_desde=desde, fecha_hasta=hasta)

    unidades_set: set[str] = set()
    for c in checklists:
        for item in c.items:
            if item.estado != EstadoTareaItem.REALIZADO or not item.insumos_utilizados:
                continue
            try:
                usados = json.loads(item.insumos_utilizados)
            except (TypeError, ValueError):
                continue
            for u in usados:
                unidad = str(u.get("unidad") or "").strip().upper()
                if unidad:
                    unidades_set.add(unidad)

    orden_estandar = ["L", "ML", "KG", "G", "UN"]
    presentes = sorted(list(unidades_set))
    return [u for u in orden_estandar if u in unidades_set] + [u for u in presentes if u not in orden_estandar]


def obtener_consumo_insumos(
    db: Session,
    periodo: schemas.Periodo,
    unidad: str | None = None,
    hoy: date | None = None,
    limite: int = 8,
) -> list[schemas.ConsumoInsumo]:
    hoy = hoy or date.today()
    desde, hasta = _rango_periodo(periodo, hoy)
    checklists = checklist_services.listar_checklists(db, fecha_desde=desde, fecha_hasta=hasta)

    if not unidad:
        unidades_disponibles = obtener_unidades_insumos(db, periodo, hoy)
        if unidades_disponibles:
            unidad = unidades_disponibles[0]

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
                item_unidad = str(u.get("unidad") or "unidades").strip()
                if unidad and item_unidad.upper() != unidad.strip().upper():
                    continue

                clave = nombre.lower()
                cantidad = float(u.get("cantidad") or 0)
                if clave not in acumulado:
                    acumulado[clave] = {"nombre": nombre, "cantidad": 0.0, "unidad": item_unidad.upper()}
                acumulado[clave]["cantidad"] += cantidad

    consumo = sorted(acumulado.values(), key=lambda x: x["cantidad"], reverse=True)[:limite]
    return [schemas.ConsumoInsumo(**c) for c in consumo]


def obtener_resumen(
    db: Session,
    periodo: schemas.Periodo = "semana",
    periodo_cumplimiento: schemas.Periodo | None = None,
    periodo_insumos: schemas.Periodo | None = None,
    unidad: str | None = None,
    hoy: date | None = None,
) -> schemas.DashboardResumen:
    p_cumplimiento = periodo_cumplimiento or periodo
    p_insumos = periodo_insumos or periodo
    hoy = hoy or date.today()

    unidades_disp = obtener_unidades_insumos(db, p_insumos, hoy)
    unidad_efectiva = unidad.strip().upper() if unidad else (unidades_disp[0] if unidades_disp else "L")
    consumo = obtener_consumo_insumos(db, p_insumos, unidad=unidad_efectiva, hoy=hoy)

    return schemas.DashboardResumen(
        cumplimiento_actual=obtener_cumplimiento_actual(db, p_cumplimiento, hoy),
        consumo_insumos=consumo,
        unidades_disponibles=unidades_disp,
        unidad_actual=unidad_efectiva,
    )

