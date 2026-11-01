import React, { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';

/** Fecha local en formato YYYY-MM-DD (toISOString usa UTC y de noche daría el día siguiente). */
const fechaLocal = (fecha: Date): string => {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

const CONTENIDO_INFORME = [
  'Porcentaje de cumplimiento de los checklists de limpieza',
  'Tareas incumplidas con su justificación',
  'Tareas reasignadas y su resultado',
  'Vencimientos del período',
  'Incidentes cerrados con su acción correctiva',
];

export const InformeInspeccion: React.FC = () => {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  // URL (blob) del PDF generado, para la vista previa antes de descargar
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState('');

  // libera la URL anterior al reemplazarla o al salir de la vista
  useEffect(() => {
    return () => {
      if (pdfUrl) window.URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const hoy = fechaLocal(new Date());
  // las fechas YYYY-MM-DD se pueden comparar como texto
  const errorDesde = desde && desde > hoy ? 'La fecha desde no puede ser posterior a hoy.' : null;
  const errorHasta = hasta && hasta > hoy ? 'La fecha hasta no puede ser posterior a hoy.' : null;
  const errorRango = desde && hasta && desde > hasta ? 'La fecha desde no puede ser posterior a la fecha hasta.' : null;
  const rangoCompleto = Boolean(desde && hasta);
  const puedeGenerar = rangoCompleto && !errorDesde && !errorHasta && !errorRango;

  const limpiarMensajes = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const cerrarVistaPrevia = () => {
    setPdfUrl(null);
    setNombreArchivo('');
  };

  const descargarPdf = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setSuccessMsg('La descarga comenzó en tu navegador.');
  };

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    limpiarMensajes();

    if (!rangoCompleto) {
      setErrorMsg('Seleccioná la fecha desde y la fecha hasta del informe.');
      return;
    }
    if (!puedeGenerar) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({ desde, hasta });
      const res = await apiFetch(`/informes/inspeccion?${params}`);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let msg = 'No se pudo generar el informe.';
        if (typeof data.detail === 'string') {
          msg = data.detail;
        } else if (Array.isArray(data.detail)) {
          msg = data.detail.map((err: { msg?: string }) => err.msg || JSON.stringify(err)).join(', ');
        }
        throw new Error(msg);
      }

      // se fuerza el tipo para que el navegador lo muestre en la vista previa
      const blob = new Blob([await res.blob()], { type: 'application/pdf' });
      setPdfUrl(window.URL.createObjectURL(blob));
      setNombreArchivo(`informe-inspeccion_${desde}_${hasta}.pdf`);
      setSuccessMsg('Informe generado. Revisá la vista previa y descargalo si está correcto.');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo generar el informe.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Informe para Inspección</h1>
        <div className="subtitulo">Calidad y Trazabilidad · PDF del período</div>
      </div>

      <p style={{ color: 'var(--color-texto-sec)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
        Generá un PDF con la información del período para presentar ante una inspección bromatológica. Incluye:
      </p>
      <ul style={{ color: 'var(--color-texto-sec)', fontSize: '0.9rem', marginBottom: '1.5rem', paddingLeft: '1.25rem' }}>
        {CONTENIDO_INFORME.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="informe-desde">
            Fecha desde <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <input
            id="informe-desde"
            type="date"
            value={desde}
            max={hasta && hasta < hoy ? hasta : hoy}
            onChange={(e) => {
              setDesde(e.target.value);
              limpiarMensajes();
              cerrarVistaPrevia();
            }}
            required
          />
          {errorDesde && <span className="campo-error">{errorDesde}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="informe-hasta">
            Fecha hasta <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <input
            id="informe-hasta"
            type="date"
            value={hasta}
            min={desde || undefined}
            max={hoy}
            onChange={(e) => {
              setHasta(e.target.value);
              limpiarMensajes();
              cerrarVistaPrevia();
            }}
            required
          />
          {errorHasta && <span className="campo-error">{errorHasta}</span>}
          {errorRango && <span className="campo-error">{errorRango}</span>}
        </div>

        <div className="form-acciones">
          <button type="submit" className="btn-guardar" disabled={loading || !puedeGenerar}>
            {loading ? 'Generando...' : pdfUrl ? 'Regenerar vista previa' : 'Generar vista previa'}
          </button>
        </div>
        {!rangoCompleto && (
          <p style={{ color: 'var(--color-texto-sec)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Seleccioná las dos fechas para habilitar la vista previa.
          </p>
        )}
      </form>

      {pdfUrl && (
        <div style={{ marginTop: '1.5rem' }}>
          <iframe
            src={pdfUrl}
            title="Vista previa del informe"
            style={{
              width: '100%',
              height: '70vh',
              border: '1px solid var(--color-borde, #ccc)',
              borderRadius: '8px',
            }}
          />
          <div className="form-acciones">
            <button type="button" className="btn-cancelar" onClick={cerrarVistaPrevia}>
              Cerrar vista previa
            </button>
            <button type="button" className="btn-guardar" onClick={descargarPdf}>
              Descargar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
