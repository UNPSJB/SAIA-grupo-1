from datetime import date, datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session

from src.config import settings
from src.certificado.models import Certificado
from src.personal.models import Personal
from src.equipos.models import Estado as EstadoEquipo
from src.plan_de_calibracion.models import Plan_de_Calibracion
from src.documentos.models import Documento
from src.vencimientos.schemas import (
    EstadoVencimiento,
    OrigenVencimiento,
    VencimientoConsolidadoItem,
)

PESO_ESTADO = {
    EstadoVencimiento.VENCIDO: 0,
    EstadoVencimiento.PROXIMO: 1,
    EstadoVencimiento.VIGENTE: 2,
}


def _a_fecha(valor: date | datetime) -> date:
    if isinstance(valor, datetime):
        return valor.date()
    return valor


def _calcular_plazo(fecha_venc: date, hoy: Optional[date] = None, dias_alerta: Optional[int] = None) -> tuple[int, EstadoVencimiento]:
    fecha_hoy = hoy or date.today()
    dias_restantes = (fecha_venc - fecha_hoy).days
    limite_alerta = dias_alerta if dias_alerta is not None else getattr(settings, "DIAS_ALERTA_VENCIMIENTO", 15)

    if dias_restantes < 0:
        estado = EstadoVencimiento.VENCIDO
    elif dias_restantes <= limite_alerta:
        estado = EstadoVencimiento.PROXIMO
    else:
        estado = EstadoVencimiento.VIGENTE

    return dias_restantes, estado


def listar_vencimientos_consolidados(
    db: Session,
    origen: Optional[OrigenVencimiento] = None,
    estado: Optional[EstadoVencimiento] = None,
    q: Optional[str] = None,
) -> List[VencimientoConsolidadoItem]:
    hoy = date.today()
    items: List[VencimientoConsolidadoItem] = []

    if origen in (None, OrigenVencimiento.PERSONAL):
        certificados = (
            db.query(Certificado)
            .join(Personal, Certificado.legajo_persona == Personal.legajo)
            .filter(Personal.activo == True)
            .all()
        )
        for cert in certificados:
            if not cert.fechaVencimiento:
                continue
            fecha_v = _a_fecha(cert.fechaVencimiento)
            dias, est = _calcular_plazo(fecha_v, hoy)
            concepto = cert.tipo_relacion.nombre if cert.tipo_relacion else f"Certificado #{cert.id}"
            responsable = (
                f"{cert.persona.nombre} {cert.persona.apellido}".strip()
                if cert.persona
                else f"Legajo {cert.legajo_persona}"
            )
            items.append(
                VencimientoConsolidadoItem(
                    id=f"personal-{cert.id}",
                    origen=OrigenVencimiento.PERSONAL,
                    concepto=concepto,
                    responsable=responsable,
                    referencia_id=cert.legajo_persona,
                    fecha=fecha_v,
                    dias_restantes=dias,
                    estado=est,
                )
            )

    if origen in (None, OrigenVencimiento.EQUIPO):
        planes = db.query(Plan_de_Calibracion).all()
        for plan in planes:
            fecha_raw = plan.fecha_vencimiento or plan.fecha_mantenimiento
            if not fecha_raw:
                continue
            if plan.equipo:
                estado_eq = getattr(plan.equipo, "estado", None)
                if estado_eq == EstadoEquipo.INACTIVO or getattr(estado_eq, "value", None) == "INACTIVO" or str(estado_eq).upper() == "INACTIVO":
                    continue
                if getattr(plan.equipo, "activo", True) is False:
                    continue
            fecha_v = _a_fecha(fecha_raw)
            periodo = plan.periodicidad_De_cambio
            if not periodo or periodo <= 0:
                if plan.fecha_vencimiento and plan.fecha_mantenimiento:
                    periodo = (_a_fecha(plan.fecha_vencimiento) - _a_fecha(plan.fecha_mantenimiento)).days
            dias_alerta = max(round((periodo or 0) * 0.1), 2) if periodo else None
            dias, est = _calcular_plazo(fecha_v, hoy, dias_alerta=dias_alerta)
            responsable = plan.equipo.nombre if plan.equipo else f"Equipo #{plan.equipo_id}"
            items.append(
                VencimientoConsolidadoItem(
                    id=f"equipo-{plan.id}",
                    origen=OrigenVencimiento.EQUIPO,
                    concepto=plan.nombre,
                    responsable=responsable,
                    referencia_id=plan.id,
                    fecha=fecha_v,
                    dias_restantes=dias,
                    estado=est,
                )
            )

    if origen in (None, OrigenVencimiento.DOCUMENTO):
        documentos = db.query(Documento).filter(Documento.activo == True).all()
        for doc in documentos:
            if doc.version_vigente:
                ver = doc.version_vigente
                if ver.fecha_vencimiento:
                    fecha_v = _a_fecha(ver.fecha_vencimiento)
                else:
                    fecha_base = ver.fecha_vigencia or _a_fecha(ver.creado_el)
                    fecha_v = fecha_base + timedelta(days=365)
                dias, est = _calcular_plazo(fecha_v, hoy)
                responsable = getattr(ver, "creado_por_usuario", None) or getattr(ver, "usuario", None) or "admin"
                items.append(
                    VencimientoConsolidadoItem(
                        id=f"documento-{doc.id}",
                        origen=OrigenVencimiento.DOCUMENTO,
                        concepto=f"{doc.titulo} (v{ver.version})",
                        responsable=responsable,
                        referencia_id=doc.id,
                        fecha=fecha_v,
                        dias_restantes=dias,
                        estado=est,
                    )
                )
            else:
                ultima = doc.ultima_version_vigente
                if ultima:
                    if ultima.fecha_vencimiento:
                        fecha_v = _a_fecha(ultima.fecha_vencimiento)
                    else:
                        fecha_base = ultima.fecha_vigencia or _a_fecha(ultima.creado_el)
                        fecha_v = fecha_base + timedelta(days=365)
                    if hoy > fecha_v:
                        dias, _ = _calcular_plazo(fecha_v, hoy)
                        responsable = getattr(ultima, "creado_por_usuario", None) or getattr(ultima, "usuario", None) or "admin"
                        items.append(
                            VencimientoConsolidadoItem(
                                id=f"documento-{doc.id}",
                                origen=OrigenVencimiento.DOCUMENTO,
                                concepto=f"{doc.titulo} (v{ultima.version})",
                                responsable=responsable,
                                referencia_id=doc.id,
                                fecha=fecha_v,
                                dias_restantes=dias,
                                estado=EstadoVencimiento.VENCIDO,
                            )
                        )

    if estado is not None:
        items = [it for it in items if it.estado == estado]

    if q and q.strip():
        termino = q.strip().lower()
        items = [
            it
            for it in items
            if termino in it.concepto.lower() or termino in it.responsable.lower()
        ]

    items.sort(key=lambda x: (PESO_ESTADO[x.estado], x.dias_restantes))
    return items
