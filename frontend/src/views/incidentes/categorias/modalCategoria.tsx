import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../../api/client';
import type { CategoriaIncidente, CategoriaIncidenteInput } from '../tipos';
import '../../../styles/formularioAlta.css';
import '../../../styles/incidentes.css';

interface ModalCategoriaProps {
  open: boolean;
  categoria?: CategoriaIncidente | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalCategoria: React.FC<ModalCategoriaProps> = ({
  open,
  categoria,
  onClose,
  onSuccess,
}) => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const esEdicion = Boolean(categoria);

  useEffect(() => {
    if (categoria) {
      setNombre(categoria.nombre);
      setDescripcion(categoria.descripcion || '');
    } else {
      setNombre('');
      setDescripcion('');
    }
    setErrorMsg(null);
  }, [categoria, open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setErrorMsg('El nombre de la categoría es obligatorio.');
      return;
    }

    if (nombreLimpio.length > 60) {
      setErrorMsg('El nombre no puede superar los 60 caracteres.');
      return;
    }

    const payload: CategoriaIncidenteInput = {
      nombre: nombreLimpio,
      descripcion: descripcion.trim() || undefined,
    };

    setLoading(true);
    try {
      const url = esEdicion && categoria
        ? `/incidentes/categorias/${categoria.id}`
        : '/incidentes/categorias/';
      const method = esEdicion ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.detail || 'Ocurrió un error al procesar la categoría.');
      }
    } catch {
      setErrorMsg('Error de conexión al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-incidente-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="modal-incidente-contenido"
        style={{ maxWidth: '580px', width: '100%', padding: '2rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-texto)' }}>
              {esEdicion ? 'Editar Categoría de Incidente' : 'Nueva Categoría de Incidente'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--color-texto-sec)' }}>
              {esEdicion
                ? 'Modifique el nombre o descripción de la categoría.'
                : 'Defina una nueva categoría para la tipificación de incidentes.'}
            </p>
          </div>
          <button
            type="button"
            className="btn-cerrar-modal"
            onClick={onClose}
            disabled={loading}
            title="Cerrar modal"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              lineHeight: 1,
              color: 'var(--color-texto-sec)',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ×
          </button>
        </div>

        {errorMsg && (
          <div className="alerta-error" style={{ marginBottom: '1.25rem' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="cat-nombre" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
              Nombre de la Categoría *
            </label>
            <input
              id="cat-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Mantenimiento Preventivo, Cadena de Frío..."
              maxLength={60}
              className="input-busqueda"
              style={{ width: '100%' }}
              disabled={loading}
              autoFocus
            />
            <div style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', marginTop: '4px', textAlign: 'right' }}>
              {nombre.length}/60
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label htmlFor="cat-descripcion" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
              Descripción (Opcional)
            </label>
            <textarea
              id="cat-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Aclare qué tipo de eventualidades abarca esta categoría..."
              maxLength={255}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-borde)',
                backgroundColor: 'var(--color-superficie)',
                color: 'var(--color-texto)',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                resize: 'vertical',
                outline: 'none',
              }}
              disabled={loading}
            />
            <div style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', marginTop: '4px', textAlign: 'right' }}>
              {descripcion.length}/255
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn-cancelar"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-guardar"
              disabled={loading || !nombre.trim()}
            >
              {loading ? 'Guardando...' : esEdicion ? 'Actualizar Categoría' : 'Crear Categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

