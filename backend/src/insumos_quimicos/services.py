from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from src.dashboard.services import obtener_historico_consumo  # noqa: F401
from .models import InsumoQuimico
from .schemas import (
    InsumoQuimicoCreate,
    InsumoQuimicoUpdate,
)
from .exceptions import (
    InsumoQuimicoNotFoundException,
    InsumoQuimicoDuplicateNameException,
)
from src.unidadesMedida.services import resolver_unidad_medida
from datetime import date, datetime

def obtener_consumo_historico_para_exportar(
    db: Session,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    insumo_id: Optional[int] = None,
    agrupacion_tiempo: str = "dia",
    unidad: Optional[str] = None,
    busqueda: Optional[str] = None,
) -> List[Dict[str, Any]]:
    respuesta = obtener_historico_consumo(
        db=db,
        desde=desde,
        hasta=hasta,
        insumo_id=insumo_id,
        agrupacion_tiempo=agrupacion_tiempo,
        unidad=unidad,
    )

    term = busqueda.lower().strip() if busqueda else None
    filas: List[Dict[str, Any]] = []

    for m in respuesta.movimientos:
        insumo_nombre = m.insumo_nombre or ""
        responsable_nombre = m.responsable_nombre or ""
        tarea_nombre = m.tarea_nombre or ""
        plan_nombre = m.plan_nombre or ""
        sector = m.sector_o_equipo or ""
        proveedor = m.proveedor or ""
        tipo_val = m.tipo.value if hasattr(m.tipo, "value") else str(m.tipo or "")

        if term:
            coincide = (
                term in insumo_nombre.lower()
                or term in responsable_nombre.lower()
                or term in tarea_nombre.lower()
                or term in plan_nombre.lower()
                or term in sector.lower()
                or term in proveedor.lower()
                or term in tipo_val.lower()
            )
            if not coincide:
                continue

        fecha_raw = getattr(m, "fecha_hora", None) or getattr(m, "fecha", None)
        if isinstance(fecha_raw, datetime):
            fecha_str = fecha_raw.strftime("%d/%m/%Y %H:%M")
        elif isinstance(fecha_raw, date):
            fecha_str = fecha_raw.strftime("%d/%m/%Y")
        elif isinstance(fecha_raw, str) and fecha_raw:
            try:
                fecha_str = datetime.fromisoformat(fecha_raw).strftime("%d/%m/%Y %H:%M")
            except ValueError:
                fecha_str = fecha_raw
        else:
            fecha_str = "-"

        unidad_val = m.unidad.value if hasattr(m.unidad, "value") else str(m.unidad or "")
        responsable_str = (
            responsable_nombre
            if responsable_nombre
            else (f"Legajo #{m.responsable_legajo}" if getattr(m, "responsable_legajo", None) else "-")
        )

        filas.append({
            "fecha_hora": fecha_str,
            "insumo_nombre": insumo_nombre,
            "tipo": tipo_val,
            "proveedor": proveedor or "-",
            "cantidad": f"{m.cantidad} {unidad_val}".strip(),
            "responsable": responsable_str,
            "tarea_plan": f"{tarea_nombre} ({plan_nombre})" if plan_nombre else tarea_nombre,
            "sector_o_equipo": sector or "-",
        })

    return filas

def obtener_para_exportar(
    db: Session,
    busqueda: Optional[str] = None,
    tipo: Optional[str] = None,
    estado: Optional[str] = None
) -> List[Dict[str, Any]]:
    query = db.query(InsumoQuimico)

    if estado and estado != "TODOS":
        if estado.upper() == "ACTIVO":
            query = query.filter(InsumoQuimico.activo == True)
        elif estado.upper() == "INACTIVO":
            query = query.filter(InsumoQuimico.activo == False)

    if tipo and tipo != "TODOS":
        query = query.filter(InsumoQuimico.tipo == tipo)

    insumos = query.all()
    filas = []
    term = busqueda.lower().strip() if busqueda else None

    for item in insumos:
        nombre = getattr(item, "nombre", "") or ""
            
        if term and term not in nombre.lower():
            continue

        tipo_val = item.tipo.value if hasattr(item.tipo, "value") else str(item.tipo or "")
        unidad_val = str(getattr(item, "unidad_medida", "") or "")

        filas.append({
            "id": item.id,
            "nombre": nombre,
            "tipo": tipo_val,
            "stock_actual": getattr(item, "stock_actual", 0),
            "unidad_medida": unidad_val,
            "estado": "Activo" if getattr(item, "activo", True) else "Inactivo",
        })

    return filas


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

        unidad = resolver_unidad_medida(
            db,
            unidad_medida_id=data.unidad_medida_id,
            valor_texto=data.unidad_medida,
        )
        datos_dict = data.model_dump(exclude={"unidad_medida", "unidad_medida_id"})
        nuevo = InsumoQuimico(**datos_dict, unidad_medida_id=unidad.id)
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)
        try:
            from src.notificaciones.services import notificar_stock_bajo_quimico_si_corresponde
            notificar_stock_bajo_quimico_si_corresponde(db, nuevo)
        except Exception:
            pass
        return nuevo

    @staticmethod
    def update(db: Session, insumo_id: int, data: InsumoQuimicoUpdate):
        insumo = InsumoQuimicoService.get_by_id(db, insumo_id)
        update_data = data.model_dump(exclude_unset=True)
        unidad_texto = update_data.pop("unidad_medida", None)
        unidad_id_val = update_data.pop("unidad_medida_id", None)
        if unidad_id_val is not None or unidad_texto is not None:
            unidad = resolver_unidad_medida(
                db,
                unidad_medida_id=unidad_id_val,
                valor_texto=unidad_texto,
            )
            update_data["unidad_medida_id"] = unidad.id
        for key, value in update_data.items():
            setattr(insumo, key, value)
        db.commit()
        db.refresh(insumo)
        try:
            from src.notificaciones.services import notificar_stock_bajo_quimico_si_corresponde
            notificar_stock_bajo_quimico_si_corresponde(db, insumo)
        except Exception:
            pass
        return insumo

    @staticmethod
    def toggle_estado(db: Session, insumo_id: int):
        insumo = InsumoQuimicoService.get_by_id(db, insumo_id)
        insumo.activo = not insumo.activo  # type: ignore
        db.commit()
        return insumo
