import React, { useEffect, useState } from 'react';
import type { Certificado } from './tipos';
import { ConfirmAlertDialog, ErrorAlertDialog } from '../../components/ui/alert-dialog';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '../../components/ui/dialog';
import { Paginacion } from '../../components/ui/paginacion';
import { usePaginacion } from '../../components/ui/usePaginacion';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';

interface ListadoCertificadosPorPersonaProps {
  legajoPersona: number;
  nombrePersona?: string;
  onNuevoClick: () => void;
  onDetalleClick: (id: number) => void;
  onEditarClick: (id: number) => void;
  onVolver: () => void;
  textoVolver?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ListadoCertificadosPorPersona: React.FC<ListadoCertificadosPorPersonaProps> = ({
  legajoPersona,
  nombrePersona,
  onNuevoClick,
  onDetalleClick,
  onEditarClick,
  onVolver,
  textoVolver,
}) => {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [certificadoAEliminar, setCertificadoAEliminar] = useState<{ id: number; tipo: string } | null>(null);
  const [errorDialogMsg, setErrorDialogMsg] = useState<string | null>(null);

  const [modalArchivoUrl, setModalArchivoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    const fetchCertificados = async () => {
      try {
        const res = await apiFetch(`/certificados/?legajo_persona=${legajoPersona}`);
        if (!cancelado && res.ok) {
          const data = await res.json();
          setCertificados(data);
        } else if (!cancelado) {
          setCertificados([]);
        }
      } catch {
        if (!cancelado) setCertificados([]);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    fetchCertificados();
    return () => {
      cancelado = true;
    };
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

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fLim = new Date(fechaStr);
    fLim.setHours(0, 0, 0, 0);


    const diffTiempo = fLim.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return 'vencido';
    if (diffDias < 15) return 'proximo';
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
        const err = await res.json().catch(() => ({}));
        setErrorDialogMsg(err.detail || 'No se pudo eliminar el certificado.');
      }
    } catch {
      setErrorDialogMsg('Error al conectar con el servidor.');
    }
  };

  const renderBotonArchivo = (fotoUrl?: string | null) => {
    if (!fotoUrl) {
      return <span style={{ color: 'var(--color-texto-sec)' }}>Sin archivo</span>;
    }

    const urlCompleta = fotoUrl.startsWith('http') ? fotoUrl : `${API_URL}${fotoUrl}`;
    const esPdf = fotoUrl.toLowerCase().endsWith('.pdf');

    return (
      <button
        type="button"
        onClick={() => setModalArchivoUrl(urlCompleta)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: 'var(--color-primario-texto)',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap',
          fontSize: 'inherit',
        }}
        title="Ver evidencia"
      >
        <span>{esPdf ? 'Ver documento' : 'Ver imagen'}</span>
        <span>↗</span>
      </button>
    );
  };

  const certificadosFiltrados = certificados.filter((c) => {
    const term = searchTerm.toLowerCase().trim();
    return !term || c.tipo.toLowerCase().includes(term);
  });

  const {
    itemsPaginados: certificadosPaginados,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(certificadosFiltrados);

  const modalEsPdf = modalArchivoUrl?.toLowerCase().endsWith('.pdf');

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1 style={{ lineHeight: '1.25', margin: '0 0 6px 0' }}>Certificados de Personal</h1>
          <div className="subtitulo">
            {nombrePersona ? `${nombrePersona} (Legajo #${legajoPersona})` : `Legajo #${legajoPersona}`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={onVolver} className="btn-cancelar">
            {textoVolver || '← Volver a Personal'}
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
              certificadosPaginados.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td><strong>{item.tipo}</strong></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                      <span>{formatearFecha(item.fechaVencimiento)}</span>

                      {calcularEstadoVencimiento(item.fechaVencimiento) === 'vencido' && (
                        <Badge variant="vencido">● Vencido</Badge>
                      )}

                      {calcularEstadoVencimiento(item.fechaVencimiento) === 'proximo' && (
                        <Badge variant="proximo">▲ Próximo a vencer</Badge>
                      )}
                    </div>
                  </td>
                  <td>{renderBotonArchivo(item.foto_url)}</td>
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

      <Paginacion
        paginaActual={paginaActual}
        totalPaginas={totalPaginas}
        totalRegistros={totalRegistros}
        indiceInicio={indiceInicio}
        indiceFin={indiceFin}
        filasPorPagina={filasPorPagina}
        onCambiarPagina={setPaginaActual}
        onCambiarFilasPorPagina={setFilasPorPagina}
        etiqueta="certificados"
      />

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

      <ErrorAlertDialog
        open={Boolean(errorDialogMsg)}
        title="No se pudo completar la acción"
        description={errorDialogMsg || ''}
        onClose={() => setErrorDialogMsg(null)}
      />

      <Dialog open={Boolean(modalArchivoUrl)} onOpenChange={(open) => !open && setModalArchivoUrl(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Archivo adjunto</DialogTitle>
          </DialogHeader>
          {modalArchivoUrl && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                maxHeight: '70vh',
                overflow: 'hidden',
                borderRadius: '8px',
                border: '1px solid var(--color-borde)',
              }}
            >
              {modalEsPdf ? (
                <iframe
                  src={modalArchivoUrl}
                  title="Documento adjunto"
                  style={{
                    width: '100%',
                    height: '65vh',
                    border: 'none',
                  }}
                />
              ) : (
                <img
                  src={modalArchivoUrl}
                  alt="Comprobante de certificado"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                  }}
                />
              )}
            </div>
          )}
          <DialogFooter>
            <DialogClose onClick={() => setModalArchivoUrl(null)}>Cerrar</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};