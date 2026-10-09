import React, { useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';

interface NuevoCertificadoProps {
  legajoPersona: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const NuevoCertificado: React.FC<NuevoCertificadoProps> = ({
  legajoPersona,
  onSuccess,
  onCancel,
}) => {
  const [tipo, setTipo] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [advertenciaInput, setAdvertenciaInput] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleTipoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setAdvertenciaInput(null);
    setErrorMsg(null);

    if (value.length > 30) {
      setAdvertenciaInput('El tipo no puede tener más de 30 caracteres.');
      return;
    }
    setTipo(value);
  };

  const handleFechaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setAdvertenciaInput(null);
    setErrorMsg(null);

    if (value) {
      const fechaIngresada = new Date(`${value}T00:00:00`);
      const fechaMinima = new Date();
      fechaMinima.setDate(fechaMinima.getDate() + 7);
      fechaMinima.setHours(0, 0, 0, 0);

      if (fechaIngresada < fechaMinima) {
        setAdvertenciaInput('La fecha de vencimiento debe ser al menos dentro de 7 días.');
      }
    }
    setFechaVencimiento(value);
  };

  const handleBlurTipo = () => {
    if (!tipo.trim()) {
      setAdvertenciaInput('El tipo de certificado es obligatorio.');
    }
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
    setErrorMsg(null);
    setAdvertenciaInput(null);
    setSuccessMsg(null);

    const tipoLimpio = tipo.trim();

    if (!tipoLimpio) {
      setErrorMsg('El tipo de certificado no puede estar vacío.');
      return;
    }

    if (tipoLimpio.length > 30) {
      setErrorMsg('El tipo de certificado no puede superar los 30 caracteres.');
      return;
    }

    if (!fechaVencimiento) {
      setErrorMsg('Debe indicar una fecha de vencimiento.');
      return;
    }

    const fechaIngresada = new Date(`${fechaVencimiento}T00:00:00`);
    const fechaMinima = new Date();
    fechaMinima.setDate(fechaMinima.getDate() + 7);
    fechaMinima.setHours(0, 0, 0, 0);

    if (fechaIngresada < fechaMinima) {
      setErrorMsg('La fecha de vencimiento no puede ser anterior a dentro de 7 días.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('tipo', tipoLimpio);
      formData.append('fechaVencimiento', fechaVencimiento);
      formData.append('legajo_persona', String(legajoPersona));

      if (archivo) {
        formData.append('archivo', archivo);
      }

      const response = await apiFetch('/certificados/', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        let detalle = 'Error al registrar el certificado.';
        if (typeof data.detail === 'string') {
          detalle = data.detail;
        } else if (Array.isArray(data.detail)) {
          detalle = data.detail.map((err: { msg: string }) => err.msg).join(', ');
        }
        throw new Error(detalle);
      }

      setSuccessMsg('Certificado dado de alta exitosamente.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1 style={{ lineHeight: '1.25', marginBottom: '6px' }}>Nuevo Certificado</h1>
        <div className="subtitulo">Legajo: #{legajoPersona}</div>
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
            placeholder="Ej: Carnet Manipulador, Curso Seg..."
            value={tipo}
            onChange={handleTipoChange}
            onBlur={handleBlurTipo}
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
          {archivo && (
            <div style={{ fontSize: '13px', color: '#059669', marginTop: '6px', fontWeight: 500 }}>
              ✓ Archivo adjunto: {archivo.name} ({(archivo.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        <div className="form-acciones">
          <button
            type="submit"
            className="btn-guardar"
            disabled={loading || !tipo.trim() || !fechaVencimiento}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-cancelar" disabled={loading}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
};