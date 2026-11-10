import React, { useEffect, useState } from 'react';
import type { Certificado } from './tipos';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';

interface EditarCertificadoProps {
  certificadoId?: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface TipoCertificadoOption {
  id: number;
  nombre: string;
}

export const EditarCertificado: React.FC<EditarCertificadoProps> = ({
  certificadoId,
  onSuccess,
  onCancel,
}) => {
  const [tipos, setTipos] = useState<TipoCertificadoOption[]>([]);
  const [loadingTipos, setLoadingTipos] = useState(true);

  const [idTipo, setIdTipo] = useState<string>('');
  const [fechaVencimiento, setFechaVencimiento] = useState<string>('');
  const [fotoUrlActual, setFotoUrlActual] = useState<string>('');

  const [loadingFetch, setLoadingFetch] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [advertenciaInput, setAdvertenciaInput] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);

  // 1. Cargar tipos y certificado
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const resTipos = await apiFetch('/certificados/tipos/');
        let listaTipos: TipoCertificadoOption[] = [];
        if (resTipos.ok) {
          listaTipos = await resTipos.json();
          setTipos(listaTipos);
        } else {
          setErrorMsg('No se pudieron cargar los tipos de certificado.');
        }

        if (certificadoId) {
          const resCert = await apiFetch(`/certificados/${certificadoId}`);
          if (resCert.ok) {
            const data: Certificado = await resCert.json();

            // Si el backend devuelve id_tipo lo toma directo; sino busca coincidencia por nombre
            const idEncontrado =
              (data as unknown as { id_tipo?: number }).id_tipo ??
              listaTipos.find((t) => t.nombre.toLowerCase() === data.tipo?.toLowerCase())?.id;

            if (idEncontrado) {
              setIdTipo(String(idEncontrado));
            }

            setFechaVencimiento(
              data.fechaVencimiento ? data.fechaVencimiento.split('T')[0] : ''
            );
            setFotoUrlActual(data.foto_url || '');
          } else {
            setErrorMsg('No se pudo cargar el certificado.');
          }
        }
      } catch {
        setErrorMsg('Error al conectar con el servidor.');
      } finally {
        setLoadingTipos(false);
        setLoadingFetch(false);
      }
    };

    cargarDatos();
  }, [certificadoId]);

  const handleFechaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setAdvertenciaInput(null);
    setErrorMsg(null);

    if (value) {
      const fechaIngresada = new Date(`${value}T00:00:00`);
      const fechaMinima = new Date();
      fechaMinima.setDate(fechaMinima.getDate() + 15);
      fechaMinima.setHours(0, 0, 0, 0);

      if (fechaIngresada < fechaMinima) {
        setAdvertenciaInput('La fecha de vencimiento debe ser al menos dentro de 15 días.');
      }
    }

    setFechaVencimiento(value);
  };

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const extension = file.name.split('.').pop()?.toLowerCase();
      const extensionesValidas = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

      if (!extension || !extensionesValidas.includes(extension)) {
        setErrorMsg('Formato de archivo no válido. Solo se admiten JPG, PNG, WEBP o PDF.');
        setArchivo(null);
        e.target.value = '';
        return;
      }
      setArchivo(file);
    } else {
      setArchivo(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certificadoId) return;

    setErrorMsg(null);
    setAdvertenciaInput(null);
    setSuccessMsg(null);

    if (!idTipo) {
      setErrorMsg('Debe seleccionar un tipo de certificado.');
      return;
    }

    if (!fechaVencimiento) {
      setErrorMsg('Debe indicar una fecha de vencimiento.');
      return;
    }

    const fechaIngresada = new Date(`${fechaVencimiento}T00:00:00`);
    const fechaMinima = new Date();
    fechaMinima.setDate(fechaMinima.getDate() + 15);
    fechaMinima.setHours(0, 0, 0, 0);

    if (fechaIngresada < fechaMinima) {
      setErrorMsg('La fecha de vencimiento no puede ser anterior a dentro de 15 días.');
      return;
    }

    setLoading(true);

    try {
      const formPayload = new FormData();
      formPayload.append('id_tipo', idTipo);
      formPayload.append('fechaVencimiento', fechaVencimiento);

      if (archivo) {
        formPayload.append('archivo', archivo);
      }

      const res = await apiFetch(`/certificados/${certificadoId}`, {
        method: 'PUT',
        body: formPayload,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let detalle = 'Error al actualizar el certificado';
        if (typeof errData.detail === 'string') {
          detalle = errData.detail;
        } else if (Array.isArray(errData.detail)) {
          detalle = errData.detail.map((err: { msg: string }) => err.msg).join(', ');
        }
        throw new Error(detalle);
      }

      setSuccessMsg('Certificado actualizado exitosamente');
      setTimeout(() => {
        onSuccess?.();
      }, 500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  if (loadingFetch) {
    return (
      <div className="modulo-container formulario-box">
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1 style={{ lineHeight: '1.25', marginBottom: '6px' }}>Editar Certificado</h1>
        <div className="subtitulo">ID: {certificadoId}</div>
      </div>

      {advertenciaInput && <div className="alerta-error">{advertenciaInput}</div>}
      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="id_tipo">
            Tipo de Certificado <span style={{ color: 'var(--color-error-texto)' }}>*</span>
          </label>
          <select
            id="id_tipo"
            name="id_tipo"
            value={idTipo}
            onChange={(e) => {
              setIdTipo(e.target.value);
              setAdvertenciaInput(null);
            }}
            disabled={loadingTipos}
            required
          >
            <option value="">
              {loadingTipos ? 'Cargando tipos disponibles...' : 'Seleccione un tipo...'}
            </option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="fechaVencimiento">
            Fecha de Vencimiento <span style={{ color: 'var(--color-error-texto)' }}>*</span>
          </label>
          <input
            id="fechaVencimiento"
            name="fechaVencimiento"
            type="date"
            value={fechaVencimiento}
            onChange={handleFechaChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="archivo">Comprobante Adjunto (Foto o PDF)</label>
          <input
            id="archivo"
            name="archivo"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleArchivoChange}
          />
          {archivo ? (
            <div
              style={{
                fontSize: '13px',
                color: 'var(--color-exito-texto)',
                marginTop: '6px',
                fontWeight: 500,
              }}
            >
              ✓ Archivo nuevo adjunto: {archivo.name} ({(archivo.size / 1024).toFixed(1)} KB)
            </div>
          ) : fotoUrlActual ? (
            <div
              style={{
                fontSize: '13px',
                color: 'var(--color-texto-sec)',
                marginTop: '6px',
              }}
            >
              Archivo actual: {fotoUrlActual.split('/').pop()} (Si no seleccionás nada nuevo, se conserva)
            </div>
          ) : null}
        </div>

        <div className="form-acciones">
          <button
            type="submit"
            className="btn-guardar"
            disabled={loading || !idTipo || !fechaVencimiento}
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <button
            type="button"
            className="btn-cancelar"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};