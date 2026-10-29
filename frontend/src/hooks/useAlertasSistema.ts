import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { formatearAntiguedad } from '../views/incidentes/tipos';

export type TipoAlerta = 'incidente' | 'vencimiento';
export type SeveridadAlerta = 'critica' | 'alta' | 'media' | 'info';

export interface AlertaItem {
  id: string;
  tipo: TipoAlerta;
  severidad: SeveridadAlerta;
  titulo: string;
  descripcion: string;
  origen: 'incidente' | 'personal' | 'equipo' | 'documento';
  categoria: string;
  categoriaId?: number;
  fecha: string;
  tiempoTexto: string;
  diasRestantes?: number;
  horasAbierto?: number;
  referenciaId?: number | string;
  responsable?: string;
  nivelUrgenciaOriginal?: string;
  estadoOriginal?: string;
}

interface IncidenteAbiertoRaw {
  id: number;
  descripcion: string;
  tipo?: string;
  nombre_tipo?: string;
  categoria_id?: number;
  categoria_nombre?: string;
  creado_el: string;
  horas_abierto: number;
  nivel_urgencia: 'CRITICO' | 'ATENCION' | 'RECIENTE';
  estado: string;
  reportado_por_id: number;
  nombre_reportante: string;
}

interface VencimientoRaw {
  id: string;
  origen: 'personal' | 'equipo' | 'documento';
  concepto: string;
  responsable: string;
  referencia_id: number;
  fecha: string;
  dias_restantes: number;
  estado: 'vencido' | 'proximo' | 'vigente';
}

const ORDEN_SEVERIDAD: Record<SeveridadAlerta, number> = {
  critica: 0,
  alta: 1,
  media: 2,
  info: 3,
};

