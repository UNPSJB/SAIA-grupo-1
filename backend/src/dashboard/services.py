import calendar
import json
from datetime import date, datetime, timedelta
from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.checklist import services as checklist_services
from src.checklist.models import DIAS_POR_FRECUENCIA, EstadoTareaItem
from src.dashboard import schemas
from src.dashboard.exceptions import RangoFechasInvalido, RangoFechasInvalidoException
from src.insumos_quimicos.models import InsumoQuimico
from src.produccion.models import LoteProduccion

def _rango_periodo(periodo: str, hoy: date) -> Tuple[date, date]:
    p = str(periodo).lower()
    if p in ("dia", "diaria", "diario"):
        return hoy, hoy
    elif p in ("mes", "mensual"):
        return hoy - timedelta(days=30), hoy
    else:
        return hoy - timedelta(days=7), hoy

def _resumen_checklists(checklists, hoy: date | None = None) -> schemas.CumplimientoResumen:
    hoy = hoy or date.today()
    hechas = 0
    pendientes = 0
    vencidas = 0
    justificadas = 0

    for c in checklists:
        dias_transcurridos = (hoy - c.fecha).days
        for item in c.items:
            if item.estado in (EstadoTareaItem.REALIZADO, EstadoTareaItem.REASIGNADO):
                hechas += 1
            elif item.estado == EstadoTareaItem.NO_REALIZADO:
                justificadas += 1
            else:
                dias_limite = DIAS_POR_FRECUENCIA.get(item.frecuencia, 1)
                if dias_transcurridos >= dias_limite:
                    vencidas += 1
                else:
                    pendientes += 1

    total = hechas + pendientes + vencidas + justificadas
    porcentaje = round((hechas / total) * 100.0, 1) if total > 0 else 0.0
    return schemas.CumplimientoResumen(
        hechas=hechas,
        pendientes=pendientes,
        vencidas=vencidas,
        justificadas=justificadas,
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

    cumplimiento_calc = obtener_cumplimiento_actual(db, p_cumplimiento, hoy)
    return schemas.DashboardResumen(
        cumplimiento_actual=cumplimiento_calc,
        cumplimiento=cumplimiento_calc,
        periodo=p_cumplimiento,
        consumo_insumos=consumo,
        unidades_disponibles=unidades_disp,
        unidad_actual=unidad_efectiva,
    )

def obtener_grafico_cumplimiento(
    db: Session,
    desde: date | None = None,
    hasta: date | None = None,
    agrupacion: str = "dia",
    hoy: date | None = None,
) -> schemas.GraficoCumplimientoResponse:
    fecha_hoy = hoy or date.today()
    fecha_hasta = hasta or fecha_hoy
    fecha_desde = desde or (fecha_hasta - timedelta(days=30))

    if fecha_desde < date(2000, 1, 1):
        raise RangoFechasInvalido()
    if fecha_desde > fecha_hasta:
        raise RangoFechasInvalido()

    agr = str(agrupacion).lower().strip()
    if agr not in ("dia", "semana"):
        agr = "dia"

    checklists = checklist_services.listar_checklists(
        db, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta
    )

    if not checklists:
        return schemas.GraficoCumplimientoResponse(
            agrupacion=agr,
            desde=fecha_desde,
            hasta=fecha_hasta,
            total_checklists=0,
            total_tareas=0,
            tareas_completadas=0,
            promedio_cumplimiento=0.0,
            puntos=[],
        )

    puntos: list[schemas.PuntoCumplimiento] = []

    if agr == "dia":
        por_dia: dict[date, list] = {}
        for c in checklists:
            por_dia.setdefault(c.fecha, []).append(c)

        for f in sorted(por_dia.keys()):
            grupo = por_dia[f]
            t_total = sum(c.total_tareas for c in grupo)
            t_comp = sum(c.tareas_completadas for c in grupo)
            t_pend = t_total - t_comp
            pct = round((t_comp / t_total) * 100.0, 1) if t_total > 0 else 100.0
            puntos.append(
                schemas.PuntoCumplimiento(
                    fecha=f,
                    etiqueta=f.strftime("%d/%m/%Y"),
                    total_checklists=len(grupo),
                    total_tareas=t_total,
                    tareas_completadas=t_comp,
                    tareas_pendientes=t_pend,
                    porcentaje=pct,
                )
            )
    else:
        por_semana: dict[date, list] = {}
        for c in checklists:
            inicio_sem = c.fecha - timedelta(days=c.fecha.weekday())
            por_semana.setdefault(inicio_sem, []).append(c)

        for inicio_sem in sorted(por_semana.keys()):
            fin_sem = inicio_sem + timedelta(days=6)
            grupo = por_semana[inicio_sem]
            t_total = sum(c.total_tareas for c in grupo)
            t_comp = sum(c.tareas_completadas for c in grupo)
            t_pend = t_total - t_comp
            pct = round((t_comp / t_total) * 100.0, 1) if t_total > 0 else 100.0
            puntos.append(
                schemas.PuntoCumplimiento(
                    fecha_inicio=inicio_sem,
                    fecha_fin=fin_sem,
                    etiqueta=f"{inicio_sem.strftime('%d/%m')} al {fin_sem.strftime('%d/%m')}",
                    total_checklists=len(grupo),
                    total_tareas=t_total,
                    tareas_completadas=t_comp,
                    tareas_pendientes=t_pend,
                    porcentaje=pct,
                )
            )

    total_checklists = len(checklists)
    total_tareas = sum(c.total_tareas for c in checklists)
    tareas_completadas = sum(c.tareas_completadas for c in checklists)
    promedio_cumplimiento = (
        round((tareas_completadas / total_tareas) * 100.0, 1)
        if total_tareas > 0
        else 0.0
    )

    return schemas.GraficoCumplimientoResponse(
        agrupacion=agr,
        desde=fecha_desde,
        hasta=fecha_hasta,
        total_checklists=total_checklists,
        total_tareas=total_tareas,
        tareas_completadas=tareas_completadas,
        promedio_cumplimiento=promedio_cumplimiento,
        puntos=puntos,
    )

def obtener_historico_consumo(
    db: Session,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    insumo_id: Optional[int] = None,
    agrupacion_tiempo: str = "dia",
    unidad: Optional[str] = None,
) -> schemas.ConsumoHistoricoResponse:
    if desde and desde < date(2000, 1, 1):
        raise RangoFechasInvalidoException("La fecha 'desde' no puede ser anterior al año 2000.")
    if desde and hasta and desde > hasta:
        raise RangoFechasInvalidoException("La fecha 'desde' no puede ser posterior a la fecha 'hasta'.")

    hoy = date.today()
    if not desde and not hasta:
        hasta = hoy
        desde = hasta - timedelta(days=29)
    elif desde and not hasta:
        hasta = hoy if desde <= hoy else desde
    elif hasta and not desde:
        desde = hasta - timedelta(days=29)

    dias_periodo = max(1, (hasta - desde).days + 1)
    prev_hasta = desde - timedelta(days=1)
    prev_desde = prev_hasta - timedelta(days=dias_periodo - 1)

    quimicos = db.query(InsumoQuimico).all()
    quimicos_por_id = {q.id: q for q in quimicos}
    quimicos_por_nombre = {q.nombre.strip().lower(): q for q in quimicos}

    checklists = checklist_services.listar_checklists(
        db, fecha_desde=prev_desde, fecha_hasta=hasta
    )

    movimientos_todos: List[dict] = []
    unidades_set = set()

    for c in checklists:
        for item in c.items:
            if item.estado != EstadoTareaItem.REALIZADO or not item.insumos_utilizados:
                continue

            try:
                usados = json.loads(item.insumos_utilizados)
            except (ValueError, TypeError):
                continue

            if not isinstance(usados, list):
                continue

            fecha_mov = c.fecha
            fecha_hora_mov = item.fecha_hora_fin or datetime.combine(c.fecha, datetime.min.time())

            for idx, u in enumerate(usados):
                if not isinstance(u, dict):
                    continue

                u_id = u.get("id")
                u_nombre = str(u.get("nombre") or "").strip()
                if not u_nombre and not u_id:
                    continue

                try:
                    u_cant = float(u.get("cantidad") or 0.0)
                except (ValueError, TypeError):
                    u_cant = 0.0

                u_unidad = str(u.get("unidad") or "L").strip().upper()

                quimico_obj = None
                if u_id and u_id in quimicos_por_id:
                    quimico_obj = quimicos_por_id[u_id]
                elif u_nombre.lower() in quimicos_por_nombre:
                    quimico_obj = quimicos_por_nombre[u_nombre.lower()]

                if insumo_id is not None:
                    if quimico_obj and quimico_obj.id != insumo_id:
                        continue
                    if not quimico_obj and u_id != insumo_id:
                        continue

                tipo_str = "OTRO"
                if quimico_obj:
                    tipo_val = getattr(quimico_obj, "tipo", None)
                    tipo_str = str(getattr(tipo_val, "value", tipo_val or "OTRO")).upper()

                proveedor_str = "Sin especificar"
                if quimico_obj and getattr(quimico_obj, "proveedor", None):
                    proveedor_str = str(quimico_obj.proveedor).strip() or "Sin especificar"

                nombre_final = quimico_obj.nombre if quimico_obj else u_nombre
                id_final = quimico_obj.id if quimico_obj else u_id

                es_actual = (desde <= fecha_mov <= hasta)
                es_previo = (prev_desde <= fecha_mov <= prev_hasta)

                if es_actual:
                    unidades_set.add(u_unidad)

                movimientos_todos.append({
                    "es_actual": es_actual,
                    "es_previo": es_previo,
                    "id": f"{item.id}_{idx}",
                    "fecha": fecha_mov,
                    "fecha_hora": fecha_hora_mov,
                    "insumo_id": id_final,
                    "insumo_nombre": nombre_final,
                    "tipo": tipo_str,
                    "proveedor": proveedor_str,
                    "cantidad": u_cant,
                    "unidad": u_unidad,
                    "responsable_legajo": item.responsable_legajo,
                    "responsable_nombre": item.nombre_responsable,
                    "tarea_nombre": item.nombre_tarea,
                    "plan_nombre": item.nombre_plan,
                    "sector_o_equipo": item.nombre_equipo,
                    "checklist_id": item.checklist_id,
                })

    orden_estandar = ["L", "ML", "KG", "G", "UN"]
    presentes = sorted(list(unidades_set))
    unidades_disponibles = [u for u in orden_estandar if u in unidades_set] + [u for u in presentes if u not in orden_estandar]

    if unidad and unidad.upper() in unidades_set:
        unidad_seleccionada = unidad.upper()
    elif unidades_disponibles:
        unidad_seleccionada = unidades_disponibles[0]
    else:
        unidad_seleccionada = (unidad or "L").upper()

    movimientos_actuales_dto: List[schemas.MovimientoInsumoQuimico] = []
    consumo_actual_unidad = 0.0
    consumo_previo_unidad = 0.0

    agrupado_tiempo: dict[date, dict] = {}
    agrupado_tipo: dict[str, dict] = {}
    agrupado_proveedor: dict[str, dict] = {}
    consumo_por_quimico: dict[str, float] = {}

    for m in movimientos_todos:
        if m["es_actual"]:
            movimientos_actuales_dto.append(
                schemas.MovimientoInsumoQuimico(
                    id=m["id"],
                    fecha=m["fecha"],
                    fecha_hora=m["fecha_hora"],
                    insumo_id=m["insumo_id"],
                    insumo_nombre=m["insumo_nombre"],
                    tipo=m["tipo"],
                    proveedor=m["proveedor"],
                    cantidad=m["cantidad"],
                    unidad=m["unidad"],
                    responsable_legajo=m["responsable_legajo"],
                    responsable_nombre=m["responsable_nombre"],
                    tarea_nombre=m["tarea_nombre"],
                    plan_nombre=m["plan_nombre"],
                    sector_o_equipo=m["sector_o_equipo"],
                    checklist_id=m["checklist_id"],
                )
            )

            if m["unidad"] == unidad_seleccionada:
                cant = m["cantidad"]
                consumo_actual_unidad += cant

                q_key = m["insumo_nombre"]
                consumo_por_quimico[q_key] = consumo_por_quimico.get(q_key, 0.0) + cant

                t_key = m["tipo"]
                if t_key not in agrupado_tipo:
                    agrupado_tipo[t_key] = {"cantidad": 0.0, "movimientos": 0}
                agrupado_tipo[t_key]["cantidad"] += cant
                agrupado_tipo[t_key]["movimientos"] += 1

                p_key = m["proveedor"]
                if p_key not in agrupado_proveedor:
                    agrupado_proveedor[p_key] = {"cantidad": 0.0, "movimientos": 0}
                agrupado_proveedor[p_key]["cantidad"] += cant
                agrupado_proveedor[p_key]["movimientos"] += 1

                f = m["fecha"]
                if agrupacion_tiempo == "semana":
                    f_bucket = f - timedelta(days=f.weekday())
                elif agrupacion_tiempo == "mes":
                    f_bucket = date(f.year, f.month, 1)
                else:
                    f_bucket = f

                if f_bucket not in agrupado_tiempo:
                    agrupado_tiempo[f_bucket] = {"total": 0.0, "por_tipo": {}}
                agrupado_tiempo[f_bucket]["total"] += cant
                agrupado_tiempo[f_bucket]["por_tipo"][t_key] = (
                    agrupado_tiempo[f_bucket]["por_tipo"].get(t_key, 0.0) + cant
                )

        elif m["es_previo"] and m["unidad"] == unidad_seleccionada:
            consumo_previo_unidad += m["cantidad"]

    movimientos_actuales_dto.sort(
        key=lambda x: (x.fecha_hora or datetime.combine(x.fecha, datetime.min.time())), reverse=True
    )

    evolucion: List[schemas.PuntoEvolucionConsumo] = []
    for f_bucket in sorted(agrupado_tiempo.keys()):
        dato = agrupado_tiempo[f_bucket]
        if agrupacion_tiempo == "semana":
            fin_sem = f_bucket + timedelta(days=6)
            etiqueta = f"{f_bucket.strftime('%d/%m')} al {fin_sem.strftime('%d/%m')}"
        elif agrupacion_tiempo == "mes":
            etiqueta = f_bucket.strftime("%m/%Y")
        else:
            etiqueta = f_bucket.strftime("%d/%m/%Y")

        evolucion.append(
            schemas.PuntoEvolucionConsumo(
                fecha=f_bucket,
                etiqueta=etiqueta,
                total_consumido=round(dato["total"], 2),
                por_tipo={k: round(v, 2) for k, v in dato["por_tipo"].items()},
            )
        )

    total_tipo = sum(d["cantidad"] for d in agrupado_tipo.values())
    items_tipo: List[schemas.ConsumoAgrupadoItem] = []
    for t_key, d in sorted(agrupado_tipo.items(), key=lambda x: x[1]["cantidad"], reverse=True):
        pct = round((d["cantidad"] / total_tipo) * 100.0, 1) if total_tipo > 0 else 0.0
        items_tipo.append(
            schemas.ConsumoAgrupadoItem(
                clave=t_key,
                etiqueta=t_key.capitalize(),
                cantidad_total=round(d["cantidad"], 2),
                porcentaje=pct,
                cantidad_movimientos=d["movimientos"],
                unidad=unidad_seleccionada,
            )
        )

    total_prov = sum(d["cantidad"] for d in agrupado_proveedor.values())
    items_proveedor: List[schemas.ConsumoAgrupadoItem] = []
    for p_key, d in sorted(agrupado_proveedor.items(), key=lambda x: x[1]["cantidad"], reverse=True):
        pct = round((d["cantidad"] / total_prov) * 100.0, 1) if total_prov > 0 else 0.0
        items_proveedor.append(
            schemas.ConsumoAgrupadoItem(
                clave=p_key,
                etiqueta=p_key,
                cantidad_total=round(d["cantidad"], 2),
                porcentaje=pct,
                cantidad_movimientos=d["movimientos"],
                unidad=unidad_seleccionada,
            )
        )

    consumo_actual_redondeado = round(consumo_actual_unidad, 2)
    consumo_previo_redondeado = round(consumo_previo_unidad, 2)

    if consumo_previo_redondeado > 0:
        variacion_pct = round(
            ((consumo_actual_redondeado - consumo_previo_redondeado) / consumo_previo_redondeado) * 100.0, 1
        )
    elif consumo_previo_redondeado == 0 and consumo_actual_redondeado > 0:
        variacion_pct = 100.0
    else:
        variacion_pct = 0.0

    promedio_diario = round(consumo_actual_redondeado / dias_periodo, 2)

    quimico_mas_cons = None
    cant_quimico_mas_cons = None
    if consumo_por_quimico:
        mas_cons_item = max(consumo_por_quimico.items(), key=lambda x: x[1])
        quimico_mas_cons = mas_cons_item[0]
        cant_quimico_mas_cons = round(mas_cons_item[1], 2)

    metricas = schemas.MetricasConsumoHistorico(
        consumo_total_periodo=consumo_actual_redondeado,
        consumo_periodo_anterior=consumo_previo_redondeado,
        variacion_porcentual=variacion_pct,
        promedio_diario=promedio_diario,
        total_movimientos=len(movimientos_actuales_dto),
        quimico_mas_consumido=quimico_mas_cons,
        cantidad_quimico_mas_consumido=cant_quimico_mas_cons,
        unidad_predominante=unidad_seleccionada,
    )

    return schemas.ConsumoHistoricoResponse(
        desde=desde,
        hasta=hasta,
        insumo_id=insumo_id,
        unidad_seleccionada=unidad_seleccionada,
        unidades_disponibles=unidades_disponibles,
        agrupacion_tiempo=agrupacion_tiempo,
        total_registros=len(movimientos_actuales_dto),
        metricas=metricas,
        evolucion=evolucion,
        por_tipo=items_tipo,
        por_proveedor=items_proveedor,
        movimientos=movimientos_actuales_dto,
    )


def inferir_turno(dt: Optional[datetime]) -> str:
    if not dt:
        return "MAÑANA"
    h = dt.hour
    if 6 <= h < 14:
        return "MAÑANA"
    elif 14 <= h < 22:
        return "TARDE"
    return "NOCHE"

def obtener_cumplimiento_detallado(
    db: Session,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    sector_id: Optional[int] = None,
    turno: Optional[str] = None,
) -> schemas.CumplimientoDetalladoResponse:
    if desde and desde < date(2000, 1, 1):
        raise RangoFechasInvalidoException("La fecha 'desde' no puede ser anterior al año 2000.")
    if desde and hasta and desde > hasta:
        raise RangoFechasInvalidoException("La fecha 'desde' no puede ser posterior a la fecha 'hasta'.")

    from src.checklist.models import Checklist, ChecklistItem
    from src.sectores.models import Sector
    from src.equipos.models import Equipo

    query = db.query(Checklist).filter(Checklist.activo == True)
    if desde:
        query = query.filter(Checklist.fecha >= desde)
    if hasta:
        query = query.filter(Checklist.fecha <= hasta)

    checklists = query.order_by(Checklist.fecha.desc()).all()

    items_crudos = []
    for chk in checklists:
        for it in chk.items:
            sec_id = None
            sec_nom = "Sin sector asignado"
            eq_id = None
            eq_nom = None
            tipo_obj = "Sector"
            sec_o_eq = "General"

            if it.plan:
                if it.plan.sector:
                    sec_id = it.plan.sector.id
                    sec_nom = it.plan.sector.nombre
                    sec_o_eq = it.plan.sector.nombre
                    tipo_obj = "Sector"
                elif it.plan.equipo:
                    eq_id = it.plan.equipo.id
                    eq_nom = it.plan.equipo.nombre
                    sec_o_eq = it.plan.equipo.nombre
                    tipo_obj = "Equipo"
                    if it.plan.equipo.ubicacion:
                        sec_id = it.plan.equipo.ubicacion.id
                        sec_nom = it.plan.equipo.ubicacion.nombre
                    elif it.plan.equipo.sector_id:
                        sec_id = it.plan.equipo.sector_id

            turno_item = inferir_turno(it.fecha_hora_fin or chk.creado_en)

            if sector_id and sec_id != sector_id:
                continue

            if turno and turno.strip().upper() not in ("TODOS", "") and turno_item != turno.strip().upper():
                continue

            items_crudos.append({
                "item": it,
                "checklist": chk,
                "sector_id": sec_id,
                "sector_nombre": sec_nom,
                "equipo_id": eq_id,
                "equipo_nombre": eq_nom,
                "tipo_objeto": tipo_obj,
                "sector_o_equipo": sec_o_eq,
                "turno": turno_item,
            })

    total_tareas = len(items_crudos)
    tareas_completadas = sum(1 for row in items_crudos if row["item"].estado == EstadoTareaItem.REALIZADO)
    tareas_pendientes = total_tareas - tareas_completadas
    pct_general = round((tareas_completadas / total_tareas) * 100.0, 1) if total_tareas > 0 else 0.0

    chk_ids_unicos = len(set(row["checklist"].id for row in items_crudos))

    por_fecha = {}
    for row in items_crudos:
        f = row["checklist"].fecha
        if f not in por_fecha:
            por_fecha[f] = {"total": 0, "completadas": 0}
        por_fecha[f]["total"] += 1
        if row["item"].estado == EstadoTareaItem.REALIZADO:
            por_fecha[f]["completadas"] += 1

    tendencia = []
    for f in sorted(por_fecha.keys()):
        tot = por_fecha[f]["total"]
        comp = por_fecha[f]["completadas"]
        pct = round((comp / tot) * 100.0, 1) if tot > 0 else 0.0
        tendencia.append(schemas.PuntoTendenciaCumplimiento(
            fecha=f,
            etiqueta=f.strftime("%d/%m"),
            total_tareas=tot,
            tareas_completadas=comp,
            tareas_pendientes=tot - comp,
            porcentaje=pct,
        ))

    por_sector = {}
    for row in items_crudos:
        s_id = row["sector_id"] or 0
        s_nom = row["sector_nombre"]
        if s_id not in por_sector:
            por_sector[s_id] = {"nombre": s_nom, "total": 0, "completadas": 0}
        por_sector[s_id]["total"] += 1
        if row["item"].estado == EstadoTareaItem.REALIZADO:
            por_sector[s_id]["completadas"] += 1

    desglose_sector = []
    for s_id, data in por_sector.items():
        tot = data["total"]
        comp = data["completadas"]
        pct = round((comp / tot) * 100.0, 1) if tot > 0 else 0.0
        desglose_sector.append(schemas.CumplimientoDesgloseItem(
            id=s_id,
            nombre=data["nombre"],
            total_tareas=tot,
            tareas_completadas=comp,
            tareas_pendientes=tot - comp,
            porcentaje=pct,
        ))
    desglose_sector.sort(key=lambda x: (x.porcentaje, x.nombre))

    por_equipo = {}
    for row in items_crudos:
        if row["equipo_id"]:
            e_id = row["equipo_id"]
            e_nom = row["equipo_nombre"]
            s_nom = row["sector_nombre"]
            if e_id not in por_equipo:
                por_equipo[e_id] = {"nombre": e_nom, "sector": s_nom, "total": 0, "completadas": 0}
            por_equipo[e_id]["total"] += 1
            if row["item"].estado == EstadoTareaItem.REALIZADO:
                por_equipo[e_id]["completadas"] += 1

    desglose_equipo = []
    for e_id, data in por_equipo.items():
        tot = data["total"]
        comp = data["completadas"]
        pct = round((comp / tot) * 100.0, 1) if tot > 0 else 0.0
        desglose_equipo.append(schemas.CumplimientoDesgloseItem(
            id=e_id,
            nombre=data["nombre"],
            subtitulo=data["sector"],
            total_tareas=tot,
            tareas_completadas=comp,
            tareas_pendientes=tot - comp,
            porcentaje=pct,
        ))
    desglose_equipo.sort(key=lambda x: (x.porcentaje, x.nombre))

    por_turno = {
        "MAÑANA": {"total": 0, "completadas": 0},
        "TARDE": {"total": 0, "completadas": 0},
        "NOCHE": {"total": 0, "completadas": 0},
    }
    for row in items_crudos:
        t_nombre = row["turno"]
        if t_nombre in por_turno:
            por_turno[t_nombre]["total"] += 1
            if row["item"].estado == EstadoTareaItem.REALIZADO:
                por_turno[t_nombre]["completadas"] += 1

    desglose_turno = []
    idx_t = 1
    for t_nombre, data in por_turno.items():
        tot = data["total"]
        comp = data["completadas"]
        pct = round((comp / tot) * 100.0, 1) if tot > 0 else 0.0
        desglose_turno.append(schemas.CumplimientoDesgloseItem(
            id=idx_t,
            nombre=t_nombre.capitalize(),
            total_tareas=tot,
            tareas_completadas=comp,
            tareas_pendientes=tot - comp,
            porcentaje=pct,
        ))
        idx_t += 1

    sec_menor = desglose_sector[0].nombre if desglose_sector else None
    pct_sec_menor = desglose_sector[0].porcentaje if desglose_sector else None

    eq_menor = desglose_equipo[0].nombre if desglose_equipo else None
    pct_eq_menor = desglose_equipo[0].porcentaje if desglose_equipo else None

    turnos_con_datos = [t for t in desglose_turno if t.total_tareas > 0]
    turno_critico_item = min(turnos_con_datos, key=lambda x: x.porcentaje) if turnos_con_datos else None
    turno_critico_nom = turno_critico_item.nombre if turno_critico_item else None
    pct_turno_critico = turno_critico_item.porcentaje if turno_critico_item else None

    kpis = schemas.KpisCumplimientoDetallado(
        total_checklists=chk_ids_unicos,
        total_tareas=total_tareas,
        tareas_completadas=tareas_completadas,
        tareas_pendientes=tareas_pendientes,
        porcentaje_general=pct_general,
        sector_menor_cumplimiento=sec_menor,
        porcentaje_sector_menor=pct_sec_menor,
        equipo_menor_cumplimiento=eq_menor,
        porcentaje_equipo_menor=pct_eq_menor,
        turno_critico=turno_critico_nom,
        porcentaje_turno_critico=pct_turno_critico,
    )

    items_detalle = []
    for row in items_crudos:
        it = row["item"]
        chk = row["checklist"]
        frec_str = it.frecuencia.value if hasattr(it.frecuencia, "value") else str(it.frecuencia)
        est_str = it.estado.value if hasattr(it.estado, "value") else str(it.estado)
        h_fin = it.fecha_hora_fin.strftime("%H:%M") if it.fecha_hora_fin else None

        items_detalle.append(schemas.ItemDetalleChecklist(
            id=it.id,
            checklist_id=chk.id,
            fecha=chk.fecha,
            nombre_tarea=it.nombre_tarea,
            frecuencia=frec_str,
            sector_o_equipo=row["sector_o_equipo"],
            tipo_objeto=row["tipo_objeto"],
            responsable=it.nombre_responsable or chk.nombre_responsable or "Sin responsable",
            turno=row["turno"].capitalize(),
            estado=est_str,
            hora_fin=h_fin,
        ))

    items_detalle.sort(key=lambda x: (x.fecha, x.id), reverse=True)

    return schemas.CumplimientoDetalladoResponse(
        desde=desde,
        hasta=hasta,
        sector_id=sector_id,
        turno=turno,
        kpis=kpis,
        tendencia_temporal=tendencia,
        desglose_por_sector=desglose_sector,
        desglose_por_equipo=desglose_equipo,
        desglose_por_turno=desglose_turno,
        items_detalle=items_detalle,
    )

def obtener_estadisticas_produccion(
    db: Session,
    periodo: str = "dia",
    producto_id: Optional[int] = None,
    hoy: Optional[date] = None,
) -> schemas.ProduccionDashboardResponse:
    fecha_hoy = hoy or date.today()
    p = str(periodo).lower().strip()

    if p in ("mes", "mensual", "anio", "año", "ano", "anual"):
        desde = max(date(fecha_hoy.year, 1, 1), date(2000, 1, 1))
        hasta = fecha_hoy

        buckets = []
        for m in range(1, fecha_hoy.month + 1):
            d_ini = date(fecha_hoy.year, m, 1)
            dias_en_mes = calendar.monthrange(fecha_hoy.year, m)[1]
            d_fin = min(date(fecha_hoy.year, m, dias_en_mes), hasta)
            nombre = f"{m:02d}/{fecha_hoy.year}"
            buckets.append((nombre, d_ini, d_fin))

        acc = {b[0]: {"cantidad": 0.0, "lotes": 0} for b in buckets}

        consulta = (
            select(
                LoteProduccion.fecha,
                func.coalesce(func.sum(LoteProduccion.cantidad), 0.0),
                func.count(LoteProduccion.id),
            )
            .where(LoteProduccion.fecha >= desde, LoteProduccion.fecha <= hasta)
            .group_by(LoteProduccion.fecha)
        )
        if producto_id is not None:
            consulta = consulta.where(LoteProduccion.producto_id == producto_id)

        resultados = db.execute(consulta).all()

        for f, cant, count in resultados:
            for nombre_mes, d_ini, d_fin in buckets:
                if d_ini <= f <= d_fin:
                    acc[nombre_mes]["cantidad"] += float(cant)
                    acc[nombre_mes]["lotes"] += int(count)
                    break

        puntos = [
            schemas.PuntoProduccion(
                nombre=b[0],
                cantidad=round(acc[b[0]]["cantidad"], 2),
                lotes=acc[b[0]]["lotes"],
            )
            for b in buckets
        ]
    elif p in ("semana", "semanal"):
        desde = fecha_hoy.replace(day=1)
        hasta = fecha_hoy

        buckets = []
        cur_inicio = desde
        while cur_inicio <= hasta:
            dias_hasta_sabado = (5 - cur_inicio.weekday()) % 7
            cur_fin = cur_inicio + timedelta(days=dias_hasta_sabado)
            if cur_fin >= hasta:
                cur_fin = hasta
            nombre = (
                f"{cur_inicio.strftime('%d/%m')} al {cur_fin.strftime('%d/%m')}"
                if cur_inicio != cur_fin
                else cur_inicio.strftime("%d/%m")
            )
            buckets.append((nombre, cur_inicio, cur_fin))
            if cur_fin >= hasta:
                break
            cur_inicio = cur_fin + timedelta(days=1)

        acc = {b[0]: {"cantidad": 0.0, "lotes": 0} for b in buckets}

        consulta = (
            select(
                LoteProduccion.fecha,
                func.coalesce(func.sum(LoteProduccion.cantidad), 0.0),
                func.count(LoteProduccion.id),
            )
            .where(LoteProduccion.fecha >= desde, LoteProduccion.fecha <= hasta)
            .group_by(LoteProduccion.fecha)
        )
        if producto_id is not None:
            consulta = consulta.where(LoteProduccion.producto_id == producto_id)

        resultados = db.execute(consulta).all()

        for f, cant, count in resultados:
            for nombre_sem, d_ini, d_fin in buckets:
                if d_ini <= f <= d_fin:
                    acc[nombre_sem]["cantidad"] += float(cant)
                    acc[nombre_sem]["lotes"] += int(count)
                    break

        puntos = [
            schemas.PuntoProduccion(
                nombre=b[0],
                cantidad=round(acc[b[0]]["cantidad"], 2),
                lotes=acc[b[0]]["lotes"],
            )
            for b in buckets
        ]
    else:
        fechas_dias = [fecha_hoy - timedelta(days=6 - i) for i in range(7)]
        desde = fechas_dias[0]
        hasta = fecha_hoy

        dias_dict = {
            f: {"nombre": f.strftime("%d/%m"), "cantidad": 0.0, "lotes": 0}
            for f in fechas_dias
        }

        consulta = (
            select(
                LoteProduccion.fecha,
                func.coalesce(func.sum(LoteProduccion.cantidad), 0.0),
                func.count(LoteProduccion.id),
            )
            .where(LoteProduccion.fecha >= desde, LoteProduccion.fecha <= hasta)
            .group_by(LoteProduccion.fecha)
        )
        if producto_id is not None:
            consulta = consulta.where(LoteProduccion.producto_id == producto_id)

        resultados = db.execute(consulta).all()

        for f, cant, count in resultados:
            if f in dias_dict:
                dias_dict[f]["cantidad"] = float(cant)
                dias_dict[f]["lotes"] = int(count)

        puntos = [
            schemas.PuntoProduccion(
                nombre=dias_dict[f]["nombre"],
                cantidad=round(dias_dict[f]["cantidad"], 2),
                lotes=dias_dict[f]["lotes"],
            )
            for f in fechas_dias
        ]

    total_lotes = sum(p.lotes for p in puntos)
    total_cantidad = round(sum(p.cantidad for p in puntos), 2)

    return schemas.ProduccionDashboardResponse(
        periodo=p,
        desde=desde,
        hasta=hasta,
        total_lotes=total_lotes,
        total_cantidad=total_cantidad,
        puntos=puntos,
    )
