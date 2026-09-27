import React, { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardResumen, Periodo } from './tipos';
import '../../styles/dashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Paleta validada con el skill de dataviz (contraste + CVD) contra el fondo claro de la app.
const COLOR_HECHAS = '#aa3bff'; // var(--accent) de la app
const COLOR_PENDIENTES = '#d98c1f';

export const Panel: React.FC = () => {
  const [datos, setDatos] = useState<DashboardResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>('semana');

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/dashboard/resumen?periodo=${periodo}`);
        if (!cancelado && res.ok) {
          setDatos(await res.json());
        }
      } catch (e) {
        console.error('Error al cargar el dashboard:', e);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
  }, [periodo]);

  if (loading || !datos) {
    return (
      <div className="modulo-container">
        <div className="modulo-header">
          <h1>Inicio</h1>
          <div className="subtitulo">Panel de estadísticas</div>
        </div>
        <p>Cargando estadísticas...</p>
      </div>
    );
  }

  const { cumplimiento_actual, consumo_insumos } = datos;

  const datosDona = [
    { name: 'Hechas', value: cumplimiento_actual.hechas },
    { name: 'Pendientes', value: cumplimiento_actual.pendientes },
  ];

  return (
    <div className="modulo-container dashboard-container">
      <div className="modulo-header">
        <h1>Inicio</h1>
        <div className="subtitulo">Panel de estadísticas</div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h2>Porcentaje de Cumplimiento de Tareas del Período Actual</h2>
            <select
              className="dashboard-select"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as Periodo)}
            >
              <option value="semana">Semanal</option>
              <option value="mes">Mensual</option>
            </select>
          </div>
          <div className="dashboard-dona-wrapper">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={datosDona}
                  dataKey="value"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={2}
                  stroke="none"
                >
                  <Cell fill={COLOR_HECHAS} />
                  <Cell fill={COLOR_PENDIENTES} />
                </Pie>
                <Tooltip />
                <Legend verticalAlign="middle" align="right" layout="vertical" />
              </PieChart>
            </ResponsiveContainer>
            <div className="dashboard-dona-centro">{cumplimiento_actual.porcentaje}%</div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h2>Consumo de Insumos de Limpieza</h2>
          </div>
          {consumo_insumos.length === 0 ? (
            <p className="dashboard-sin-datos">Todavía no hay tareas completadas con insumos cargados en este período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={consumo_insumos}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="nombre" stroke="var(--text)" fontSize={12} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis stroke="var(--text)" fontSize={12} />
                <Tooltip />
                <Bar dataKey="cantidad" fill={COLOR_HECHAS} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
