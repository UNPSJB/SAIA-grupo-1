import React, { useEffect, useState } from 'react';
import type { InsumoConId } from "./tipos";
import '../../styles/formularioAlta.css';
import { ConfirmAlertDialog } from '../../components/ui/alert-dialog';

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

  const [idAEliminar, setIdAEliminar] = useState<number | null>(null);
  const [nombreAEliminar, setNombreAEliminar] = useState<string>('');
  const [dialogAbierto, setDialogAbierto] = useState(false);

  const abrirConfirmacion = (i: InsumoConId) => {
    setIdAEliminar(i.id);
    setNombreAEliminar(i.nombre);
    setDialogAbierto(true);
  };

  const ejecutarEliminar = async () => {
    if (!idAEliminar) return;
    try {
      const res = await fetch(`${API_URL}/insumos/${idAEliminar}`, { method: 'DELETE' });
      if (res.ok) {
        setInsumos((prev) => prev.filter((i) => i.id !== idAEliminar));
      } else {
        alert('No se pudo eliminar el ingrediente');
      }
    } catch {
      alert('Error de conexión al eliminar el ingrediente');
    } finally {
      setDialogAbierto(false);
      setIdAEliminar(null);
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

  const insumosFiltrados = insumos.filter((i) => {
    const term = busqueda.toLowerCase().trim();
    if (!term) return true;
    return (
      i.nombre.toLowerCase().includes(term) ||
      i.lote.toLowerCase().includes(term)
    );
  });

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Ingredientes</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>

        {onNuevoClick && (
          <button onClick={onNuevoClick} className="btn-guardar">
            + Agregar Ingrediente
          </button>
        )}
      </div>

      <div className="filtros-top-bar">
        <input
          type="text"
          placeholder="Buscar ingrediente por nombre o lote..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input-busqueda"
        />
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
                  Cargando ingredientes...
                </td>
              </tr>
            ) : insumosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                  {busqueda ? 'No se encontraron ingredientes que coincidan con la búsqueda.' : 'No hay ingredientes registrados.'}
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
                        onClick={() => abrirConfirmacion(i)}
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

      <ConfirmAlertDialog
        open={dialogAbierto}
        title="¿Eliminar ingrediente?"
        description={`¿Seguro que desea eliminar "${nombreAEliminar}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={ejecutarEliminar}
        onCancel={() => {
          setDialogAbierto(false);
          setIdAEliminar(null);
        }}
      />
    </div>
  );
};
