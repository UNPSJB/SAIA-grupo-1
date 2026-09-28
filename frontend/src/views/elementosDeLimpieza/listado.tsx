import React, { useEffect, useState } from 'react';
import type { ElementoDeLimpieza } from './tipos';
import '../../styles/formularioAlta.css';

interface ListadoElementosLimpiezaProps {
  onNuevoClick: () => void;
  onDetalleClick: (id: number) => void;
  onEditarClick: (id: number) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ListadoElementosLimpieza: React.FC<ListadoElementosLimpiezaProps> = ({
  onNuevoClick,
  onDetalleClick,
  onEditarClick,
}) => {
  const [elementos, setElementos] = useState<ElementoDeLimpieza[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  const fetchElementos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/elementosDeLimpieza/`);
      if (res.ok) {
        const data = await res.json();
        setElementos(data);
      } else {
        setElementos([]);
      }
    } catch {
      setElementos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElementos();
  }, []);

  // Formatear la fecha que viene en formato ISO desde el backend
  const formatearFecha = (fechaStr?: string | null) => {
    if (!fechaStr) return 'Sin fecha';
    try {
      const d = new Date(fechaStr);
      return isNaN(d.getTime())
        ? fechaStr
        : d.toLocaleDateString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
    } catch {
      return fechaStr;
    }
  };

  // Chequea si la fecha ya expiró para resaltar la alerta
  type EstadoVencimiento = 'vencido' | 'proximo' | 'al_dia' | 'sin_fecha';

  const calcularEstadoVencimiento = (fechaCambioStr?: string | null): EstadoVencimiento => {
    if (!fechaCambioStr) return 'sin_fecha';

    const fechaLimite = new Date(fechaCambioStr);
    const hoy = new Date();

    const diffTiempo = fechaLimite.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

    if (diffDias <= 0) {
      return 'vencido';
    } else if (diffDias <= 2) {
      return 'proximo';
    }

    return 'al_dia';
  };

  const handleEfectuarCambio = async (id: number, nombre: string) => {
    const confirmacion = window.confirm(`¿Confirmar que cambiaste "${nombre}"? Se actualizará la próxima fecha.`);
    if (!confirmacion) return;

    try {
      const res = await fetch(`${API_URL}/elementosDeLimpieza/${id}/cambiar`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (res.ok) {
        const elementoActualizado: ElementoDeLimpieza = await res.json();
        setElementos((prev) =>
          prev.map((elem) => (elem.id === id ? elementoActualizado : elem))
        );
      } else {
        alert('No se pudo registrar el cambio.');
      }
    } catch {
      alert('Error al conectar con el servidor.');
    }
  };

  // Filtrado reactivo en memoria
  const elementosFiltrados = elementos.filter((elem) => {
    const term = searchTerm.toLowerCase().trim();
    const matchNombre = !term || elem.nombre.toLowerCase().includes(term);

    const matchEstado =
      filtroEstado === 'TODOS' ||
      (filtroEstado === 'ACTIVO' ? elem.activo : !elem.activo);

    return matchNombre && matchEstado;
  });

  const campoFiltroStyle: React.CSSProperties = {
    padding: '10px 14px',
    border: '1px solid var(--border, #e5e7eb)',
    borderRadius: '6px',
    backgroundColor: 'var(--code-bg, #f7f7f5)',
    fontSize: '14px',
    color: 'var(--text-h, #1f2937)',
    outline: 'none',
  };

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Elementos de Limpieza</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>

        {onNuevoClick && (
          <button onClick={onNuevoClick} className="btn-guardar">
            + Agregar Elemento
          </button>
        )}
      </div>

      {/* Barra de Filtros */}
      <div
        style={{
          display: 'flex',
          gap: '14px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ ...campoFiltroStyle, minWidth: '280px', flex: '1 1 300px' }}
        />

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={{ ...campoFiltroStyle, cursor: 'pointer', minWidth: '160px' }}
        >
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activos</option>
          <option value="INACTIVO">Inactivos</option>
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Frecuencia de Cambio</th>
              <th>Próximo Recambio</th>
              <th>Estado</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando elementos de limpieza...
                </td>
              </tr>
            ) : elementosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  No se encontraron elementos de limpieza.
                </td>
              </tr>
            ) : (
              elementosFiltrados.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.nombre}</td>
                  <td>
                    {item.frecuenciaDeCambio !== null && item.frecuenciaDeCambio !== undefined
                      ? `${item.frecuenciaDeCambio} días`
                      : 'Sin especificar'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span>{formatearFecha(item.fechaCambio)}</span>

                      {/* VENCIDO */}
                      {calcularEstadoVencimiento(item.fechaCambio) === 'vencido' && (
                        <span
                          title="El elemento ha superado la fecha límite"
                          style={{
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #f87171',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          ● Vencido
                        </span>
                      )}

                      {/* PRÓXIMO A VENCER */}
                      {calcularEstadoVencimiento(item.fechaCambio) === 'proximo' && (
                        <span
                          title="Quedan 2 días o menos para el recambio"
                          style={{
                            backgroundColor: '#fef3c7',
                            color: '#d97706',
                            border: '1px solid #fcd34d',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          ▲ Próximo a vencer
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: item.activo ? '#dcfce7' : '#fee2e2',
                        color: item.activo ? '#166534' : '#991b1b',
                      }}
                    >
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      {item.activo && item.frecuenciaDeCambio && (
                        <button
                          type="button"
                          className="btn-icon"
                          title="Efectuar cambio (actualizar fecha)"
                          onClick={() => handleEfectuarCambio(item.id, item.nombre)}
                        >
                          ↻
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-icon"
                        title="Ver detalles"
                        onClick={() => onDetalleClick(item.id)}
                      >
                        👁
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        title="Editar"
                        onClick={() => onEditarClick(item.id)}
                      >
                        ✎
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};