import React, { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';

interface TipoCertificadoOption {
  id: number;
  nombre: string;
}

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
  const [tipos, setTipos] = useState<TipoCertificadoOption[]>([]);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [idTipo, setIdTipo] = useState<string>('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [advertenciaInput, setAdvertenciaInput] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const cargarTipos = async () => {
      setLoadingTipos(true);
      try {
        const res = await apiFetch('/certificados/tipos/');
        if (res.ok) {
          const data: TipoCertificadoOption[] = await res.json();
          setTipos(data);
        } else {
          setErrorMsg('No se pudieron obtener los tipos de certificados.');
        }
      } catch {
        setErrorMsg('Error al conectar con el servidor para cargar tipos.');
      } finally {
        setLoadingTipos(false);
      }
    };

    cargarTipos();
  }, []);

  const handleIdTipoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAdvertenciaInput(null);
    setErrorMsg(null);
    setIdTipo(e.target.value);
  };

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

  const handleBlurTipo = () => {
    if (!idTipo) {
      setAdvertenciaInput('Debe seleccionar un tipo de certificado.');
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
      const formData = new FormData();
      formData.append('id_tipo', idTipo);
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
          <label htmlFor="id_tipo">
            Tipo de Certificado <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            id="id_tipo"
            name="id_tipo"
            value={idTipo}
            onChange={handleIdTipoChange}
            onBlur={handleBlurTipo}
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
            disabled={loading || !idTipo || !fechaVencimiento}
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