export function useAlertasSistema() {
  const { esAdministrador } = useAuth();
  const [alertas, setAlertas] = useState<AlertaItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarAlertas = useCallback(async () => {
    if (!esAdministrador) {
      setAlertas([]);
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const [resIncidentes, resVencidos, resProximos] = await Promise.all([
        apiFetch('/incidentes/abiertos').catch(() => null),
        apiFetch('/vencimientos/?estado=vencido').catch(() => null),
        apiFetch('/vencimientos/?estado=proximo').catch(() => null),
      ]);

      const listaItems: AlertaItem[] = [];

      if (resIncidentes && resIncidentes.ok) {
        const incidentes: IncidenteAbiertoRaw[] = await resIncidentes.json();
        for (const inc of incidentes) {
          const severidad: SeveridadAlerta =
            inc.nivel_urgencia === 'CRITICO'
              ? 'critica'
              : inc.nivel_urgencia === 'ATENCION'
              ? 'alta'
              : 'media';

          const catNombre = inc.categoria_nombre || inc.nombre_tipo || 'General';

          listaItems.push({
            id: `inc-${inc.id}`,
            tipo: 'incidente',
            severidad,
            titulo: `Incidente sin resolver #${inc.id}`,
            descripcion: inc.descripcion,
            origen: 'incidente',
            categoria: catNombre,
            categoriaId: inc.categoria_id,
            fecha: inc.creado_el,
            horasAbierto: inc.horas_abierto,
            tiempoTexto: `Abierto hace ${formatearAntiguedad(inc.horas_abierto)}`,
            referenciaId: inc.id,
            responsable: `${inc.nombre_reportante || 'Operador'} (Legajo #${inc.reportado_por_id ?? '-'})`,
            nivelUrgenciaOriginal: inc.nivel_urgencia,
            estadoOriginal: inc.estado,
          });
        }
      }

      if (resVencidos && resVencidos.ok) {
        const vencidos: VencimientoRaw[] = await resVencidos.json();
        for (const v of vencidos) {
          const dias = v.dias_restantes;
          const textoDias =
            dias < 0
              ? `Vencido hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`
              : dias === 0
              ? 'Venció hoy'
              : `Venció hace ${dias} días`;

          listaItems.push({
            id: `venc-${v.id}`,
            tipo: 'vencimiento',
            severidad: 'critica',
            titulo: `${v.concepto}`,
            descripcion: `${v.responsable} · Registro #${v.referencia_id}`,
            origen: v.origen,
            categoria: v.origen === 'personal' ? 'Personal' : v.origen === 'equipo' ? 'Equipo' : 'Documento',
            fecha: v.fecha,
            diasRestantes: v.dias_restantes,
            tiempoTexto: textoDias,
            referenciaId: v.referencia_id,
            responsable: v.responsable,
            estadoOriginal: v.estado,
          });
        }
      }

      if (resProximos && resProximos.ok) {
        const proximos: VencimientoRaw[] = await resProximos.json();
        for (const v of proximos) {
          const dias = v.dias_restantes;
          const severidad: SeveridadAlerta = dias <= 7 ? 'alta' : 'media';
          const textoDias =
            dias === 0
              ? 'Vence hoy'
              : dias === 1
              ? 'Vence mañana'
              : `Vence en ${dias} días`;

          listaItems.push({
            id: `venc-${v.id}`,
            tipo: 'vencimiento',
            severidad,
            titulo: `${v.concepto}`,
            descripcion: `${v.responsable} · Registro #${v.referencia_id}`,
            origen: v.origen,
            categoria: v.origen === 'personal' ? 'Personal' : v.origen === 'equipo' ? 'Equipo' : 'Documento',
            fecha: v.fecha,
            diasRestantes: v.dias_restantes,
            tiempoTexto: textoDias,
            referenciaId: v.referencia_id,
            responsable: v.responsable,
            estadoOriginal: v.estado,
          });
        }
      }

      listaItems.sort((a, b) => {
        const diffSev = ORDEN_SEVERIDAD[a.severidad] - ORDEN_SEVERIDAD[b.severidad];
        if (diffSev !== 0) return diffSev;

        if (a.tipo === 'incidente' && b.tipo === 'incidente') {
          return (b.horasAbierto ?? 0) - (a.horasAbierto ?? 0);
        }

        if (a.tipo === 'vencimiento' && b.tipo === 'vencimiento') {
          return (a.diasRestantes ?? 0) - (b.diasRestantes ?? 0);
        }

        return 0;
      });

      setAlertas(listaItems);
    } catch {
      setError('No se pudieron sincronizar las alertas del sistema.');
    } finally {
      setCargando(false);
    }
  }, [esAdministrador]);

  useEffect(() => {
    cargarAlertas();

    const intervalo = setInterval(() => {
      cargarAlertas();
    }, 45000);

    return () => clearInterval(intervalo);
  }, [cargarAlertas]);

  const totalAlertas = alertas.length;
  const totalCriticas = alertas.filter((a) => a.severidad === 'critica').length;
  const totalAltas = alertas.filter((a) => a.severidad === 'alta').length;
  const totalMedias = alertas.filter((a) => a.severidad === 'media').length;
  const totalIncidentes = alertas.filter((a) => a.tipo === 'incidente').length;
  const totalVencimientos = alertas.filter((a) => a.tipo === 'vencimiento').length;
  const incidentesCriticos = alertas.filter(
    (a) => a.tipo === 'incidente' && a.severidad === 'critica'
  ).length;
  const vencimientosVencidos = alertas.filter(
    (a) => a.tipo === 'vencimiento' && (a.diasRestantes ?? 0) <= 0
  ).length;
  const vencimientosProximos = alertas.filter(
    (a) => a.tipo === 'vencimiento' && (a.diasRestantes ?? 0) > 0
  ).length;

  return {
    alertas,
    totalAlertas,
    totalCriticas,
    totalAltas,
    totalMedias,
    totalIncidentes,
    totalVencimientos,
    incidentesCriticos,
    vencimientosVencidos,
    vencimientosProximos,
    cargando,
    error,
    refrescar: cargarAlertas,
  };
}
