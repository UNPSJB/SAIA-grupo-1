import React, { useEffect, useState } from 'react';
import type { TipoCertificado } from './tipos';
import { ConfirmAlertDialog } from '../../components/ui/alert-dialog';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';

interface ListadoTiposCertificadosProps {
  onNuevoClick: () => void;
  onDetalleClick: (id: number) => void;
}

type CriterioOrden = 'id' | 'nombre';

export const ListadoTiposCertificados: React.FC<ListadoTiposCertificadosProps> = ({
  onNuevoClick,
  onDetalleClick,
}) => {
  const [tipos, setTipos] = useState<TipoCertificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados para búsqueda y ordenamiento
  const [searchTerm, setSearchTerm] = useState('');
  const [ordenarPor, setOrdenarPor] = useState<CriterioOrden>('id');

  // Estado para diálogo de confirmación de eliminación física
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipoAEliminar, setTipoAEliminar] = useState<TipoCertificado | null>(null);

  const fetchTipos = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/certificados/tipos/`);
      if (res.ok) {
        const data = await res.json();
        setTipos(data);
      } else {
        setTipos([]);
      }
    } catch {
      setTipos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTipos();
  }, []);

  const abrirConfirmacionEliminar = (tipo: TipoCertificado) => {
    setErrorMsg(null);
    setTipoAEliminar(tipo);
    setDialogOpen(true);
  };

  const ejecutarEliminar = async () => {
    if (!tipoAEliminar) return;
    const { id } = tipoAEliminar;
    setDialogOpen(false);
    setTipoAEliminar(null);

    try {
      const res = await apiFetch(`/certificados/tipos/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setTipos((prev) => prev.filter((t) => t.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        let detalle = 'No se pudo eliminar el tipo de certificado.';
        if (typeof data.detail === 'string') {
          detalle = data.detail;
        }
        setErrorMsg(detalle);
      }
    } catch {
      setErrorMsg('Error al conectar con el servidor.');
    }
  };

  // Filtrado reactivo en memoria por nombre y ordenamiento por ID o Nombre
  const tiposFiltradosYOrdenados = tipos
    .filter((t) => {
      const term = searchTerm.toLowerCase().trim();
      return !term || t.nombre.toLowerCase().includes(term);
    })
    .sort((a, b) => {
      if (ordenarPor === 'nombre') {
        return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
      }
      return a.id - b.id; // Por defecto ordena por ID ascendente
    });

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Tipos de Certificados</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>

        {onNuevoClick && (
          <button onClick={onNuevoClick} className="btn-guardar">
            + Agregar Tipo
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="alerta-error" style={{ marginBottom: '1rem' }}>
          {errorMsg}
        </div>
      )}

      {/* Barra de Filtros con búsqueda y desplegable de orden */}
      <div className="filtros-top-bar">
        <input
          type="text"
          className="input-busqueda"
          placeholder="Buscar por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className="select-filtro"
          value={ordenarPor}
          onChange={(e) => setOrdenarPor(e.target.value as CriterioOrden)}
        >
          <option value="id">Ordenar por ID</option>
          <option value="nombre">Ordenar por Nombre</option>
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th style={{ width: '100px' }}>ID</th>
              <th>Nombre</th>
              <th className="acciones-col" style={{ width: '140px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando tipos de certificados...
                </td>
              </tr>
            ) : tiposFiltradosYOrdenados.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                  No se encontraron tipos de certificados.
                </td>
              </tr>
            ) : (
              tiposFiltradosYOrdenados.map((item) => (
                <tr key={item.id}>
                  <td>#{item.id}</td>
                  <td>
                    <strong>{item.nombre}</strong>
                  </td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        type="button"
                        className="btn-icon btn-ver"
                        title="Ver detalles"
                        onClick={() => onDetalleClick(item.id)}
                      >
                        👁
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-eliminar"
                        title="Eliminar tipo"
                        style={{ color: '#dc2626' }}
                        onClick={() => abrirConfirmacionEliminar(item)}
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
        open={dialogOpen}
        title="¿Eliminar Tipo de Certificado?"
        description={`¿Estás seguro de que deseas eliminar permanentemente el tipo "${tipoAEliminar?.nombre}"? Solo podrá eliminarse si no está asignado a ningún certificado.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={ejecutarEliminar}
        onCancel={() => {
          setDialogOpen(false);
          setTipoAEliminar(null);
        }}
      />
    </div>
  );
};