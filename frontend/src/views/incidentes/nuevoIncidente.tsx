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

interface NuevoIncidenteProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const NuevoIncidente: React.FC<NuevoIncidenteProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { usuario, esOperador } = useAuth();
  const [descripcion, setDescripcion] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [registradoExito, setRegistradoExito] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    };
  }, [vistaPrevia]);

  const quitarFoto = () => {
    setFoto(null);
    setVistaPrevia(null);
    setErrorFoto(null);
    if (inputFotoRef.current) inputFotoRef.current.value = '';
  };

  const procesarArchivo = (archivo: File | undefined) => {
    if (!archivo) {
      quitarFoto();
      return;
    }
    if (!TIPOS_FOTO.includes(archivo.type)) {
      quitarFoto();
      setErrorFoto('Formato no soportado. Por favor seleccione una imagen JPG o PNG.');
      return;
    }
    if (archivo.size > FOTO_MAX_BYTES) {
      quitarFoto();
      setErrorFoto(`El tamaño excede el límite permitido de ${FOTO_MAX_BYTES / (1024 * 1024)} MB.`);
      return;
    }
    setErrorFoto(null);
    setFoto(archivo);
    setVistaPrevia(URL.createObjectURL(archivo));
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    procesarArchivo(e.target.files?.[0]);
  };

  const formatearTamanio = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const descripcionLimpia = descripcion.trim();
  const excedida = descripcionLimpia.length > DESCRIPCION_MAX;

  const handleGuardar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!descripcionLimpia) {
      setErrorMsg('La descripción del incidente es obligatoria.');
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
        setRegistradoExito(true);
        onSuccess?.();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(mensajeDeError(err.detail, 'No se pudo registrar el incidente.'));
      }
    } catch {
      setErrorMsg('Error de conexión con el servidor. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = () => {
    setDescripcion('');
    quitarFoto();
    setErrorMsg(null);
    setSuccessMsg(null);
    onCancel?.();
  };

  if (registradoExito) {
    return (
      <div className="incidente-form-card" style={{ textAlign: 'center', padding: '3.25rem 2rem' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#dcfce7',
            color: '#15803d',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
          }}
        >
          <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 5 5L20 7" />
          </svg>
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--inc-text-title)' }}>
          ¡Incidente Registrado Correctamente!
        </h2>
        <p style={{ color: 'var(--inc-text-muted)', fontSize: '0.95rem', maxWidth: '440px', margin: '0 auto 1.75rem', lineHeight: 1.5 }}>
          El reporte ha quedado asentado en el sistema a nombre de <strong>{usuario?.nombre} {usuario?.apellido}</strong> (Legajo #{usuario?.legajo}) con fecha y hora actual para su posterior evaluación.
        </p>
        <button
          type="button"
          className="btn-inc-primario"
          onClick={() => {
            setRegistradoExito(false);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Reportar Otro Incidente
        </button>
      </div>
    );
  }

  return (
    <div className="incidente-form-card">
      <div className="incidente-form-header">
        <h1>Registrar Incidente</h1>
        <p>
          Deje constancia inmediata de cualquier desperfecto, desvío o hallazgo en planta para su posterior evaluación y seguimiento.
        </p>
      </div>

      {usuario && (
        <div className="incidente-operador-badge">
          <div className="operador-avatar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="operador-detalles">
            <div className="operador-nombre">{usuario.nombre} {usuario.apellido}</div>
            <div className="operador-meta">
              <span>Legajo #{usuario.legajo}</span>
              <span className="separador">•</span>
              <span>Fecha, hora y autoría registradas de forma automática</span>
            </div>
          </div>
        </div>
      )}

      {!esOperador && (
        <div className="alerta-error" style={{ marginBottom: '1.25rem' }}>
          Tu usuario no cuenta con capacidad para operar en planta ni registrar incidentes.
        </div>
      )}
      {errorMsg && <div className="alerta-error" style={{ marginBottom: '1.25rem' }}>{errorMsg}</div>}
      {successMsg && <div className="alerta-exito" style={{ marginBottom: '1.25rem' }}>{successMsg}</div>}

      <form onSubmit={handleGuardar} noValidate>
        <div className="form-group">
          <label htmlFor="descripcion" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Descripción del Incidente *</span>
            <span style={{ fontSize: '11px', color: 'var(--inc-text-muted)', fontWeight: 500 }}>
              Obligatorio (máx. {DESCRIPCION_MAX} caract.)
            </span>
          </label>
          <div className="incidente-textarea-wrapper">
            <textarea
              id="descripcion"
              name="descripcion"
              className="incidente-textarea"
              placeholder="Describa con precisión qué ocurrió, ubicación física o elementos afectados (ej. Pérdida de líquido en válvula de llenado, rotura en cinta transportadora, hallazgo de plaga en depósito, etc.)..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              disabled={loading || !esOperador}
              rows={4}
            />
          </div>
          <div className={`incidente-char-bar ${excedida ? 'limite' : ''}`}>
            {descripcionLimpia.length} / {DESCRIPCION_MAX} caracteres
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
            💡 Sugerencia: Especifique la ubicación física, el sector y equipo o lote involucrado si corresponde.
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '1.25rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Evidencia Fotográfica (Opcional)</span>
            <span style={{ fontSize: '11px', color: 'var(--inc-text-muted)', fontWeight: 500 }}>
              JPG o PNG (máx. 5 MB)
            </span>
          </label>

          <input
            id="foto"
            name="foto"
            ref={inputFotoRef}
            type="file"
            accept="image/jpeg,image/png"
            capture="environment"
            onChange={handleFotoChange}
            disabled={loading || !esOperador}
            style={{ display: 'none' }}
          />

          {!foto ? (
            <div
              className={`dropzone-container ${arrastrando ? 'arrastrando' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={(e) => {
                e.preventDefault();
                setArrastrando(false);
                if (!loading && esOperador && e.dataTransfer.files?.[0]) {
                  procesarArchivo(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => {
                if (!loading && esOperador) inputFotoRef.current?.click();
              }}
            >
              <div className="dropzone-icono">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </div>
              <p className="dropzone-texto-principal">
                <span>Haga clic para subir una foto</span> o arrástrela hasta aquí
              </p>
              <p className="dropzone-texto-secundario">
                Puede tomar una fotografía con la cámara de su móvil o seleccionar una imagen guardada (JPG o PNG)
              </p>
            </div>
          ) : (
            <div className="dropzone-preview-card">
              {vistaPrevia && (
                <img
                  src={vistaPrevia}
                  alt="Vista previa"
                  className="dropzone-preview-thumb"
                />
              )}
              <div className="dropzone-preview-info">
                <div className="dropzone-preview-nombre">{foto.name}</div>
                <div className="dropzone-preview-peso">{formatearTamanio(foto.size)}</div>
                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
                  ✓ Fotografía lista para adjuntar
                </div>
              </div>
              <button
                type="button"
                className="dropzone-btn-quitar"
                onClick={quitarFoto}
                disabled={loading}
                title="Quitar esta fotografía"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
                Quitar
              </button>
            </div>
          )}

          {errorFoto && <div className="campo-error">{errorFoto}</div>}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '2rem' }}>
          <button
            type="submit"
            className="btn-inc-primario"
            style={{ flex: 1 }}
            disabled={loading || !esOperador || !descripcionLimpia || excedida}
          >
            {loading ? (
              <>Guardando...</>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 5 5L20 7" />
                </svg>
                Registrar Incidente
              </>
            )}
          </button>
          {onCancel && (
            <button
              type="button"
              className="btn-inc-secundario"
              disabled={loading}
              onClick={handleCancelar}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
