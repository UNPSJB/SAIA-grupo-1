import React, { useEffect, useState } from 'react';
import type { Auditoria } from "./tipos";
import { apiFetch } from '../../api/client';
import '../../styles/formularioAlta.css';const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "No aplica";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleString('es-AR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
  } catch {
    return dateStr;
  }
};

const getBadgeClass = (accion?: string) => {
  switch (accion?.toUpperCase()) {
    case 'CREAR':
      return 'badge-status crear';
    case 'MODIFICAR':
      return 'badge-status modificar';
    case 'ELIMINAR':
      return 'badge-status eliminar';
    default:
      return 'badge-status';
  }
};

export const ListadoAuditoria: React.FC = () => {
  const [auditorias, setAuditorias] = useState<Auditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroAccion, setFiltroAccion] = useState<string>('TODAS');
  const [filtroTabla, setFiltroTabla] = useState<string>('TODAS');

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await apiFetch(`/auditoria/`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore) setAuditorias(data);
        } else {
          if (!ignore) setAuditorias([]);
        }
      } catch {
        if (!ignore) setAuditorias([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const tablasDisponibles = Array.from(
    new Set(auditorias.map((a) => a.tabla).filter(Boolean))
  ).sort();

  const auditoriasFiltradas = auditorias.filter((a) => {
    const term = busqueda.toLowerCase().trim();
    const accionUpper = (a.accion ?? '').toUpperCase();
    const tablaStr = a.tabla ?? '';
    const matchBusqueda =
      !term ||
      tablaStr.toLowerCase().includes(term) ||
      accionUpper.toLowerCase().includes(term) ||
      a.campo?.toLowerCase().includes(term) ||
      a.valor_previo?.toLowerCase().includes(term) ||
      a.valor_posterior?.toLowerCase().includes(term) ||
      String(a.registro_id).includes(term);

    const matchAccion =
      filtroAccion === 'TODAS' ||
      accionUpper === filtroAccion.toUpperCase();

    const matchTabla =
      filtroTabla === 'TODAS' ||
      tablaStr.toLowerCase() === filtroTabla.toLowerCase();

    return matchBusqueda && matchAccion && matchTabla;
  });

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Auditoría</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="filtros-top-bar">
        <input
          type="text"
          className="input-busqueda"
          placeholder="Buscar por tabla, acción, campo, ID o valor..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <select
          className="select-filtro"
          value={filtroAccion}
          onChange={(e) => setFiltroAccion(e.target.value)}
        >
          <option value="TODAS">Todas las acciones</option>
          <option value="CREAR">Crear</option>
          <option value="MODIFICAR">Modificar</option>
          <option value="ELIMINAR">Eliminar</option>
        </select>

        <select
          className="select-filtro"
          value={filtroTabla}
          onChange={(e) => setFiltroTabla(e.target.value)}
        >
          <option value="TODAS">Todas las tablas</option>
          {tablasDisponibles.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Tabla</th>
              <th>Acción</th>
              <th>Campo</th>
              <th>Valor previo</th>
              <th>Valor posterior</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando auditoría...
                </td>
              </tr>
            ) : auditoriasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  {busqueda || filtroAccion !== 'TODAS' || filtroTabla !== 'TODAS'
                    ? 'No se encontraron registros de auditoría con los filtros aplicados.'
                    : 'No hay registros de auditoría.'}
                </td>
              </tr>
            ) : (
              auditoriasFiltradas.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500 }}>
                    {a.tabla}
                    <span style={{ marginLeft: '6px', fontSize: '0.85em', color: 'var(--text-muted, #6b7280)' }}>
                      #{a.registro_id}
                    </span>
                  </td>
                  <td>
                    <span className={getBadgeClass(a.accion)}>
                      {(a.accion ?? '').toUpperCase()}
                    </span>
                  </td>
                  <td>{a.campo ?? "No aplica"}</td>
                  <td>{a.valor_previo ?? "No aplica"}</td>
                  <td>{a.valor_posterior ?? "No aplica"}</td>
                  <td>{formatDate(a.creado_el)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
