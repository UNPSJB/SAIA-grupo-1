from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from src.config import settings
from src.certificado.models import Certificado
from src.tipoCertificado.models import TipoCertificado
from src.personal.models import Personal
from src.equipos.models import Equipo
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

def obtener_vencimientos_consolidados_para_csv(
    db: Session,
    origen: Optional[OrigenVencimiento] = None,
    estado: Optional[EstadoVencimiento] = None,
    q: Optional[str] = None,
) -> List[Dict[str, Any]]:
    
    items = listar_vencimientos_consolidados(db=db, origen=origen, estado=estado, q=q)
    
    etiquetas_origen = {
        OrigenVencimiento.PERSONAL: "Personal",
        OrigenVencimiento.EQUIPO: "Calibración / Mantenimiento",
        OrigenVencimiento.DOCUMENTO: "Documentos",
    }

    etiquetas_estado = {
        EstadoVencimiento.VENCIDO: "Vencido",
        EstadoVencimiento.PROXIMO: "Próximo a vencer",
        EstadoVencimiento.VIGENTE: "Vigente",
    }

    filas = []
    for item in items:
        # Formateo descriptivo del plazo
        dias = item.dias_restantes
        if dias < 0:
            str_plazo = f"Venció hace {abs(dias)} {'día' if abs(dias) == 1 else 'días'}"
        elif dias == 0:
            str_plazo = "Vence hoy"
        else:
            str_plazo = f"Vence en {dias} {'día' if dias == 1 else 'días'}"

        str_fecha = item.fecha.strftime("%Y-%m-%d") if hasattr(item.fecha, "strftime") else str(item.fecha)

        filas.append({
            "id": item.id,
            "estado": etiquetas_estado.get(item.estado, str(item.estado)),
            "origen": etiquetas_origen.get(item.origen, str(item.origen)),
            "concepto": item.concepto,
            "responsable": item.responsable,
            "fecha": str_fecha,
            "plazo": str_plazo,
            "dias_restantes": item.dias_restantes,
        })

    return filas

def _a_fecha(valor: date | datetime) -> date:
    if isinstance(valor, datetime):
        return valor.date()
    return valor


def _calcular_plazo(fecha_venc: date, hoy: Optional[date] = None, dias_alerta: int = 15) -> tuple[int, EstadoVencimiento]:
    fecha_hoy = hoy or date.today()
    dias_restantes = (fecha_venc - fecha_hoy).days

    if dias_restantes < 0:
        estado = EstadoVencimiento.VENCIDO
    elif dias_restantes < dias_alerta:
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

    # 1. Personal (Certificados de personal activo)
    if origen in (None, OrigenVencimiento.PERSONAL):
        certificados = (
            db.query(Certificado)
            .join(Personal, Certificado.legajo_persona == Personal.legajo)
            .filter(Personal.activo == True)  # noqa: E712
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

    # 2. Equipos (Planes de calibración / mantenimiento)
    if origen in (None, OrigenVencimiento.EQUIPO):
        planes = db.query(Plan_de_Calibracion).all()
        for plan in planes:
            fecha_raw = plan.fecha_vencimiento or plan.fecha_mantenimiento
            if not fecha_raw:
                continue
            if plan.equipo and getattr(plan.equipo, "activo", True) is False:
                continue
            fecha_v = _a_fecha(fecha_raw)
            periodo = plan.periodicidad_De_cambio
            if not periodo or periodo <= 0:
                if plan.fecha_vencimiento and plan.fecha_mantenimiento:
                    periodo = (_a_fecha(plan.fecha_vencimiento) - _a_fecha(plan.fecha_mantenimiento)).days
            dias_alerta = max(round((periodo or 0) * 0.1), 2)
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
                    dias, est = _calcular_plazo(fecha_v, hoy)
                    items.append(
                        VencimientoConsolidadoItem(
                            id=f"documento-{doc.id}",
                            origen=OrigenVencimiento.DOCUMENTO,
                            concepto=f"{doc.titulo} (v{ver.version})",
                            responsable=ver.usuario or "admin",
                            referencia_id=doc.id,
                            fecha=fecha_v,
                            dias_restantes=dias,
                            estado=est,
                        )
                    )
            else:
                ultima = doc.ultima_version_vigente
                if ultima and ultima.fecha_vencimiento:
                    fecha_v = _a_fecha(ultima.fecha_vencimiento)
                    if hoy > fecha_v:
                        dias, _ = _calcular_plazo(fecha_v, hoy)
                        items.append(
                            VencimientoConsolidadoItem(
                                id=f"documento-{doc.id}",
                                origen=OrigenVencimiento.DOCUMENTO,
                                concepto=f"{doc.titulo} (v{ultima.version})",
                                responsable=ultima.usuario or "admin",
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
