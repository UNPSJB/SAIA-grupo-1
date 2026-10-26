import { ConsumoHistoricoInsumos } from '../insumos_quimicos/ConsumoHistoricoInsumos';
import React from 'react';
import type { TipoDetalleEstadisticas } from './tipos';
import '../../styles/dashboard.css';

interface VistaDetalleEstadisticasProps {
  tipo: TipoDetalleEstadisticas;
  onVolver: () => void;
}

const CONFIGURACION_VISTA: Record<
  TipoDetalleEstadisticas,
  { titulo: string; subtitulo: string; descripcion: string }
> = {
  vencimientos: {
    titulo: 'Estadísticas Detalladas de Vencimientos',
    subtitulo: 'Análisis cronológico y proyección de vencimientos de personal, equipos y documentos',
    descripcion:
      'Esta vista contendrá reportes avanzados, proyecciones cronológicas, alertas por criticidad y tasas de renovación.',
  },
  tareas: {
    titulo: 'Estadísticas Detalladas de Cumplimiento de Tareas',
    subtitulo: 'Desglose y evolución temporal del cumplimiento de tareas de checklist',
    descripcion:
      'Esta vista contendrá métricas por operador, comparativas temporales por turno y porcentajes de cumplimiento por sector.',
  },
  incidentes: {
    titulo: 'Estadísticas Detalladas de Incidentes',
    subtitulo: 'Tiempos de resolución, recurrencia y categorización de incidentes',
    descripcion:
      'Esta vista contendrá gráficos históricos de incidentes por área, tiempos medios de cierre y análisis de recurrencia.',
  },
  insumos: {
    titulo: 'Estadísticas Detalladas de Consumo de Insumos Químicos',
    subtitulo: 'Histórico de utilización de insumos químicos por sector y frecuencia',
    descripcion:
      'Esta vista contendrá curvas históricas de consumo por químico, detección de desvíos y costes asociados.',
  },
  produccion: {
    titulo: 'Estadísticas Detalladas de Producción',
    subtitulo: 'Volumen de elaboración, control de lotes y rendimiento productivo',
    descripcion:
      'Esta vista contendrá el seguimiento de lotes elaborados, índices de productividad, análisis de mermas y balances de materia.',
  },
};

const obtenerTamanoFuente = (texto: string): string => {
  if (texto.length > 50) return 'clamp(1.15rem, 1.8vw, 1.35rem)';
  if (texto.length > 40) return 'clamp(1.3rem, 2.1vw, 1.55rem)';
  if (texto.length > 30) return 'clamp(1.45rem, 2.4vw, 1.75rem)';
  return 'clamp(1.65rem, 2.8vw, 2rem)';
};

export const VistaDetalleEstadisticas: React.FC<VistaDetalleEstadisticasProps> = ({
  tipo,
  onVolver,
}) => {
  if (tipo === 'insumos') {
    return (
      <ConsumoHistoricoInsumos
        onVolver={onVolver}
        textoVolver="Volver al Dashboard"
        mostrarBreadcrumbDashboard={true}
      />
    );
  }

  const config = CONFIGURACION_VISTA[tipo];

  return (
    <div className="modulo-container dashboard-vista-detalle">
      <nav className="dashboard-breadcrumb" aria-label="Breadcrumb">
        <button
          type="button"
          className="dashboard-breadcrumb-link"
          onClick={onVolver}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="7" height="9" x="3" y="3" rx="1.5" />
            <rect width="7" height="5" x="14" y="3" rx="1.5" />
            <rect width="7" height="9" x="14" y="12" rx="1.5" />
            <rect width="7" height="5" x="3" y="16" rx="1.5" />
          </svg>
          Inicio
        </button>
        <span className="dashboard-breadcrumb-separador">/</span>
        <span className="dashboard-breadcrumb-actual">{config.titulo}</span>
      </nav>

      <div className="dashboard-vista-detalle-header">
        <div>
          <button
            type="button"
            className="dashboard-btn-volver"
            onClick={onVolver}
          >
            &larr; Volver al Dashboard
          </button>
          <h1
            style={{
              fontSize: obtenerTamanoFuente(config.titulo),
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: '1.35',
              margin: '1.25rem 0 0.75rem 0',
            }}
          >
            {config.titulo}
          </h1>
          <div
            className="subtitulo"
            style={{
              lineHeight: '1.5',
              marginTop: '0.4rem',
            }}
          >
            {config.subtitulo}
          </div>
        </div>
      </div>

      <div className="dashboard-vista-detalle-placeholder">
        <div className="dashboard-vista-detalle-icon">
          <svg
            width="56"
            height="56"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
        </div>
        <h3>Vista de estadísticas detalladas en preparación</h3>
        <p>{config.descripcion}</p>
        <button
          type="button"
          className="dashboard-btn-volver"
          style={{ marginTop: '1rem' }}
          onClick={onVolver}
        >
          Volver al Panel Principal
        </button>
      </div>
    </div>
  );
};

