import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import {
  DESCRIPCION_MAX,
  FOTO_MAX_BYTES,
  TIPOS_FOTO,
  mensajeDeError,
} from './tipos';
import '../../styles/formularioAlta.css';
import '../../styles/incidentes.css';

interface NuevoIncidenteModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NuevoIncidenteModal: React.FC<NuevoIncidenteModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { esOperador } = useAuth();
  const [descripcion, setDescripcion] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    };
  }, [vistaPrevia]);

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

  const quitarFoto = () => {
    setFoto(null);
    setVistaPrevia(null);
    setErrorFoto(null);
    if (inputFotoRef.current) inputFotoRef.current.value = '';
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) {
      quitarFoto();
      return;
    }
    if (!TIPOS_FOTO.includes(archivo.type)) {
      quitarFoto();
      setErrorFoto('La foto debe ser una imagen JPG o PNG.');
      return;
    }
    if (archivo.size > FOTO_MAX_BYTES) {
      quitarFoto();
      setErrorFoto(`La foto no puede superar los ${FOTO_MAX_BYTES / (1024 * 1024)} MB.`);
      return;
    }
    setErrorFoto(null);
    setFoto(archivo);
    setVistaPrevia(URL.createObjectURL(archivo));
  };

  const descripcionLimpia = descripcion.trim();
  const excedida = descripcionLimpia.length > DESCRIPCION_MAX;

  const handleGuardar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!descripcionLimpia) {
      setErrorMsg('La descripción no puede estar vacía.');
      return;
    }
    if (excedida) {
      setErrorMsg(`La descripción no puede superar los ${DESCRIPCION_MAX} caracteres.`);
      return;
    }

    const datos = new FormData();
    datos.append('descripcion', descripcionLimpia);
    if (foto) datos.append('foto', foto);

    setLoading(true);
    try {
      const res = await apiFetch('/incidentes/', { method: 'POST', body: datos });
      if (res.ok) {
        setDescripcion('');
        quitarFoto();
        onSuccess();
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(mensajeDeError(err.detail, 'No se pudo registrar el incidente.'));
      }
    } catch {
      setErrorMsg('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-incidente-overlay" onClick={loading ? undefined : onClose}>
      <div
        className="modal-incidente-contenido"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '560px' }}
      >
        <div className="modal-incidente-header">
          <h2>Reportar Nuevo Incidente</h2>
          <button
            type="button"
            className="btn-cerrar"
            disabled={loading}
            onClick={onClose}
            title="Cerrar modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleGuardar} noValidate>
          <div className="modal-incidente-body">
            {!esOperador && (
              <div className="alerta-error">
                Tu usuario no cuenta con capacidad para operar en planta.
              </div>
            )}
            {errorMsg && <div className="alerta-error">{errorMsg}</div>}

            <div className="form-group">
              <label htmlFor="descripcion">Descripción del Incidente *</label>
              <textarea
                id="descripcion"
                className="form-textarea"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe detalladamente el problema o evento observado..."
                rows={4}
                maxLength={DESCRIPCION_MAX + 50}
                disabled={loading}
              />
              <div className={`contador-caracteres ${excedida ? 'excedido' : ''}`}>
                {descripcionLimpia.length} / {DESCRIPCION_MAX} caracteres
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="foto-incidente">Fotografía de Evidencia (opcional)</label>
              <input
                id="foto-incidente"
                ref={inputFotoRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFotoChange}
                disabled={loading}
              />
              <div className="ayuda-campo">
                Formatos permitidos: JPG o PNG. Tamaño máximo: 5 MB.
              </div>
              {errorFoto && <div className="campo-error">{errorFoto}</div>}

              {vistaPrevia && (
                <div className="foto-vista-previa">
                  <img src={vistaPrevia} alt="Vista previa de la evidencia" />
                  <button
                    type="button"
                    className="btn-quitar-foto"
                    onClick={quitarFoto}
                    disabled={loading}
                    title="Quitar foto"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="modal-incidente-footer" style={{ gap: '10px' }}>
            <button
              type="button"
              className="btn-cancelar"
              disabled={loading}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-guardar"
              disabled={loading || !esOperador || !descripcionLimpia || excedida}
            >
              {loading ? 'Guardando...' : 'Registrar Incidente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

