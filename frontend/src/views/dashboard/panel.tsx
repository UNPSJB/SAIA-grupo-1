import React, { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ConsumoInsumo, CumplimientoResumen, Periodo } from './tipos';
import { apiFetch } from '../../api/client';
import '../../styles/dashboard.css';const COLOR_HECHAS = '#aa3bff';
const COLOR_PENDIENTES = '#d98c1f';
const COLOR_VENCIDAS = '#dc2626';
const COLOR_VACIO = '#e5e7eb';

const UNIDADES_ESTANDAR = [
  { id: 'L', label: 'L (Litros)' },
  { id: 'ML', label: 'ML (Mililitros)' },
  { id: 'KG', label: 'KG (Kilogramos)' },
  { id: 'G', label: 'G (Gramos)' },
  { id: 'UN', label: 'UN (Unidades)' },
];

export const Panel: React.FC = () => {
  // Gráfico 1: Cumplimiento
  const [periodoCumplimiento, setPeriodoCumplimiento] = useState<Periodo>('semana');
  const [cumplimiento, setCumplimiento] = useState<CumplimientoResumen | null>(null);
  const [loadingCumplimiento, setLoadingCumplimiento] = useState(true);

  // Gráfico 2: Consumo de Insumos
  const [periodoInsumos, setPeriodoInsumos] = useState<Periodo>('semana');
  const [unidadInsumos, setUnidadInsumos] = useState<string>('L');
  const [consumoInsumos, setConsumoInsumos] = useState<ConsumoInsumo[]>([]);
  const [unidadesDisponibles, setUnidadesDisponibles] = useState<string[]>([]);
  const [loadingInsumos, setLoadingInsumos] = useState(true);

  // Cargar cumplimiento
  useEffect(() => {
    let cancelado = false;
    const cargarCumplimiento = async () => {
      setLoadingCumplimiento(true);
      try {
        const res = await apiFetch(`/dashboard/cumplimiento?periodo=${periodoCumplimiento}`);
        if (!cancelado && res.ok) {
          setCumplimiento(await res.json());
        }
      } catch (e) {
        console.error('Error al cargar cumplimiento del dashboard:', e);
      } finally {
        if (!cancelado) setLoadingCumplimiento(false);
      }
    };
    cargarCumplimiento();
    return () => {
      cancelado = true;
    };
  }, [periodoCumplimiento]);

  // Cargar consumo de insumos
  useEffect(() => {
    let cancelado = false;
    const cargarInsumos = async () => {
      setLoadingInsumos(true);
      try {
        const res = await apiFetch(`/dashboard/consumo-insumos?periodo=${periodoInsumos}&unidad=${encodeURIComponent(unidadInsumos)}`
        );
        if (!cancelado && res.ok) {
          const data = await res.json();
          setConsumoInsumos(data.consumo || []);
          if (Array.isArray(data.unidades_disponibles)) {
            setUnidadesDisponibles(data.unidades_disponibles);
          }
        }
      } catch (e) {
        console.error('Error al cargar insumos del dashboard:', e);
      } finally {
        if (!cancelado) setLoadingInsumos(false);
      }
    };
    cargarInsumos();
    return () => {
      cancelado = true;
    };
  }, [periodoInsumos, unidadInsumos]);

  // Opciones completas de unidades (estándar + detectadas en datos)
  const opcionesUnidades = [
    ...UNIDADES_ESTANDAR,
    ...unidadesDisponibles
      .filter((u) => !UNIDADES_ESTANDAR.some((std) => std.id === u))
      .map((u) => ({ id: u, label: u })),
  ];

  const totalTareas =
    (cumplimiento?.hechas || 0) +
    (cumplimiento?.pendientes || 0) +
    (cumplimiento?.vencidas || 0);

  const datosDona = [
    { name: 'Hechas', value: cumplimiento?.hechas || 0, color: COLOR_HECHAS },
    { name: 'Pendientes', value: cumplimiento?.pendientes || 0, color: COLOR_PENDIENTES },
    { name: 'Vencidas', value: cumplimiento?.vencidas || 0, color: COLOR_VENCIDAS },
  ];
  const datosFiltradosDona = datosDona.filter((d) => d.value > 0);

  return (
    <div className="modulo-container dashboard-container">
      <div className="modulo-header">
        <h1>Inicio</h1>
        <div className="subtitulo">Panel de estadísticas</div>
      </div>

      <div className="dashboard-grid">
        {/* Tarjeta 1: Cumplimiento de Tareas */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h2>Cumplimiento de Tareas</h2>
            <select
              className="dashboard-select"
              value={periodoCumplimiento}
              onChange={(e) => setPeriodoCumplimiento(e.target.value as Periodo)}
              title="Seleccionar período de cumplimiento"
            >
              <option value="dia">Diario</option>
              <option value="semana">Semanal</option>
              <option value="mes">Mensual</option>
            </select>
          </div>

          {loadingCumplimiento ? (
            <p className="dashboard-sin-datos">Cargando cumplimiento...</p>
          ) : (
            <div className="dashboard-dona-fila">
              <div className="dashboard-dona-wrapper">
                <ResponsiveContainer width={220} height={220}>
                  <PieChart>
                    {totalTareas === 0 ? (
                      <Pie
                        data={[{ name: 'Sin tareas', value: 1 }]}
                        dataKey="value"
                        innerRadius={65}
                        outerRadius={95}
                        stroke="none"
                      >
                        <Cell fill={COLOR_VACIO} />
                      </Pie>
                    ) : (
                      <Pie
                        data={datosFiltradosDona}
                        dataKey="value"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={datosFiltradosDona.length > 1 ? 2 : 0}
                        stroke="none"
                      >
                        {datosFiltradosDona.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    )}
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="dashboard-dona-centro">
                  {cumplimiento ? `${cumplimiento.porcentaje}%` : '0%'}
                </div>
              </div>

              <div className="dashboard-dona-leyenda">
                <span className="dashboard-dona-leyenda-item">
                  <i style={{ backgroundColor: COLOR_HECHAS }} /> Hechas
                  <strong>{cumplimiento?.hechas || 0}</strong>
                </span>
                <span className="dashboard-dona-leyenda-item">
                  <i style={{ backgroundColor: COLOR_PENDIENTES }} /> Pendientes
                  <strong>{cumplimiento?.pendientes || 0}</strong>
                </span>
                <span className="dashboard-dona-leyenda-item">
                  <i style={{ backgroundColor: COLOR_VENCIDAS }} /> Vencidas
                  <strong>{cumplimiento?.vencidas || 0}</strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tarjeta 2: Consumo de Insumos */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h2>Consumo de Insumos</h2>
            <div className="dashboard-header-controles">
              <select
                className="dashboard-select"
                value={periodoInsumos}
                onChange={(e) => setPeriodoInsumos(e.target.value as Periodo)}
                title="Seleccionar período de consumo de insumos"
              >
                <option value="dia">Diario</option>
                <option value="semana">Semanal</option>
                <option value="mes">Mensual</option>
              </select>
              <select
                className="dashboard-select"
                value={unidadInsumos}
                onChange={(e) => setUnidadInsumos(e.target.value)}
                title="Seleccionar unidad de medida"
              >
                {opcionesUnidades.map((opc) => (
                  <option key={opc.id} value={opc.id}>
                    {opc.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingInsumos ? (
            <p className="dashboard-sin-datos">Cargando consumo de insumos...</p>
          ) : consumoInsumos.length === 0 ? (
            <p className="dashboard-sin-datos">
              No hay tareas completadas con consumo de insumos en {unidadInsumos} para este período.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={consumoInsumos}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="nombre"
                  stroke="var(--text)"
                  fontSize={12}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  stroke="var(--text)"
                  fontSize={12}
                  unit={` ${unidadInsumos}`}
                />
                <Tooltip
                  formatter={(valor: any) => [`${valor} ${unidadInsumos}`, 'Consumo']}
                  labelFormatter={(nombre: any) => `Insumo: ${nombre}`}
                />
                <Bar dataKey="cantidad" fill={COLOR_HECHAS} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

