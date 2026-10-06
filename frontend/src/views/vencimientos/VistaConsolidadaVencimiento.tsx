import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client';
import '../../styles/formularioAlta.css';

export type OrigenVencimiento = 'personal' | 'equipo' | 'documento';
export type EstadoVencimiento = 'vencido' | 'proximo' | 'vigente';

export interface VencimientoFila {
  id: string;
  origen: OrigenVencimiento;
  concepto: string; 
  responsable: string; 
  referenciaId: number;
  fecha: string; 
  diasRestantes: number;
  estado: EstadoVencimiento;
}

interface Props {
  onIrAlRegistro: (vencimiento: VencimientoFila) => void;
}


const DIAS_ALERTA = 15;

const ETIQUETA_ORIGEN: Record<OrigenVencimiento, string> = {
  personal: 'Personal',
  equipo: 'Calibración / Mantenimiento',
  documento: 'Documentos',
};

const ETIQUETA_ESTADO: Record<EstadoVencimiento, string> = {
  vencido: '● Vencido',
  proximo: '▲ Próximo a vencer',
  vigente: '✓ Vigente',
};

const PESO_ESTADO: Record<EstadoVencimiento, number> = { vencido: 0, proximo: 1, vigente: 2 };


const calcularPlazo = (fechaIso: string): { fecha: string; diasRestantes: number; estado: EstadoVencimiento } => {
  const fecha = fechaIso.slice(0, 10); 
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diasRestantes = Math.round((new Date(anio, mes - 1, dia).getTime() - hoy.getTime()) / 86400000);

  let estado: EstadoVencimiento = 'vigente';
  if (diasRestantes < 0) estado = 'vencido';
  else if (diasRestantes <= DIAS_ALERTA) estado = 'proximo';

  return { fecha, diasRestantes, estado };
};

const formatearFecha = (fecha: string): string => {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
};

const describirPlazo = (dias: number): string => {
  if (dias < 0) return `Venció hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`;
  if (dias === 0) return 'Vence hoy';
  return `Vence en ${dias} ${dias === 1 ? 'día' : 'días'}`;
};


interface CertificadoApi {
  id: number;
  tipo: string;
  fechaVencimiento: string | null;
  legajo_persona: number;
}

interface PersonaApi {
  legajo: number;
  nombre: string;
  apellido: string;
  activo?: boolean;
}

const cargarVencimientosPersonal = async (): Promise<VencimientoFila[]> => {
  const [resCertificados, resPersonas] = await Promise.all([
    apiFetch('/certificados/'),
    apiFetch('/personal/'),
  ]);
  if (!resCertificados.ok) throw new Error('No se pudieron cargar los certificados del personal.');

  const certificados: CertificadoApi[] = await resCertificados.json();
  const personas: PersonaApi[] = resPersonas.ok ? await resPersonas.json() : [];
  const porLegajo = new Map(personas.map((p) => [p.legajo, p]));

  const filas: VencimientoFila[] = [];
  for (const cert of certificados) {
    if (!cert.fechaVencimiento) continue;
    const persona = porLegajo.get(cert.legajo_persona);
    if (persona && persona.activo === false) continue; 

    filas.push({
      id: `personal-${cert.id}`,
      origen: 'personal',
      concepto: cert.tipo,
      responsable: persona ? `${persona.nombre} ${persona.apellido}` : `Legajo ${cert.legajo_persona}`,
      referenciaId: cert.legajo_persona,
      ...calcularPlazo(cert.fechaVencimiento),
    });
  }
  return filas;
};


const cargarVencimientosEquipos = async (): Promise<VencimientoFila[]> => [];

const cargarVencimientosDocumentos = async (): Promise<VencimientoFila[]> => [];



