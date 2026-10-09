import React, { useEffect, useState } from 'react';
import type { Certificado, CertificadoUpdate } from './tipos';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';

interface EditarCertificadoProps {
  certificadoId?: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const EditarCertificado: React.FC<EditarCertificadoProps> = ({
  certificadoId,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CertificadoUpdate>({
    tipo: '',
    fechaVencimiento: '',
    foto_url: '',
  });

  const [loadingFetch, setLoadingFetch] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [advertenciaInput, setAdvertenciaInput] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);

  useEffect(() => {
    if (certificadoId) {
      const fetchCertificado = async () => {
        try {
          const res = await apiFetch(`/certificados/${certificadoId}`);
          if (res.ok) {
            const data: Certificado = await res.json();
            setFormData({
              tipo: data.tipo,
              fechaVencimiento: data.fechaVencimiento ? data.fechaVencimiento.split('T')[0] : '',
              foto_url: data.foto_url || '',
            });
          } else {
            setErrorMsg('No se pudo cargar el certificado.');
          }
        } catch {
          setErrorMsg('Error al conectar con el servidor.');
        } finally {
          setLoadingFetch(false);
        }
      };

      fetchCertificado();
    }
  }, [certificadoId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAdvertenciaInput(null);
    setErrorMsg(null);

    if (name === 'tipo') {
      if (value.length > 30) {
        setAdvertenciaInput('El tipo no puede tener más de 30 caracteres.');
        return;
      }
    }

    if (name === 'fechaVencimiento' && value) {
      const fechaIngresada = new Date(`${value}T00:00:00`);
      const fechaMinima = new Date();
      fechaMinima.setDate(fechaMinima.getDate() + 7);
      fechaMinima.setHours(0, 0, 0, 0);

      if (fechaIngresada < fechaMinima) {
        setAdvertenciaInput('La fecha de vencimiento debe ser al menos dentro de 7 días.');
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
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

    const tipoLimpio = formData.tipo?.trim();
    if (!tipoLimpio) {
      setErrorMsg('El tipo no puede estar vacío.');
      return;
    }

    if (!formData.fechaVencimiento) {
      setErrorMsg('Debe indicar una fecha de vencimiento.');
      return;
    }

    const fechaIngresada = new Date(`${formData.fechaVencimiento}T00:00:00`);
    const fechaMinima = new Date();
    fechaMinima.setDate(fechaMinima.getDate() + 7);
    fechaMinima.setHours(0, 0, 0, 0);

    if (fechaIngresada < fechaMinima) {
      setErrorMsg('La fecha de vencimiento no puede ser anterior a dentro de 7 días.');
      return;
    }

    setLoading(true);

    try {
      const formPayload = new FormData();
      formPayload.append('tipo', tipoLimpio);
      formPayload.append('fechaVencimiento', formData.fechaVencimiento);

      if (archivo) {
        formPayload.append('archivo', archivo);
      }

      // Al mandar FormData con apiFetch, no se define cabecera 'Content-Type'
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
          <label htmlFor="tipo">
            Tipo de Certificado <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            id="tipo"
            name="tipo"
            type="text"
            value={formData.tipo || ''}
            onChange={handleChange}
            maxLength={30}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="fechaVencimiento">
            Fecha de Vencimiento <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            id="fechaVencimiento"
            name="fechaVencimiento"
            type="date"
            value={formData.fechaVencimiento || ''}
            onChange={handleChange}
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
            <div style={{ fontSize: '13px', color: '#059669', marginTop: '6px', fontWeight: 500 }}>
              ✓ Archivo nuevo adjunto: {archivo.name} ({(archivo.size / 1024).toFixed(1)} KB)
            </div>
          ) : formData.foto_url ? (
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px' }}>
              Archivo actual: {formData.foto_url.split('/').pop()} (Si no seleccionás nada nuevo, se conserva)
            </div>
          ) : null}
        </div>

        <div className="form-acciones">
          <button
            type="submit"
            className="btn-guardar"
            disabled={loading || !formData.tipo?.trim() || !formData.fechaVencimiento}
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <button type="button" className="btn-cancelar" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};