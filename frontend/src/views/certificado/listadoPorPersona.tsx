import React, { useEffect, useState } from 'react';
import type { Certificado } from './tipos';
import { ConfirmAlertDialog } from '../../components/ui/alert-dialog';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';

interface ListadoCertificadosPorPersonaProps {
  legajoPersona: number;
  nombrePersona?: string;
  onNuevoClick: () => void;
  onDetalleClick: (id: number) => void;
  onEditarClick: (id: number) => void;
  onVolver: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ListadoCertificadosPorPersona: React.FC<ListadoCertificadosPorPersonaProps> = ({
  legajoPersona,
  nombrePersona,
  onNuevoClick,
  onDetalleClick,
  onEditarClick,
  onVolver,
}) => {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [certificadoAEliminar, setCertificadoAEliminar] = useState<{ id: number; tipo: string } | null>(null);

  const fetchCertificados = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/certificados/?legajo_persona=${legajoPersona}`);
      if (res.ok) {
        const data = await res.json();
        setCertificados(data);
      } else {
        setCertificados([]);
      }
    } catch {
      setCertificados([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificados();
  }, [legajoPersona]);

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

  type EstadoVencimiento = 'vencido' | 'proximo' | 'al_dia';

  const calcularEstadoVencimiento = (fechaStr?: string | null): EstadoVencimiento => {
    if (!fechaStr) return 'al_dia';
    const fechaLimite = new Date(fechaStr);
    const hoy = new Date();

    const diffTiempo = fechaLimite.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

    if (diffDias <= 0) return 'vencido';
    if (diffDias <= 15) return 'proximo';
    return 'al_dia';
  };

  const abrirConfirmacionEliminar = (id: number, tipo: string) => {
    setCertificadoAEliminar({ id, tipo });
    setDialogOpen(true);
  };

  const ejecutarEliminar = async () => {
    if (!certificadoAEliminar) return;
    const { id } = certificadoAEliminar;
    setDialogOpen(false);
    setCertificadoAEliminar(null);

    try {
      const res = await apiFetch(`/certificados/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCertificados((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert('No se pudo eliminar el certificado.');
      }
    } catch {
      alert('Error al conectar con el servidor.');
    }
  };

  const certificadosFiltrados = certificados.filter((c) => {
    const term = searchTerm.toLowerCase().trim();
    return !term || c.tipo.toLowerCase().includes(term);
  });

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Certificados de Personal</h1>
          <div className="subtitulo">
            {nombrePersona ? `${nombrePersona} (Legajo #${legajoPersona})` : `Legajo #${legajoPersona}`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={onVolver} className="btn-cancelar">
            ← Volver a Personal
          </button>
          {onNuevoClick && (
            <button onClick={onNuevoClick} className="btn-guardar">
              + Agregar Certificado
            </button>
          )}
        </div>
      </div>

      <div className="filtros-top-bar">
        <input
          type="text"
          className="input-busqueda"
          placeholder="Buscar por tipo de certificado..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tipo</th>
              <th>Fecha de Vencimiento</th>
              <th>Archivo</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando certificados...
                </td>
              </tr>
            ) : certificadosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  No se encontraron certificados para este personal.
                </td>
              </tr>
            ) : (
              certificadosFiltrados.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td><strong>{item.tipo}</strong></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span>{formatearFecha(item.fechaVencimiento)}</span>

                      {calcularEstadoVencimiento(item.fechaVencimiento) === 'vencido' && (
                        <span
                          style={{
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #f87171',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          ● Vencido
                        </span>
                      )}

                      {calcularEstadoVencimiento(item.fechaVencimiento) === 'proximo' && (
                        <span
                          style={{
                            backgroundColor: '#fef3c7',
                            color: '#d97706',
                            border: '1px solid #fcd34d',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          ▲ Próximo a vencer
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{item.foto_url || 'Sin archivo'}</td>
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
                        className="btn-icon btn-editar"
                        title="Editar"
                        onClick={() => onEditarClick(item.id)}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-eliminar"
                        title="Eliminar"
                        onClick={() => abrirConfirmacionEliminar(item.id, item.tipo)}
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
        title="Confirmar Eliminación"
        description={`¿Seguro que deseas eliminar el certificado "${certificadoAEliminar?.tipo}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={ejecutarEliminar}
        onCancel={() => {
          setDialogOpen(false);
          setCertificadoAEliminar(null);
        }}
      />
    </div>
  );
};