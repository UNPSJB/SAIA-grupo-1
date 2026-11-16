import { useState } from 'react';
import type { Modulo } from '../../components/Sidebar';
import '../../styles/formularioAlta.css';
import '../../styles/configuraciones.css';
import { actualizarVistaPublica, type EstadoVistaPublica, type ParametrosVistaPublica } from './vistaPublicaApi';

interface MaestroBasico {
  modulo: Modulo;
  titulo: string;
  descripcion: string;
}

const MAESTROS_BASICOS: MaestroBasico[] = [
  { modulo: 'sectores', titulo: 'Sectores', descripcion: 'Áreas de la planta donde se ubican equipos y planes de limpieza.' },
  { modulo: 'tipoCertificado', titulo: 'Tipos de Certificado', descripcion: 'Habilitaciones que se le exigen al personal.' },
  { modulo: 'tipoDocumento', titulo: 'Tipos de Documento', descripcion: 'Clasificación de los documentos versionados.' },
  { modulo: 'motivos', titulo: 'Motivos de No Realización', descripcion: 'Causas para marcar una tarea del checklist como no realizada.' },
];

const PARAMETROS: { campo: keyof Omit<ParametrosVistaPublica, 'habilitada'>; label: string }[] = [
  { campo: 'ver_grafico', label: 'Mostrar gráfico de tareas' },
  { campo: 'verAcercaDeNosotros', label: 'Mostrar Acerca de Nosotros' },
  { campo: 'verProductos', label: 'Mostrar listado de productos' },
];

interface PanelConfiguracionesProps {
  estadoVistaPublica: EstadoVistaPublica | null;
  errorVistaPublica: string | null;
  onEstadoVistaPublica: (estado: EstadoVistaPublica) => void;
  onAbrirMaestro: (modulo: Modulo) => void;
  onGestionarVistaPublica: () => void;
}

export function PanelConfiguraciones({
  estadoVistaPublica,
  errorVistaPublica,
  onEstadoVistaPublica,
  onAbrirMaestro,
  onGestionarVistaPublica,
}: PanelConfiguracionesProps) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const habilitada = estadoVistaPublica?.habilitada ?? false;

  async function cambiarParametro(campo: keyof Omit<ParametrosVistaPublica, 'habilitada'>, valor: boolean) {
    setError(null);
    setGuardando(true);
    try {
      onEstadoVistaPublica(await actualizarVistaPublica({ [campo]: valor }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión con el servidor.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modulo-container configuraciones">
      <div className="modulo-header">
        <h1>Configuraciones</h1>
        <div className="subtitulo">Maestros básicos y parámetros de la vista pública</div>
      </div>

      <section className="config-panel-seccion">
        <h2 className="config-panel-titulo">Maestros básicos</h2>
        <div className="config-panel-grilla">
          {MAESTROS_BASICOS.map((m) => (
            <button key={m.modulo} type="button" className="config-panel-tarjeta" onClick={() => onAbrirMaestro(m.modulo)}>
              <span className="config-panel-tarjeta-titulo">{m.titulo}</span>
              <span className="config-panel-tarjeta-desc">{m.descripcion}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="config-panel-seccion">
        <div className="config-panel-encabezado">
          <h2 className="config-panel-titulo">Vista pública</h2>
          {estadoVistaPublica && (
            <span className={`config-panel-estado ${habilitada ? 'es-habilitada' : 'es-deshabilitada'}`}>
              {habilitada ? 'Habilitada' : 'Deshabilitada'}
            </span>
          )}
        </div>

        {(errorVistaPublica || error) && <div className="alerta-error">{error ?? errorVistaPublica}</div>}

        {!estadoVistaPublica && !errorVistaPublica ? (
          <p className="config-panel-texto">Cargando estado...</p>
        ) : habilitada && estadoVistaPublica ? (
          <>
            <p className="config-panel-texto">Elegí qué secciones ve quien escanea el código QR.</p>
            {PARAMETROS.map(({ campo, label }) => (
              <div key={campo} className="config-switch-item">
                <input
                  type="checkbox"
                  className="switch-input"
                  id={`config-${campo}`}
                  checked={estadoVistaPublica[campo]}
                  disabled={guardando}
                  onChange={(e) => cambiarParametro(campo, e.target.checked)}
                />
                <label htmlFor={`config-${campo}`} className="config-switch-label">{label}</label>
              </div>
            ))}
            <div className="config-panel-acciones">
              <button type="button" className="btn-guardar" onClick={onGestionarVistaPublica}>
                Ver QR y gestionar contenido
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="config-panel-texto">
              La vista pública está deshabilitada. Al habilitarla se genera un código QR para compartir.
            </p>
            <div className="config-panel-acciones">
              <button type="button" className="btn-activar" onClick={onGestionarVistaPublica}>
                Activar Vista Pública
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