export const VistaConsolidadaVencimiento: React.FC<Props> = ({ onIrAlRegistro }) => {
  const [filas, setFilas] = useState<VencimientoFila[]>([]);
  const [filtro, setFiltro] = useState<'' | OrigenVencimiento>('');
  const [filtroEstado, setFiltroEstado] = useState<'' | EstadoVencimiento>('');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      setCargando(true);
      setError(null);
      const resultados = await Promise.allSettled([
        cargarVencimientosPersonal(),
        cargarVencimientosEquipos(),
        cargarVencimientosDocumentos(),
      ]);
      if (cancelado) return;

      const todas: VencimientoFila[] = [];
      const fallidos: string[] = [];
      resultados.forEach((r, i) => {
        if (r.status === 'fulfilled') todas.push(...r.value);
        else fallidos.push(['personal', 'equipos', 'documentos'][i]);
      });

      todas.sort(
        (a, b) => PESO_ESTADO[a.estado] - PESO_ESTADO[b.estado] || a.diasRestantes - b.diasRestantes,
      );

      setFilas(todas);
      if (fallidos.length > 0) setError(`No se pudieron cargar los vencimientos de: ${fallidos.join(', ')}.`);
      setCargando(false);
    };

    cargar();
    return () => {
      cancelado = true;
    };
  }, []);

  const filasVisibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return filas.filter(
      (f) =>
        (!filtro || f.origen === filtro) &&
        (!filtroEstado || f.estado === filtroEstado) &&
        (!termino || `${f.concepto} ${f.responsable}`.toLowerCase().includes(termino)),
    );
  }, [filas, filtro, filtroEstado, busqueda]);

  const resumen = useMemo(
    () => ({
      vencidos: filasVisibles.filter((f) => f.estado === 'vencido').length,
      proximos: filasVisibles.filter((f) => f.estado === 'proximo').length,
      vigentes: filasVisibles.filter((f) => f.estado === 'vigente').length,
    }),
    [filasVisibles],
  );

  const sinDatosDelOrigen = filtro === 'equipo' || filtro === 'documento';

  return (
    <div className="modulo-container">
      <style>{ESTILOS}</style>

      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Vencimientos</h1>
          <div className="subtitulo">
            Personal, calibración / mantenimiento y documentos en una sola vista
          </div>
        </div>
      </div>

      <div className="venc-resumen">
        <span className="venc-chip venc-chip--vencido">● {resumen.vencidos} vencidos</span>
        <span className="venc-chip venc-chip--proximo">▲ {resumen.proximos} próximos</span>
        <span className="venc-chip venc-chip--vigente">✓ {resumen.vigentes} vigentes</span>
      </div>

      <div className="filtros-top-bar">
        <input
          type="text"
          className="input-busqueda"
          placeholder="Buscar por persona, equipo o concepto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          className="select-filtro"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as '' | OrigenVencimiento)}
          aria-label="Filtrar por tipo de vencimiento"
        >
          <option value="">Todos los tipos</option>
          <option value="personal">{ETIQUETA_ORIGEN.personal}</option>
          <option value="equipo">{ETIQUETA_ORIGEN.equipo}</option>
          <option value="documento">{ETIQUETA_ORIGEN.documento}</option>
        </select>
        <select
          className="select-filtro"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as '' | EstadoVencimiento)}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          <option value="vencido">Vencido</option>
          <option value="proximo">Próximo a vencer</option>
          <option value="vigente">Vigente</option>
        </select>
      </div>

      {error && <div className="alerta-error">{error}</div>}

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Estado</th>
              <th>Tipo</th>
              <th>Qué vence</th>
              <th>Responsable</th>
              <th>Fecha de vencimiento</th>
              <th>Plazo</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando vencimientos...
                </td>
              </tr>
            ) : filasVisibles.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  {sinDatosDelOrigen
                    ? 'Todavía no hay fechas de vencimiento cargadas para este tipo.'
                    : 'No hay vencimientos para mostrar.'}
                </td>
              </tr>
            ) : (
              filasVisibles.map((f) => (
                <tr key={f.id} className={`venc-fila--${f.estado}`}>
                  <td>
                    <span className={`venc-badge venc-badge--${f.estado}`}>{ETIQUETA_ESTADO[f.estado]}</span>
                  </td>
                  <td>{ETIQUETA_ORIGEN[f.origen]}</td>
                  <td>
                    <strong>{f.concepto}</strong>
                  </td>
                  <td>{f.responsable}</td>
                  <td>{formatearFecha(f.fecha)}</td>
                  <td>{describirPlazo(f.diasRestantes)}</td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button
                        type="button"
                        className="btn-icon btn-ver"
                        title="Ir al registro"
                        onClick={() => onIrAlRegistro(f)}
                      >
                        👁
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ESTILOS = `
.venc-resumen { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; }
.venc-chip { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.8rem; border-radius: 999px; font-size: 0.85rem; font-weight: 600; border: 1px solid transparent; }
.venc-chip--vencido, .venc-badge--vencido { background-color: #fee2e2; color: #dc2626; border-color: #f87171; }
.venc-chip--proximo, .venc-badge--proximo { background-color: #fef3c7; color: #b45309; border-color: #fcd34d; }
.venc-chip--vigente, .venc-badge--vigente { background-color: #dcfce7; color: #15803d; border-color: #86efac; }
.venc-badge { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; border: 1px solid transparent; white-space: nowrap; }
.venc-fila--vencido td:first-child { box-shadow: inset 4px 0 0 #dc2626; }
.venc-fila--proximo td:first-child { box-shadow: inset 4px 0 0 #f59e0b; }
.venc-fila--vigente td:first-child { box-shadow: inset 4px 0 0 #22c55e; }
.venc-nota { color: #6b7280; font-size: 0.85rem; margin: 0 0 1rem; }
`;