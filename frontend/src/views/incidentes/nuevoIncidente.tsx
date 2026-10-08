import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import '../../styles/formularioAlta.css';
import '../../styles/incidentes.css';
import { DESCRIPCION_MAX, FOTO_MAX_BYTES, TIPOS_FOTO, mensajeDeError } from './tipos';

export function NuevoIncidente() {
  // Solo quien tiene capacidad de operar puede reportar (el backend lo exige también).
  const { esOperador } = useAuth();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement | null>(null);

  // libera la URL temporal de la vista previa cuando cambia o se desmonta
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

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
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
  }

  const descripcionLimpia = descripcion.trim();
  const excedida = descripcionLimpia.length > DESCRIPCION_MAX;

  async function handleGuardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

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
        setSuccessMsg('Incidente registrado correctamente.');
        setDescripcion('');
        quitarFoto();
        setTimeout(() => setMostrarFormulario(false), 1200);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(mensajeDeError(err.detail, 'No se pudo registrar el incidente.'));
      }
    } catch {
      setErrorMsg('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  function handleCancelar() {
    setDescripcion('');
    quitarFoto();
    setErrorMsg(null);
    setSuccessMsg(null);
    setMostrarFormulario(false);
  }

  if (!mostrarFormulario) {
    return (
      <div className="modulo-container">
        <div className="listado-top-bar">
          <div className="modulo-header">
            <h1>Incidentes</h1>
            <div className="subtitulo">01 · Reporte</div>
          </div>

          <button
            type="button"
            className="btn-guardar"
            disabled={!esOperador}
            onClick={() => {
              setSuccessMsg(null);
              setMostrarFormulario(true);
            }}
          >
            + Reportar Incidente
          </button>
        </div>

        {!esOperador && (
          <div className="alerta-error">Tu usuario no tiene capacidad de operar, por lo que no puede reportar incidentes.</div>
        )}
        {successMsg && <div className="alerta-exito">{successMsg}</div>}
      </div>
    );
  }

  return (
    <div className="modulo-container formulario-box incidentes-container">
      <div className="modulo-header">
        <h1>Nuevo Incidente</h1>
        <div className="subtitulo">02 · Formulario</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleGuardar} noValidate>
        <div className="form-group">
          <label htmlFor="descripcion">Descripción</label>
          <textarea
            id="descripcion"
            name="descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Se rompió la puerta de la cámara frigorífica"
            maxLength={DESCRIPCION_MAX + 50}
          />
          <span className={`contador-caracteres ${excedida ? 'excedido' : ''}`}>
            {descripcionLimpia.length}/{DESCRIPCION_MAX}
          </span>
        </div>

        <div className="form-group">
          <label htmlFor="foto">Foto (opcional)</label>
          <input
            id="foto"
            ref={inputFotoRef}
            type="file"
            accept="image/jpeg,image/png"
            capture="environment"
            onChange={handleFotoChange}
          />
          <span className="ayuda-campo">JPG o PNG, hasta {FOTO_MAX_BYTES / (1024 * 1024)} MB. En el celular podés sacarla en el momento.</span>
          {errorFoto && <span className="campo-error">{errorFoto}</span>}
          {vistaPrevia && (
            <div className="foto-vista-previa">
              <img src={vistaPrevia} alt="Vista previa de la foto del incidente" />
              <button type="button" className="btn-quitar-foto" onClick={quitarFoto} title="Quitar foto">
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="form-acciones">
          <button
            type="submit"
            className="btn-guardar"
            disabled={!esOperador || loading || !descripcionLimpia || excedida}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" className="btn-cancelar" onClick={handleCancelar}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
