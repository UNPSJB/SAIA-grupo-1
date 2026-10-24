import json
from datetime import date, datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from src.checklist import services as checklist_services
from src.checklist.models import EstadoTareaItem
from .models import InsumoQuimico
from .schemas import (
    InsumoQuimicoCreate,
    InsumoQuimicoUpdate,
    ConsumoAgrupadoItem,
    ConsumoHistoricoResponse,
    MetricasConsumoHistorico,
    MovimientoInsumoQuimico,
    PuntoEvolucionConsumo,
)
from .exceptions import (
    InsumoQuimicoNotFoundException,
    InsumoQuimicoDuplicateNameException,
    RangoFechasInvalidoException,
)

class InsumoQuimicoService:
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100, solo_activos: bool = False):
        query = db.query(InsumoQuimico)
        if solo_activos:
            query = query.filter(InsumoQuimico.activo == True)
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_by_id(db: Session, insumo_id: int):
        insumo = db.query(InsumoQuimico).filter(InsumoQuimico.id == insumo_id).first()
        if not insumo:
            raise InsumoQuimicoNotFoundException(insumo_id)
        return insumo

    @staticmethod
    def create(db: Session, data: InsumoQuimicoCreate):
        existente = db.query(InsumoQuimico).filter(
            InsumoQuimico.nombre.ilike(data.nombre), 
            InsumoQuimico.activo == True
        ).first()
        if existente:
            raise InsumoQuimicoDuplicateNameException(data.nombre)

        nuevo = InsumoQuimico(**data.model_dump())
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)
        return nuevo

    @staticmethod
    def update(db: Session, insumo_id: int, data: InsumoQuimicoUpdate):
        insumo = InsumoQuimicoService.get_by_id(db, insumo_id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(insumo, key, value)
        db.commit()
        db.refresh(insumo)
        return insumo

    @staticmethod
    def toggle_estado(db: Session, insumo_id: int):
        insumo = InsumoQuimicoService.get_by_id(db, insumo_id)
        insumo.activo = not insumo.activo  # type: ignore
        db.commit()
        return insumo


def obtener_historico_consumo(
    db: Session,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    insumo_id: Optional[int] = None,
    agrupacion_tiempo: str = "dia",
    unidad: Optional[str] = None,
) -> ConsumoHistoricoResponse:
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

    # Catálogo de químicos para lookup
    quimicos = db.query(InsumoQuimico).all()
    quimicos_por_id = {q.id: q for q in quimicos}
    quimicos_por_nombre = {q.nombre.strip().lower(): q for q in quimicos}

    # Consultar checklists de todo el lapso (período anterior + actual)
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

                # Resolver objeto de químico
                quimico_obj = None
                if u_id and u_id in quimicos_por_id:
                    quimico_obj = quimicos_por_id[u_id]
                elif u_nombre.lower() in quimicos_por_nombre:
                    quimico_obj = quimicos_por_nombre[u_nombre.lower()]

                # Filtro por insumo específico si se solicitó
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

    movimientos_actuales_dto: List[MovimientoInsumoQuimico] = []
    consumo_actual_unidad = 0.0
    consumo_previo_unidad = 0.0

    agrupado_tiempo: dict[date, dict] = {}
    agrupado_tipo: dict[str, dict] = {}
    agrupado_proveedor: dict[str, dict] = {}
    consumo_por_quimico: dict[str, float] = {}

    for m in movimientos_todos:
        if m["es_actual"]:
            movimientos_actuales_dto.append(
                MovimientoInsumoQuimico(
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

            # Acumular en la unidad seleccionada para métricas y gráficos
            if m["unidad"] == unidad_seleccionada:
                cant = m["cantidad"]
                consumo_actual_unidad += cant

                # Químico más consumido
                q_key = m["insumo_nombre"]
                consumo_por_quimico[q_key] = consumo_por_quimico.get(q_key, 0.0) + cant

                # Agrupación por tipo
                t_key = m["tipo"]
                if t_key not in agrupado_tipo:
                    agrupado_tipo[t_key] = {"cantidad": 0.0, "movimientos": 0}
                agrupado_tipo[t_key]["cantidad"] += cant
                agrupado_tipo[t_key]["movimientos"] += 1

                # Agrupación por proveedor
                p_key = m["proveedor"]
                if p_key not in agrupado_proveedor:
                    agrupado_proveedor[p_key] = {"cantidad": 0.0, "movimientos": 0}
                agrupado_proveedor[p_key]["cantidad"] += cant
                agrupado_proveedor[p_key]["movimientos"] += 1

                # Agrupación temporal
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

    # Ordenar movimientos del más reciente al más antiguo
    movimientos_actuales_dto.sort(key=lambda x: (x.fecha_hora or datetime.combine(x.fecha, datetime.min.time())), reverse=True)

    # Construir puntos de evolución
    evolucion: List[PuntoEvolucionConsumo] = []
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
            PuntoEvolucionConsumo(
                fecha=f_bucket,
                etiqueta=etiqueta,
                total_consumido=round(dato["total"], 2),
                por_tipo={k: round(v, 2) for k, v in dato["por_tipo"].items()},
            )
        )

    # Construir agrupación por tipo
    total_tipo = sum(d["cantidad"] for d in agrupado_tipo.values())
    items_tipo: List[ConsumoAgrupadoItem] = []
    for t_key, d in sorted(agrupado_tipo.items(), key=lambda x: x[1]["cantidad"], reverse=True):
        pct = round((d["cantidad"] / total_tipo) * 100.0, 1) if total_tipo > 0 else 0.0
        items_tipo.append(
            ConsumoAgrupadoItem(
                clave=t_key,
                etiqueta=t_key.capitalize(),
                cantidad_total=round(d["cantidad"], 2),
                porcentaje=pct,
                cantidad_movimientos=d["movimientos"],
                unidad=unidad_seleccionada,
            )
        )

    # Construir agrupación por proveedor
    total_prov = sum(d["cantidad"] for d in agrupado_proveedor.values())
    items_proveedor: List[ConsumoAgrupadoItem] = []
    for p_key, d in sorted(agrupado_proveedor.items(), key=lambda x: x[1]["cantidad"], reverse=True):
        pct = round((d["cantidad"] / total_prov) * 100.0, 1) if total_prov > 0 else 0.0
        items_proveedor.append(
            ConsumoAgrupadoItem(
                clave=p_key,
                etiqueta=p_key,
                cantidad_total=round(d["cantidad"], 2),
                porcentaje=pct,
                cantidad_movimientos=d["movimientos"],
                unidad=unidad_seleccionada,
            )
        )

    # Métricas y variación
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

    metricas = MetricasConsumoHistorico(
        consumo_total_periodo=consumo_actual_redondeado,
        consumo_periodo_anterior=consumo_previo_redondeado,
        variacion_porcentual=variacion_pct,
        promedio_diario=promedio_diario,
        total_movimientos=len(movimientos_actuales_dto),
        quimico_mas_consumido=quimico_mas_cons,
        cantidad_quimico_mas_consumido=cant_quimico_mas_cons,
        unidad_predominante=unidad_seleccionada,
    )

    return ConsumoHistoricoResponse(
        desde=desde,
        hasta=hasta,
        insumo_id=insumo_id,
        unidad_seleccionada=unidad_seleccionada,
        unidades_disponibles=unidades_disponibles,
        agrupacion_tiempo=agrupacion_tiempo,  # type: ignore
        total_registros=len(movimientos_actuales_dto),
        metricas=metricas,
        evolucion=evolucion,
        por_tipo=items_tipo,
        por_proveedor=items_proveedor,
        movimientos=movimientos_actuales_dto,
    )
