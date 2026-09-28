import React, { useEffect, useState } from 'react';
import type { InsumoConId } from "./tipos";
import '../../styles/formularioAlta.css';

interface ListadoInsumosProps {
  onNuevoClick?: () => void;
  onVerClick?: (insumo: InsumoConId) => void;
  onEditarClick?: (insumo: InsumoConId) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "No aplica";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('es-AR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
  } catch {
    return dateStr;
  }
};

export const ListadoInsumos: React.FC<ListadoInsumosProps> = ({
  onNuevoClick,
  onVerClick,
  onEditarClick,
}) => {
  const [insumos, setInsumos] = useState<InsumoConId[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroUnidad, setFiltroUnidad] = useState('TODOS');
  const [filtroVencimiento, setFiltroVencimiento] = useState('TODOS');

  const handleEliminar = async (id?: number) => {
    if (!id) return;
    if (!window.confirm('¿Seguro que desea eliminar este insumo?')) return;

    try {
      const res = await fetch(`${API_URL}/insumos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInsumos((prev) => prev.filter((i) => i.id !== id));
      } else {
        alert('No se pudo eliminar el insumo');
      }
    } catch {
      alert('Error de conexión al eliminar el insumo');
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`${API_URL}/insumos/`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore) setInsumos(data);
        } else {
          if (!ignore) setInsumos([]);
        }
      } catch {
        if (!ignore) setInsumos([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const estadoVencimiento = (fechaVencimiento?: string | null) => {
    if (!fechaVencimiento) return 'SIN_VENCIMIENTO';
    const dias = (new Date(fechaVencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (dias < 0) return 'VENCIDO';
    if (dias <= 15) return 'POR_VENCER';
    return 'VIGENTE';
  };

  const insumosFiltrados = insumos.filter((i) => {
    const term = busqueda.toLowerCase();
    const coincideBusqueda =
      (i.nombre?.toLowerCase().includes(term) ?? false) ||
      (i.lote?.toLowerCase().includes(term) ?? false);
    const coincideUnidad = filtroUnidad === 'TODOS' || i.medida?.toUpperCase() === filtroUnidad;
    const coincideVencimiento =
      filtroVencimiento === 'TODOS' || estadoVencimiento(i.fechaVencimiento) === filtroVencimiento;
    return coincideBusqueda && coincideUnidad && coincideVencimiento;
  });

  const campoFiltroStyle: React.CSSProperties = {
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    backgroundColor: 'var(--code-bg)',
    fontSize: '14px',
    color: 'var(--text-h)',
    outline: 'none',
  };

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Insumos</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>

        {onNuevoClick && (
          <button onClick={onNuevoClick} className="btn-guardar">
            + Agregar Insumo
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por nombre o lote..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ ...campoFiltroStyle, flex: 1, minWidth: '220px' }}
        />

        <select
          value={filtroUnidad}
          onChange={(e) => setFiltroUnidad(e.target.value)}
          style={{ ...campoFiltroStyle, cursor: 'pointer' }}
        >
          <option value="TODOS">Todas las unidades</option>
          <option value="KILOGRAMOS">Kilogramos</option>
          <option value="GRAMOS">Gramos</option>
          <option value="LITROS">Litros</option>
          <option value="MILILITROS">Mililitros</option>
          <option value="UNIDADES">Unidades</option>
        </select>

        <select
          value={filtroVencimiento}
          onChange={(e) => setFiltroVencimiento(e.target.value)}
          style={{ ...campoFiltroStyle, cursor: 'pointer' }}
        >
          <option value="TODOS">Todos los vencimientos</option>
          <option value="VIGENTE">Vigentes</option>
          <option value="POR_VENCER">Por vencer (15 días)</option>
          <option value="VENCIDO">Vencidos</option>
          <option value="SIN_VENCIMIENTO">Sin vencimiento</option>
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Lote</th>
              <th>Stock</th>
              <th>Recibido</th>
              <th>Unidad</th>
              <th>Recepción</th>
              <th>Vencimiento</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando insumos...
                </td>
              </tr>
            ) : insumosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                  No se encontraron insumos.
                </td>
              </tr>
            ) : (
              insumosFiltrados.map((i) => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 500 }}>{i.nombre}</td>
                  <td>{i.lote}</td>
                  <td>{i.stock}</td>
                  <td>{i.cantRecibida}</td>
                  <td>{i.medida}</td>
                  <td>{formatDate(i.fechaRecepcion)}</td>
                  <td>{formatDate(i.fechaVencimiento)}</td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        className="btn-icon btn-ver"
                        title="Ver detalles"
                        onClick={() => onVerClick?.(i)}
                      >
                        👁
                      </button>
                      <button
                        className="btn-icon btn-editar"
                        title="Editar"
                        onClick={() => onEditarClick?.(i)}
                      >
                        ✎
                      </button>
                      <button
                        className="btn-icon btn-eliminar"
                        title="Eliminar"
                        onClick={() => handleEliminar(i.id)}
                      >
                        🗑
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
