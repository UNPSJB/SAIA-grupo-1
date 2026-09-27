import React, { useEffect, useState } from 'react';
import type { Auditoria } from "./tipos";
import '../../styles/formularioAlta.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const formatDate = (dateStr?: string | null) => {
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

export const ListadoAuditoria: React.FC = () => {
  const [auditorias, setAuditorias] = useState<Auditoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`${API_URL}/auditoria/`);
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

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Auditoría</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Tabla</th>
              <th>Registro</th>
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
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando auditoría...
                </td>
              </tr>
            ) : auditorias.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  No hay registros de auditoría.
                </td>
              </tr>
            ) : (
              auditorias.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500 }}>{a.tabla}</td>
                  <td>{a.registro_id}</td>
                  <td>{a.accion}</td>
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
