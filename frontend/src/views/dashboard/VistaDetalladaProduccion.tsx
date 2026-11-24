import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiFetch } from '../../api/client';
import { ExportIcon } from '../../components/icons/ExportIcon';
import { ErrorAlertDialog } from '../../components/ui/alert-dialog';
import { Badge } from '../../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { ConfirmExportDialog, type FormatoExportacion } from '../../components/ui/confirmExportDialog';
import { ConfirmExportGraficoDialog } from '../../components/ui/confirmExportGraficoDialog';
import { Paginacion } from '../../components/ui/paginacion';
import { usePaginacion } from '../../components/ui/usePaginacion';
import { descargarCSV } from '../../utils/exportarCsv';
import {
  exportarGraficos,
  type ConfiguracionGraficoExportar,
  type FormatoGrafico,
} from '../../utils/exportarGraficos';
import { descargarPDF } from '../../utils/exportarPdf';
import type { LoteProduccion, Producto } from '../produccion/tipos';
import { useColoresTema } from './useColoresTema';
import '../../styles/dashboard.css';
import '../../styles/formularioAlta.css';
import '../../styles/produccion.css';

interface VistaDetalladaProduccionProps {
  onVolver: () => void;
}

const PALETA_COLORES = [
  '#0284c7',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#64748b',
  '#84cc16',
  '#14b8a6',
];

const ETIQUETAS_UNIDAD: Record<string, string> = {
  kilogramos: 'Kilogramos (kg)',
  gramos: 'Gramos (g)',
  litros: 'Litros (L)',
  mililitros: 'Mililitros (ml)',
  unidades: 'Unidades (u)',
};

const ABREVIATURAS_UNIDAD: Record<string, string> = {
  kilogramos: 'kg',
  gramos: 'g',
  litros: 'L',
  mililitros: 'ml',
  unidades: 'u',
};

const formatearUnidad = (u?: string | null): string => {
  const norm = (u || '').toLowerCase().trim();
  return ETIQUETAS_UNIDAD[norm] || u || 'Unidad';
};

const abreviarUnidad = (u?: string | null): string => {
  const norm = (u || '').toLowerCase().trim();
  return ABREVIATURAS_UNIDAD[norm] || u || '';
};

const formatearFechaInput = (d: Date): string => {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

const restarDias = (d: Date, dias: number): Date => {
  const res = new Date(d);
  res.setDate(res.getDate() - dias);
  return res;
};

const formatearFechaVisual = (fechaIso: string): string => {
  if (!fechaIso) return '';
  const partes = fechaIso.split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return fechaIso;
};

interface ModalDetalleLoteProps {
  lote: LoteProduccion;
  onClose: () => void;
}

const ModalDetalleLote: React.FC<ModalDetalleLoteProps> = ({ lote, onClose }) => {
  return (
    <div className="resp-modal-fondo"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div className="resp-modal-caja"
        style={{
          backgroundColor: 'var(--color-superficie)',
          borderRadius: '12px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--color-borde)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-borde)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-h)' }}>
              Detalle de Lote: {lote.codigo}
            </h2>
            <div style={{ fontSize: '12.5px', color: 'var(--color-texto-sec)', marginTop: '4px' }}>
              Elaborado el {formatearFechaVisual(lote.fecha)}
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
              gap: '14px',
              marginBottom: '20px',
              padding: '16px',
              backgroundColor: 'var(--color-fondo)',
              borderRadius: '8px',
              border: '1px solid var(--color-borde)',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-texto-sec)', textTransform: 'uppercase', fontWeight: 600 }}>
                Producto
              </span>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-h)', marginTop: '2px' }}>
                {lote.producto.nombre}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-texto-sec)', textTransform: 'uppercase', fontWeight: 600 }}>
                Cantidad Producida
              </span>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primario)', marginTop: '2px' }}>
                {lote.cantidad} {abreviarUnidad(lote.producto.unidadMedida)}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-texto-sec)', textTransform: 'uppercase', fontWeight: 600 }}>
                Responsable
              </span>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-h)', marginTop: '2px' }}>
                {lote.nombre_responsable}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-texto-sec)' }}>
                Legajo #{lote.responsable_legajo}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-texto-sec)', textTransform: 'uppercase', fontWeight: 600 }}>
                Estado
              </span>
              <div style={{ marginTop: '2px' }}>
                <Badge variant={lote.editable ? 'proximo' : 'al_dia'}>
                  {lote.editable ? 'Abierto (Hoy)' : 'Finalizado'}
                </Badge>
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: '1rem', color: 'var(--text-h)', margin: '0 0 10px 0' }}>
            Insumos y Materias Primas Utilizados ({lote.insumos.length})
          </h3>

          {lote.insumos.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-texto-sec)', backgroundColor: 'var(--color-fondo)', borderRadius: '8px' }}>
              No se registraron insumos para este lote.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid var(--color-borde)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-fondo)', borderBottom: '1px solid var(--color-borde)', color: 'var(--color-texto-sec)', fontSize: '11.5px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 12px' }}>Insumo</th>
                    <th style={{ padding: '8px 12px' }}>Lote Proveedor</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Cantidad</th>
                    <th style={{ padding: '8px 12px' }}>Unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {lote.insumos.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-borde)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500, color: 'var(--color-texto)' }}>
                        {item.insumo.nombre}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-texto-sec)' }}>
                        {item.insumo.lote || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--text-h)' }}>
                        {item.cantidad}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-texto-sec)' }}>
                        {abreviarUnidad(item.insumo.medida)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--color-borde)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button type="button" className="btn-cancelar" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export const VistaDetalladaProduccion: React.FC<VistaDetalladaProduccionProps> = ({ onVolver }) => {
  const colores = useColoresTema();
  const hoy = useMemo(() => new Date(), []);

  const [desde, setDesde] = useState<string>(() => formatearFechaInput(restarDias(hoy, 30)));
  const [hasta, setHasta] = useState<string>(() => formatearFechaInput(hoy));
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>('');
  const [busquedaLote, setBusquedaLote] = useState<string>('');

  const [productosCatalogo, setProductosCatalogo] = useState<Producto[]>([]);
  const [lotes, setLotes] = useState<LoteProduccion[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [agrupacionTemporal, setAgrupacionTemporal] = useState<'dia' | 'semana' | 'mes'>('dia');
  const [tipoGraficoEvolucion, setTipoGraficoEvolucion] = useState<'combinado' | 'ranking' | 'rendimiento' | 'control_spc'>('combinado');
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<string>('kilogramos');

  const [loteParaModal, setLoteParaModal] = useState<LoteProduccion | null>(null);

  const [exportando, setExportando] = useState(false);
  const [dialogExportarAbierto, setDialogExportarAbierto] = useState(false);
  const [errorExportDialog, setErrorExportDialog] = useState<string | null>(null);

  const graficoEvolucionRef = useRef<HTMLDivElement | null>(null);
  const graficoProductosRef = useRef<HTMLDivElement | null>(null);
  const graficoInsumosRef = useRef<HTMLDivElement | null>(null);

  const [exportGraficoModal, setExportGraficoModal] = useState<{
    titulo: string;
    filtros: string;
    nombreArchivo: string;
    graficos: ConfiguracionGraficoExportar[];
  } | null>(null);
  const [exportandoGrafico, setExportandoGrafico] = useState(false);

  const tituloGraficoEvolucion = useMemo(() => {
    if (tipoGraficoEvolucion === 'control_spc') {
      return 'Control Estadístico de Procesos (CEP / SPC)';
    }
    if (tipoGraficoEvolucion === 'ranking') {
      return 'Ranking y Participación por Producto';
    }
    if (tipoGraficoEvolucion === 'rendimiento') {
      return 'Rendimiento y Volumen Promedio por Lote';
    }
    return 'Evolución Temporal de Lotes y Volumen Fabricado';
  }, [tipoGraficoEvolucion]);

  const subtituloGraficoEvolucion = useMemo(() => {
    if (tipoGraficoEvolucion === 'control_spc') {
      return `Monitoreo estadístico en ${formatearUnidad(unidadSeleccionada)} (UCL/LCL a ±3σ)`;
    }
    if (tipoGraficoEvolucion === 'ranking') {
      return `Volumen total elaborado en ${formatearUnidad(unidadSeleccionada)} y porcentaje de contribución de cada producto`;
    }
    if (tipoGraficoEvolucion === 'rendimiento') {
      return `Cantidad promedio obtenida por lote en ${formatearUnidad(unidadSeleccionada)}`;
    }
    return `Agrupado por ${agrupacionTemporal} (Lotes elaborados y volumen total)`;
  }, [tipoGraficoEvolucion, unidadSeleccionada, agrupacionTemporal]);

  const errorRango = useMemo(() => {
    if (desde && desde < '2000-01-01') {
      return "La fecha 'Desde' no puede ser anterior al año 2000.";
    }
    if (desde && hasta && desde > hasta) {
      return "La fecha 'Desde' no puede ser posterior a 'Hasta'.";
    }
    return null;
  }, [desde, hasta]);

  useEffect(() => {
    let cancelado = false;
    const cargarProductos = async () => {
      try {
        const res = await apiFetch('/productos/');
        if (!cancelado && res.ok) {
          const data: Producto[] = await res.json();
          setProductosCatalogo(data.filter((p) => p.activo !== false));
        }
      } catch (e) {
        console.error('Error al cargar productos:', e);
      }
    };
    cargarProductos();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    const cargarLotes = async () => {
      if (errorRango) return;
      setCargando(true);
      setErrorCarga(null);

      const params = new URLSearchParams();
      if (desde) params.append('desde', desde);
      if (hasta) params.append('hasta', hasta);
      if (productoSeleccionado) params.append('producto_id', productoSeleccionado);

      try {
        const query = params.toString() ? `?${params.toString()}` : '';
        const res = await apiFetch(`/lotes/${query}`);
        if (!cancelado) {
          if (res.ok) {
            const data: LoteProduccion[] = await res.json();
            setLotes(data);
          } else {
            const err = await res.json().catch(() => ({}));
            setErrorCarga(err.detail || 'No se pudieron cargar los lotes de producción.');
            setLotes([]);
          }
        }
      } catch {
        if (!cancelado) {
          setErrorCarga('Error de conexión con el servidor al cargar los datos de producción.');
          setLotes([]);
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargarLotes();
    return () => {
      cancelado = true;
    };
  }, [desde, hasta, productoSeleccionado, errorRango]);

  const aplicarAtajo = (dias: number) => {
    const fin = new Date();
    const inicio = restarDias(fin, dias);
    setDesde(formatearFechaInput(inicio));
    setHasta(formatearFechaInput(fin));
  };

  const aplicarAtajoAnio = () => {
    const fin = new Date();
    const inicio = new Date(Math.max(2000, fin.getFullYear()), 0, 1);
    setDesde(formatearFechaInput(inicio));
    setHasta(formatearFechaInput(fin));
  };

  const aplicarAtajoTodo = () => {
    setDesde('');
    setHasta('');
  };

  const limpiarFiltros = () => {
    const fin = new Date();
    setDesde(formatearFechaInput(restarDias(fin, 30)));
    setHasta(formatearFechaInput(fin));
    setProductoSeleccionado('');
    setBusquedaLote('');
  };

  const unidadesDisponibles = useMemo(() => {
    const setU = new Set<string>();
    for (const l of lotes) {
      if (l.producto && l.producto.unidadMedida) {
        setU.add(l.producto.unidadMedida.toLowerCase().trim());
      }
    }
    for (const p of productosCatalogo) {
      if (p.unidadMedida) {
        setU.add(p.unidadMedida.toLowerCase().trim());
      }
    }
    const lista = Array.from(setU);
    if (lista.length === 0) return ['kilogramos'];
    return lista;
  }, [lotes, productosCatalogo]);

  useEffect(() => {
    if (unidadesDisponibles.length > 0 && !unidadesDisponibles.includes(unidadSeleccionada)) {
      setUnidadSeleccionada(unidadesDisponibles[0]);
    }
  }, [unidadesDisponibles, unidadSeleccionada]);

  const datosEvolucionTemporal = useMemo(() => {
    let fechaInicio: Date;
    let fechaFin: Date;

    if (desde && hasta) {
      fechaInicio = new Date(`${desde}T00:00:00`);
      fechaFin = new Date(`${hasta}T00:00:00`);
    } else {
      let minMs = Infinity;
      let maxMs = -Infinity;
      for (const l of lotes) {
        if (l.fecha) {
          const ms = new Date(`${l.fecha}T00:00:00`).getTime();
          if (!isNaN(ms)) {
            if (ms < minMs) minMs = ms;
            if (ms > maxMs) maxMs = ms;
          }
        }
      }
      if (minMs !== Infinity && maxMs !== -Infinity) {
        fechaInicio = new Date(minMs);
        fechaFin = new Date(maxMs);
      } else {
        const hoyD = new Date();
        hoyD.setHours(0, 0, 0, 0);
        fechaFin = hoyD;
        fechaInicio = restarDias(hoyD, 30);
      }
    }

    if (fechaInicio > fechaFin) return [];

    const minFecha2000 = new Date('2000-01-01T00:00:00');
    if (fechaInicio < minFecha2000) {
      fechaInicio = minFecha2000;
    }

    if (agrupacionTemporal === 'dia') {
      const conteos = new Map<string, { lotes: number; volumen: number; productos: Map<string, number> }>();
      for (const l of lotes) {
        if (l.fecha) {
          const k = l.fecha;
          if (!conteos.has(k)) {
            conteos.set(k, { lotes: 0, volumen: 0, productos: new Map() });
          }
          const item = conteos.get(k)!;
          item.lotes += 1;
          item.volumen += Number(l.cantidad) || 0;
          const pNom = l.producto?.nombre || 'Producto';
          item.productos.set(pNom, (item.productos.get(pNom) || 0) + 1);
        }
      }

      const puntos: { clave: string; etiqueta: string; etiquetaCompleta: string; lotes: number; volumen: number; detalle: string }[] = [];
      const cur = new Date(fechaInicio);
      while (cur <= fechaFin) {
        const anio = cur.getFullYear();
        const mes = String(cur.getMonth() + 1).padStart(2, '0');
        const dia = String(cur.getDate()).padStart(2, '0');
        const clave = `${anio}-${mes}-${dia}`;
        const dat = conteos.get(clave);
        const lotesCant = dat ? dat.lotes : 0;
        const volumenCant = dat ? Math.round(dat.volumen * 100) / 100 : 0;
        let detalle = '';
        if (dat && dat.productos.size > 0) {
          detalle = Array.from(dat.productos.entries())
            .map(([nom, cant]) => `${nom}: ${cant}`)
            .join(', ');
        }
        puntos.push({
          clave,
          etiqueta: `${dia}/${mes}`,
          etiquetaCompleta: `${dia}/${mes}/${anio}`,
          lotes: lotesCant,
          volumen: volumenCant,
          detalle,
        });
        cur.setDate(cur.getDate() + 1);
      }
      return puntos;
    }

    if (agrupacionTemporal === 'semana') {
      const obtenerInicioSemana = (d: Date): Date => {
        const r = new Date(d);
        r.setHours(0, 0, 0, 0);
        const day = r.getDay();
        r.setDate(r.getDate() - day);
        return r;
      };

      const conteos = new Map<string, { lotes: number; volumen: number; productos: Map<string, number> }>();
      for (const l of lotes) {
        if (l.fecha) {
          const d = new Date(`${l.fecha}T00:00:00`);
          if (!isNaN(d.getTime())) {
            const sem = obtenerInicioSemana(d);
            const k = `${sem.getFullYear()}-${String(sem.getMonth() + 1).padStart(2, '0')}-${String(sem.getDate()).padStart(2, '0')}`;
            if (!conteos.has(k)) {
              conteos.set(k, { lotes: 0, volumen: 0, productos: new Map() });
            }
            const item = conteos.get(k)!;
            item.lotes += 1;
            item.volumen += Number(l.cantidad) || 0;
            const pNom = l.producto?.nombre || 'Producto';
            item.productos.set(pNom, (item.productos.get(pNom) || 0) + 1);
          }
        }
      }

      const puntos: { clave: string; etiqueta: string; etiquetaCompleta: string; lotes: number; volumen: number; detalle: string }[] = [];
      const cur = obtenerInicioSemana(fechaInicio);
      const finSem = new Date(fechaFin);

      while (cur <= finSem) {
        const finS = new Date(cur);
        finS.setDate(finS.getDate() + 6);

        const anio = cur.getFullYear();
        const mes = String(cur.getMonth() + 1).padStart(2, '0');
        const dia = String(cur.getDate()).padStart(2, '0');
        const clave = `${anio}-${mes}-${dia}`;

        const diaF = String(finS.getDate()).padStart(2, '0');
        const mesF = String(finS.getMonth() + 1).padStart(2, '0');
        const anioF = finS.getFullYear();

        const dat = conteos.get(clave);
        const lotesCant = dat ? dat.lotes : 0;
        const volumenCant = dat ? Math.round(dat.volumen * 100) / 100 : 0;
        let detalle = '';
        if (dat && dat.productos.size > 0) {
          detalle = Array.from(dat.productos.entries())
            .map(([nom, cant]) => `${nom}: ${cant}`)
            .join(', ');
        }

        puntos.push({
          clave,
          etiqueta: `Sem ${dia}/${mes}`,
          etiquetaCompleta: `Semana del ${dia}/${mes} al ${diaF}/${mesF}/${anioF}`,
          lotes: lotesCant,
          volumen: volumenCant,
          detalle,
        });

        cur.setDate(cur.getDate() + 7);
      }
      return puntos;
    }

    const mesesCortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const mesesLargos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const conteos = new Map<string, { lotes: number; volumen: number; productos: Map<string, number> }>();
    for (const l of lotes) {
      if (l.fecha && l.fecha.length >= 7) {
        const k = l.fecha.slice(0, 7);
        if (!conteos.has(k)) {
          conteos.set(k, { lotes: 0, volumen: 0, productos: new Map() });
        }
        const item = conteos.get(k)!;
        item.lotes += 1;
        item.volumen += Number(l.cantidad) || 0;
        const pNom = l.producto?.nombre || 'Producto';
        item.productos.set(pNom, (item.productos.get(pNom) || 0) + 1);
      }
    }

    const puntos: { clave: string; etiqueta: string; etiquetaCompleta: string; lotes: number; volumen: number; detalle: string }[] = [];
    let curAnio = fechaInicio.getFullYear();
    let curMes = fechaInicio.getMonth();
    const finAnio = fechaFin.getFullYear();
    const finMes = fechaFin.getMonth();

    while (curAnio < finAnio || (curAnio === finAnio && curMes <= finMes)) {
      const clave = `${curAnio}-${String(curMes + 1).padStart(2, '0')}`;
      const dat = conteos.get(clave);
      const lotesCant = dat ? dat.lotes : 0;
      const volumenCant = dat ? Math.round(dat.volumen * 100) / 100 : 0;
      let detalle = '';
      if (dat && dat.productos.size > 0) {
        detalle = Array.from(dat.productos.entries())
          .map(([nom, cant]) => `${nom}: ${cant}`)
          .join(', ');
      }
      puntos.push({
        clave,
        etiqueta: `${mesesCortos[curMes]} ${String(curAnio).slice(-2)}`,
        etiquetaCompleta: `${mesesLargos[curMes]} de ${curAnio}`,
        lotes: lotesCant,
        volumen: volumenCant,
        detalle,
      });
      curMes++;
      if (curMes > 11) {
        curMes = 0;
        curAnio++;
      }
    }
    return puntos;
  }, [lotes, desde, hasta, agrupacionTemporal]);

  const datosControlEstadistico = useMemo(() => {
    const normUnidad = unidadSeleccionada.toLowerCase().trim();
    const filtrados = lotes
      .filter((l) => (l.producto?.unidadMedida || '').toLowerCase().trim() === normUnidad)
      .sort((a, b) => {
        const fa = a.fecha || '';
        const fb = b.fecha || '';
        if (fa !== fb) return fa.localeCompare(fb);
        return a.id - b.id;
      });

    if (filtrados.length === 0) {
      return {
        puntos: [],
        media: 0,
        sigma: 0,
        ucl: 0,
        lcl: 0,
        uwcl: 0,
        lwcl: 0,
        totalLotes: 0,
        enControl: 0,
        fueraDeControl: 0,
      };
    }

    const n = filtrados.length;
    const cantidades = filtrados.map((l) => Number(l.cantidad) || 0);
    const media = cantidades.reduce((a, b) => a + b, 0) / n;

    let varianza = 0;
    if (n > 1) {
      const sumaCuadrados = cantidades.reduce((acc, c) => acc + Math.pow(c - media, 2), 0);
      varianza = sumaCuadrados / (n - 1);
    }
    const sigma = Math.sqrt(varianza);

    const ucl = Math.round((media + 3 * sigma) * 100) / 100;
    const lcl = Math.max(0, Math.round((media - 3 * sigma) * 100) / 100);
    const uwcl = Math.round((media + 2 * sigma) * 100) / 100;
    const lwcl = Math.max(0, Math.round((media - 2 * sigma) * 100) / 100);

    let enControl = 0;
    let fueraDeControl = 0;

    const puntos = filtrados.map((l, index) => {
      const cant = Number(l.cantidad) || 0;
      const esFuera = n > 1 && sigma > 0 ? cant > ucl || cant < lcl : false;
      const esAdv = n > 1 && sigma > 0 && !esFuera ? cant > uwcl || cant < lwcl : false;

      if (esFuera) fueraDeControl++;
      else enControl++;

      return {
        index: index + 1,
        id: l.id,
        codigo: l.codigo,
        fecha: formatearFechaVisual(l.fecha),
        producto: l.producto?.nombre || 'Producto',
        cantidad: Math.round(cant * 100) / 100,
        media: Math.round(media * 100) / 100,
        ucl,
        lcl,
        uwcl,
        lwcl,
        esFuera,
        esAdv,
        estado: esFuera ? 'Fuera de control (±3σ)' : esAdv ? 'Advertencia (±2σ)' : 'Bajo control',
      };
    });

    return {
      puntos,
      media: Math.round(media * 100) / 100,
      sigma: Math.round(sigma * 100) / 100,
      ucl,
      lcl,
      uwcl,
      lwcl,
      totalLotes: n,
      enControl,
      fueraDeControl,
    };
  }, [lotes, unidadSeleccionada]);

  const datosDistribucionProductos = useMemo(() => {
    if (lotes.length === 0) return [];
    const mapa = new Map<string, { nombre: string; volumen: number; lotes: number }>();

    for (const l of lotes) {
      const pNom = l.producto?.nombre || 'Sin producto';
      if (!mapa.has(pNom)) {
        mapa.set(pNom, { nombre: pNom, volumen: 0, lotes: 0 });
      }
      const item = mapa.get(pNom)!;
      item.volumen += Number(l.cantidad) || 0;
      item.lotes += 1;
    }

    const items = Array.from(mapa.values());
    const totalVol = items.reduce((acc, curr) => acc + curr.volumen, 0);

    return items
      .map((item) => {
        const volumen = Math.round(item.volumen * 10) / 10;
        const porcentaje = totalVol > 0 ? Math.round((item.volumen / totalVol) * 1000) / 10 : 0;
        return {
          nombre: item.nombre,
          volumen,
          lotes: item.lotes,
          porcentaje,
          etiquetaValor: `${volumen} ${abreviarUnidad(unidadSeleccionada)} (${porcentaje}%)`,
        };
      })
      .sort((a, b) => b.volumen - a.volumen);
  }, [lotes, unidadSeleccionada]);

  const datosRendimientoLotes = useMemo(() => {
    if (lotes.length === 0) return [];
    return datosDistribucionProductos.map((item) => ({
      nombre: item.nombre,
      promedio: item.lotes > 0 ? Math.round((item.volumen / item.lotes) * 10) / 10 : 0,
      lotes: item.lotes,
      volumen: item.volumen,
    }));
  }, [datosDistribucionProductos]);

  const datosProductosPorUnidad = useMemo(() => {
    const normUnidad = unidadSeleccionada.toLowerCase().trim();
    const mapa = new Map<string, { id: number; nombre: string; cantidad: number; lotes: number; unidad: string }>();

    for (const l of lotes) {
      const uLote = (l.producto?.unidadMedida || '').toLowerCase().trim();
      if (uLote === normUnidad) {
        const key = String(l.producto.id);
        if (!mapa.has(key)) {
          mapa.set(key, {
            id: l.producto.id,
            nombre: l.producto.nombre,
            cantidad: 0,
            lotes: 0,
            unidad: l.producto.unidadMedida,
          });
        }
        const item = mapa.get(key)!;
        item.cantidad += Number(l.cantidad) || 0;
        item.lotes += 1;
      }
    }

    const res = Array.from(mapa.values())
      .map((item, index) => ({
        ...item,
        cantidad: Math.round(item.cantidad * 100) / 100,
        color: PALETA_COLORES[index % PALETA_COLORES.length],
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    return res;
  }, [lotes, unidadSeleccionada]);

  const datosInsumosMasUtilizados = useMemo(() => {
    const mapa = new Map<string, { id: number; nombre: string; cantidad: number; lotes: Set<number>; medida: string }>();

    for (const l of lotes) {
      for (const ins of l.insumos) {
        const key = ins.insumo.nombre.toLowerCase().trim();
        if (!mapa.has(key)) {
          mapa.set(key, {
            id: ins.insumo.id,
            nombre: ins.insumo.nombre,
            cantidad: 0,
            lotes: new Set<number>(),
            medida: ins.insumo.medida,
          });
        }
        const item = mapa.get(key)!;
        item.cantidad += Number(ins.cantidad) || 0;
        item.lotes.add(l.id);
      }
    }

    const items = Array.from(mapa.values())
      .map((item, index) => ({
        id: item.id,
        nombre: item.nombre,
        cantidad: Math.round(item.cantidad * 100) / 100,
        lotesCount: item.lotes.size,
        medida: item.medida,
        color: PALETA_COLORES[index % PALETA_COLORES.length],
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    return items;
  }, [lotes]);

  const kpis = useMemo(() => {
    const totalLotes = lotes.length;

    const volumenEnUnidad = datosProductosPorUnidad.reduce((acc, p) => acc + p.cantidad, 0);

    const mapaProds = new Map<string, { nombre: string; lotes: number; cantidad: number; unidad: string }>();
    for (const l of lotes) {
      const nom = l.producto?.nombre || 'Producto';
      if (!mapaProds.has(nom)) {
        mapaProds.set(nom, {
          nombre: nom,
          lotes: 0,
          cantidad: 0,
          unidad: l.producto?.unidadMedida || '',
        });
      }
      const item = mapaProds.get(nom)!;
      item.lotes += 1;
      item.cantidad += Number(l.cantidad) || 0;
    }

    let prodLider: { nombre: string; lotes: number; cantidad: number; unidad: string } | null = null;
    for (const item of mapaProds.values()) {
      if (!prodLider || item.lotes > prodLider.lotes) {
        prodLider = item;
      }
    }

    const insumoLider = datosInsumosMasUtilizados.length > 0 ? datosInsumosMasUtilizados[0] : null;

    return {
      totalLotes,
      volumenEnUnidad: Math.round(volumenEnUnidad * 100) / 100,
      prodLider,
      insumoLider,
    };
  }, [lotes, datosProductosPorUnidad, datosInsumosMasUtilizados]);

  const lotesFiltrados = useMemo(() => {
    const term = busquedaLote.toLowerCase().trim();
    if (!term) return lotes;
    return lotes.filter((l) => {
      const cod = (l.codigo || '').toLowerCase();
      const prod = (l.producto?.nombre || '').toLowerCase();
      const resp = (l.nombre_responsable || '').toLowerCase();
      const leg = String(l.responsable_legajo || '');
      return cod.includes(term) || prod.includes(term) || resp.includes(term) || leg.includes(term);
    });
  }, [lotes, busquedaLote]);

  const {
    itemsPaginados,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(lotesFiltrados, 10);

  const ejecutarExportacion = async (formato: FormatoExportacion) => {
    try {
      setExportando(true);
      const params = new URLSearchParams();

      if (desde) params.append('desde', desde);
      if (hasta) params.append('hasta', hasta);
      if (productoSeleccionado) params.append('producto_id', productoSeleccionado);
      if (busquedaLote.trim()) params.append('busqueda', busquedaLote.trim());

      const queryString = params.toString();
      const query = queryString ? `?${queryString}` : '';

      if (formato === 'pdf') {
        await descargarPDF(`/lotes/exportar-pdf${query}`, 'produccion_detallada.pdf');
      } else {
        await descargarCSV(`/lotes/exportar-csv${query}`, 'produccion_detallada.csv');
      }

      setDialogExportarAbierto(false);
    } catch (err) {
      setErrorExportDialog(
        err instanceof Error
          ? err.message
          : `Error al exportar producción detallada a ${formato.toUpperCase()}.`
      );
    } finally {
      setExportando(false);
    }
  };

  const obtenerResumenFiltros = () => {
    const partes: string[] = [];
    if (desde) partes.push(`Desde: ${formatearFechaVisual(desde)}`);
    if (hasta) partes.push(`Hasta: ${formatearFechaVisual(hasta)}`);
    if (productoSeleccionado) {
      const prod = productosCatalogo.find((p) => String(p.id) === productoSeleccionado);
      partes.push(`Producto: ${prod ? prod.nombre : `#${productoSeleccionado}`}`);
    }
    if (busquedaLote.trim()) partes.push(`Búsqueda: "${busquedaLote.trim()}"`);
    return partes.length > 0 ? partes.join(' | ') : 'Sin filtros aplicados';
  };

  const abrirExportacionTodosGraficos = () => {
    const filtros = obtenerResumenFiltros();
    const lista: ConfiguracionGraficoExportar[] = [];

    if (graficoEvolucionRef.current && datosEvolucionTemporal.length > 0 && kpis.totalLotes > 0) {
      lista.push({
        id: 'produccion-evolucion',
        titulo: tituloGraficoEvolucion,
        subtitulo: subtituloGraficoEvolucion,
        filtros,
        contenedor: graficoEvolucionRef.current,
      });
    }
    if (graficoProductosRef.current && datosProductosPorUnidad.length > 0) {
      lista.push({
        id: 'produccion-totales-unidad',
        titulo: `Totales de Productos Fabricados (${formatearUnidad(unidadSeleccionada)})`,
        subtitulo: 'Cantidad acumulada elaborada por producto',
        filtros: `${filtros} | Unidad: ${formatearUnidad(unidadSeleccionada)}`,
        contenedor: graficoProductosRef.current,
      });
    }
    if (graficoInsumosRef.current && datosInsumosMasUtilizados.length > 0) {
      lista.push({
        id: 'produccion-insumos-usados',
        titulo: 'Insumos Más Utilizados',
        subtitulo: 'Materias primas con mayor demanda en los lotes del período',
        filtros,
        contenedor: graficoInsumosRef.current,
      });
    }

    if (lista.length === 0) {
      setErrorExportDialog('No hay gráficos con datos visibles para exportar.');
      return;
    }

    setExportGraficoModal({
      titulo: `Producción Detallada (${lista.length} gráficos)`,
      filtros,
      nombreArchivo: `graficos_produccion_${desde || 'inicio'}_a_${hasta || 'hoy'}`,
      graficos: lista,
    });
  };

  const ejecutarExportacionGrafico = async (formato: FormatoGrafico) => {
    if (!exportGraficoModal) return;
    try {
      setExportandoGrafico(true);
      await exportarGraficos(
        exportGraficoModal.graficos,
        formato,
        exportGraficoModal.nombreArchivo,
        'Reporte Gráfico - Producción Detallada'
      );
      setExportGraficoModal(null);
    } catch (err) {
      setErrorExportDialog(
        err instanceof Error ? err.message : 'Error al exportar el gráfico.'
      );
    } finally {
      setExportandoGrafico(false);
    }
  };

  return (
    <div className="modulo-container dashboard-vista-detalle">
      <nav className="dashboard-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="dashboard-breadcrumb-link" onClick={onVolver}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="7" height="9" x="3" y="3" rx="1.5" />
            <rect width="7" height="5" x="14" y="3" rx="1.5" />
            <rect width="7" height="9" x="14" y="12" rx="1.5" />
            <rect width="7" height="5" x="3" y="16" rx="1.5" />
          </svg>
          Inicio
        </button>
        <span className="dashboard-breadcrumb-separador">/</span>
        <span className="dashboard-breadcrumb-actual">Producción Detallada</span>
      </nav>

      <div className="dashboard-vista-detalle-header" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', width: '100%' }}>
          <div>
            <button type="button" className="dashboard-btn-volver" onClick={onVolver}>
              &larr; Volver al Dashboard
            </button>
            <h1 style={{ fontSize: '1.65rem', margin: '0.5rem 0 0.25rem 0', color: 'var(--text-h)' }}>
              Vista Detallada de Producción
            </h1>
            <div className="subtitulo" style={{ fontSize: '0.88rem', color: 'var(--color-texto-sec)' }}>
              Monitoreo de lotes elaborados, volumen fabricado e insumos utilizados
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {!cargando && kpis.totalLotes > 0 && (
              <button
                type="button"
                onClick={abrirExportacionTodosGraficos}
                className="btn-cancelar"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Exportar todos los gráficos de producción en PNG, JPEG o PDF"
              >
                <ExportIcon size={18} /> Exportar Gráficos
              </button>
            )}
            <button
              type="button"
              onClick={() => setDialogExportarAbierto(true)}
              className="btn-cancelar"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <ExportIcon size={18} /> Exportar Datos
            </button>
          </div>
        </div>
      </div>

      <Card style={{ marginBottom: '1.5rem' }}>
        <CardContent style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-texto-sec)' }}>Desde</label>
                <input
                  type="date"
                  value={desde}
                  min="2000-01-01"
                  max={hasta || undefined}
                  onChange={(e) => setDesde(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--color-superficie)',
                    color: 'var(--color-texto)',
                    fontSize: '12.5px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-texto-sec)' }}>Hasta</label>
                <input
                  type="date"
                  value={hasta}
                  min={desde || '2000-01-01'}
                  onChange={(e) => setHasta(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--color-superficie)',
                    color: 'var(--color-texto)',
                    fontSize: '12.5px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-texto-sec)' }}>Producto</label>
                <select
                  value={productoSeleccionado}
                  onChange={(e) => setProductoSeleccionado(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--color-superficie)',
                    color: 'var(--color-texto)',
                    fontSize: '12.5px',
                    outline: 'none',
                    maxWidth: '220px',
                  }}
                >
                  <option value="">Todos los productos</option>
                  {productosCatalogo.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({abreviarUnidad(p.unidadMedida)})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={limpiarFiltros}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-borde)',
                  backgroundColor: 'var(--color-fondo)',
                  color: 'var(--color-texto-sec)',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Limpiar filtros
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-texto-sec)' }}>Atajos:</span>
              <button
                type="button"
                className="filtro-segmento-btn"
                onClick={() => aplicarAtajo(7)}
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                7 días
              </button>
              <button
                type="button"
                className="filtro-segmento-btn"
                onClick={() => aplicarAtajo(30)}
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                30 días
              </button>
              <button
                type="button"
                className="filtro-segmento-btn"
                onClick={aplicarAtajoAnio}
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                Este año
              </button>
              <button
                type="button"
                className="filtro-segmento-btn"
                onClick={aplicarAtajoTodo}
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                Todo
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {errorRango && (
        <div className="alerta-error" style={{ marginBottom: '1.25rem' }}>
          {errorRango}
        </div>
      )}

      {errorCarga && (
        <div className="alerta-error" style={{ marginBottom: '1.25rem' }}>
          {errorCarga}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
          gap: '12px',
          marginBottom: '1.5rem',
        }}
      >
        <Card>
          <CardContent style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)', fontWeight: 500 }}>
              Total de Lotes
            </span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primario)', marginTop: '4px' }}>
              {kpis.totalLotes}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', marginTop: '4px' }}>
              elaborados en el período
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)', fontWeight: 500 }}>
              Volumen Fabricado ({abreviarUnidad(unidadSeleccionada)})
            </span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-h)', marginTop: '4px' }}>
              {kpis.volumenEnUnidad} {abreviarUnidad(unidadSeleccionada)}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', marginTop: '4px' }}>
              en unidad {formatearUnidad(unidadSeleccionada)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)', fontWeight: 500 }}>
              Producto Más Elaborado
            </span>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {kpis.prodLider ? kpis.prodLider.nombre : 'Sin lotes'}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', marginTop: '4px' }}>
              {kpis.prodLider ? `${kpis.prodLider.lotes} lotes (${kpis.prodLider.cantidad} ${abreviarUnidad(kpis.prodLider.unidad)})` : '—'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)', fontWeight: 500 }}>
              Insumo Más Demandado
            </span>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {kpis.insumoLider ? kpis.insumoLider.nombre : 'Sin consumo'}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-texto-sec)', marginTop: '4px' }}>
              {kpis.insumoLider ? `${kpis.insumoLider.cantidad} ${abreviarUnidad(kpis.insumoLider.medida)} en ${kpis.insumoLider.lotesCount} lotes` : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader style={{ padding: '20px 24px 14px 24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', width: '100%' }}>
            <div>
              <CardTitle style={{ fontSize: '1.05rem' }}>
                {tituloGraficoEvolucion}
              </CardTitle>
              <CardDescription>
                {tipoGraficoEvolucion === 'control_spc'
                  ? 'Monitoreo estadístico de tamaño de lote con límites superior e inferior (UCL/LCL a ±3σ) y media'
                  : tipoGraficoEvolucion === 'ranking'
                  ? `Ranking de volumen total elaborado y porcentaje de participación por producto en ${formatearUnidad(unidadSeleccionada)}`
                  : tipoGraficoEvolucion === 'rendimiento'
                  ? `Tamaño promedio de lote por producto (${formatearUnidad(unidadSeleccionada)} / lote)`
                  : `Lotes elaborados (barras) y volumen total en ${formatearUnidad(unidadSeleccionada)} (línea) según período`}
              </CardDescription>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {tipoGraficoEvolucion === 'combinado' && (
                <div
                  style={{
                    display: 'inline-flex',
                    borderRadius: '8px',
                    padding: '3px',
                    backgroundColor: 'var(--color-fondo)',
                    border: '1px solid var(--color-borde)',
                  }}
                >
                  {[
                    { id: 'dia', label: 'Día' },
                    { id: 'semana', label: 'Semana' },
                    { id: 'mes', label: 'Mes' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAgrupacionTemporal(tab.id as 'dia' | 'semana' | 'mes')}
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: agrupacionTemporal === tab.id ? 600 : 500,
                        backgroundColor: agrupacionTemporal === tab.id ? 'var(--color-superficie)' : 'transparent',
                        color: agrupacionTemporal === tab.id ? 'var(--text-h)' : 'var(--color-texto-sec)',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: agrupacionTemporal === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              <div
                style={{
                  display: 'inline-flex',
                  borderRadius: '8px',
                  padding: '3px',
                  backgroundColor: 'var(--color-fondo)',
                  border: '1px solid var(--color-borde)',
                }}
              >
                {[
                  { id: 'combinado', label: 'Evolución Temporal' },
                  { id: 'ranking', label: 'Ranking y Participación' },
                  { id: 'rendimiento', label: 'Rendimiento / Lote' },
                  { id: 'control_spc', label: 'Control (CEP)' },
                ].map((modo) => (
                  <button
                    key={modo.id}
                    type="button"
                    onClick={() => setTipoGraficoEvolucion(modo.id as any)}
                    style={{
                      padding: '4px 9px',
                      fontSize: '12px',
                      fontWeight: tipoGraficoEvolucion === modo.id ? 600 : 500,
                      backgroundColor: tipoGraficoEvolucion === modo.id ? 'var(--color-superficie)' : 'transparent',
                      color: tipoGraficoEvolucion === modo.id ? 'var(--text-h)' : 'var(--color-texto-sec)',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {modo.label}
                  </button>
                ))}
              </div>

              {!cargando && datosEvolucionTemporal.length > 0 && kpis.totalLotes > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setExportGraficoModal({
                      titulo: tituloGraficoEvolucion,
                      filtros: `${obtenerResumenFiltros()} | ${subtituloGraficoEvolucion}`,
                      nombreArchivo: `evolucion_produccion_${desde || 'inicio'}_a_${hasta || 'hoy'}`,
                      graficos: [
                        {
                          id: 'produccion-evolucion',
                          titulo: tituloGraficoEvolucion,
                          subtitulo: subtituloGraficoEvolucion,
                          filtros: obtenerResumenFiltros(),
                          contenedor: graficoEvolucionRef.current,
                        },
                      ],
                    })
                  }
                  className="btn-cancelar"
                  style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  title="Exportar gráfico en PNG, JPEG o PDF"
                >
                  <ExportIcon size={14} /> Exportar gráfico
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent style={{ padding: '0 24px 20px 24px' }}>
          {cargando ? (
            <div style={{ minHeight: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-texto-sec)' }}>
              Cargando estadísticas de producción de lotes...
            </div>
          ) : datosEvolucionTemporal.length === 0 || kpis.totalLotes === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--color-texto-sec)', marginBottom: '8px' }}>
                precision_manufacturing
              </span>
              <strong style={{ display: 'block', color: 'var(--text-h)', marginBottom: '4px' }}>Sin lotes registrados</strong>
              <span style={{ fontSize: '13px' }}>No se encontraron lotes producidos en el rango de fechas seleccionado.</span>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="dashboard-btn-detalle"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                  onClick={() => aplicarAtajo(90)}
                >
                  Ver últimos 90 días
                </button>
                <button
                  type="button"
                  className="dashboard-btn-detalle"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                  onClick={aplicarAtajoAnio}
                >
                  Ver este año
                </button>
                <button
                  type="button"
                  className="dashboard-btn-detalle"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                  onClick={aplicarAtajoTodo}
                >
                  Ver todo el histórico
                </button>
              </div>
            </div>
          ) : (
            <div ref={graficoEvolucionRef} style={{ width: '100%' }}>
              {tipoGraficoEvolucion === 'control_spc' ? (
                <div>
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--color-fondo)', border: '1px solid var(--color-borde)', fontSize: '12px' }}>
                    <div><span style={{ color: 'var(--color-texto-sec)' }}>Media (X̄):</span> <strong style={{ color: 'var(--text-h)' }}>{datosControlEstadistico.media} {abreviarUnidad(unidadSeleccionada)}</strong></div>
                    <div><span style={{ color: 'var(--color-texto-sec)' }}>Desvío (σ):</span> <strong style={{ color: 'var(--text-h)' }}>±{datosControlEstadistico.sigma}</strong></div>
                    <div><span style={{ color: 'var(--color-texto-sec)' }}>Límite Sup. (UCL +3σ):</span> <strong style={{ color: '#ef4444' }}>{datosControlEstadistico.ucl}</strong></div>
                    <div><span style={{ color: 'var(--color-texto-sec)' }}>Límite Inf. (LCL -3σ):</span> <strong style={{ color: '#ef4444' }}>{datosControlEstadistico.lcl}</strong></div>
                    <div><span style={{ color: 'var(--color-texto-sec)' }}>Bajo Control:</span> <strong style={{ color: '#10b981' }}>{datosControlEstadistico.enControl} / {datosControlEstadistico.totalLotes}</strong></div>
                    {datosControlEstadistico.fueraDeControl > 0 && (
                      <div><strong style={{ color: '#ef4444' }}><span className="material-symbols-outlined">warning</span> {datosControlEstadistico.fueraDeControl} desvío(s) fuera de límites normativos</strong></div>
                    )}
                  </div>
                  <div style={{ width: '100%', height: 360 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <ComposedChart data={datosControlEstadistico.puntos} margin={{ top: 16, right: 30, left: 10, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} vertical={false} />
                        <XAxis
                          dataKey="codigo"
                          stroke={colores.textoSec}
                          fontSize={12}
                          tickLine={false}
                          interval={0}
                          angle={datosControlEstadistico.puntos.length > 8 ? -20 : 0}
                          textAnchor={datosControlEstadistico.puntos.length > 8 ? 'end' : 'middle'}
                          height={datosControlEstadistico.puntos.length > 8 ? 40 : 25}
                        />
                        <YAxis
                          stroke={colores.textoSec}
                          fontSize={12}
                          tickLine={false}
                          width={48}
                          unit={` ${abreviarUnidad(unidadSeleccionada)}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-superficie-elevada, #ffffff)',
                            borderColor: 'var(--color-borde)',
                            borderRadius: '8px',
                            color: 'var(--color-texto)',
                          }}
                          formatter={(valor: any, _name: any, item: any) => [
                            `${valor} ${abreviarUnidad(unidadSeleccionada)} (${item?.payload?.producto || ''}) - ${item?.payload?.estado || ''}`,
                            `Lote ${item?.payload?.codigo || ''}`,
                          ]}
                          labelFormatter={(_, items) => `Fecha: ${items?.[0]?.payload?.fecha || ''}`}
                        />
                        <Legend verticalAlign="top" align="right" height={30} wrapperStyle={{ fontSize: '12px' }} />
                        <ReferenceLine
                          y={datosControlEstadistico.ucl}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          strokeWidth={1.8}
                          label={{ value: `UCL (+3σ): ${datosControlEstadistico.ucl}`, position: 'insideTopRight', fill: '#ef4444', fontSize: 11, fontWeight: 600 }}
                        />
                        <ReferenceLine
                          y={datosControlEstadistico.media}
                          stroke="#3b82f6"
                          strokeDasharray="3 3"
                          strokeWidth={1.5}
                          label={{ value: `Media (X̄): ${datosControlEstadistico.media}`, position: 'insideTopLeft', fill: '#3b82f6', fontSize: 11, fontWeight: 600 }}
                        />
                        <ReferenceLine
                          y={datosControlEstadistico.lcl}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          strokeWidth={1.8}
                          label={{ value: `LCL (-3σ): ${datosControlEstadistico.lcl}`, position: 'insideBottomRight', fill: '#ef4444', fontSize: 11, fontWeight: 600 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="cantidad"
                          name={`Volumen por Lote (${abreviarUnidad(unidadSeleccionada)})`}
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={(dotProps: any) => {
                            const { cx, cy, payload } = dotProps;
                            const fill = payload?.esFuera ? '#ef4444' : payload?.esAdv ? '#f59e0b' : '#10b981';
                            return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={payload?.esFuera ? 6 : 4} fill={fill} stroke="#ffffff" strokeWidth={1.5} />;
                          }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : tipoGraficoEvolucion === 'ranking' ? (
                <div style={{ width: '100%' }}>
                  <div style={{ width: '100%', height: Math.max(340, datosDistribucionProductos.length * 52) }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <BarChart
                        layout="vertical"
                        data={datosDistribucionProductos}
                        margin={{ top: 12, right: 130, left: 10, bottom: 12 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} horizontal={false} />
                        <XAxis
                          type="number"
                          stroke={colores.textoSec}
                          fontSize={12}
                          tickLine={false}
                          unit={` ${abreviarUnidad(unidadSeleccionada)}`}
                        />
                        <YAxis
                          type="category"
                          dataKey="nombre"
                          stroke={colores.textoSec}
                          fontSize={12}
                          tickLine={false}
                          width={150}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-superficie-elevada, #ffffff)',
                            borderColor: 'var(--color-borde)',
                            borderRadius: '8px',
                            color: 'var(--color-texto)',
                          }}
                          formatter={(val: any, name: any, item: any) => [
                            `${val} ${abreviarUnidad(unidadSeleccionada)} (${item?.payload?.porcentaje ?? 0}%) · ${item?.payload?.lotes ?? 0} lotes`,
                            'Volumen Fabricado',
                          ]}
                        />
                        <Bar
                          dataKey="volumen"
                          name="Volumen Fabricado"
                          radius={[0, 6, 6, 0]}
                        >
                          {datosDistribucionProductos.map((entry, index) => (
                            <Cell
                              key={`bar-cell-${entry.nombre}`}
                              fill={PALETA_COLORES[index % PALETA_COLORES.length]}
                            />
                          ))}
                          <LabelList
                            dataKey="etiquetaValor"
                            position="right"
                            style={{ fontSize: 11.5, fontWeight: 600, fill: colores.texto }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '10px',
                      justifyContent: 'center',
                      marginTop: '16px',
                      paddingTop: '14px',
                      borderTop: '1px solid var(--color-borde)',
                    }}
                  >
                    {datosDistribucionProductos.map((p, index) => (
                      <div
                        key={p.nombre}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '7px',
                          fontSize: '12px',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--color-fondo)',
                          border: '1px solid var(--color-borde)',
                        }}
                      >
                        <span
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: PALETA_COLORES[index % PALETA_COLORES.length],
                            flexShrink: 0,
                          }}
                        />
                        <strong style={{ color: 'var(--text-h)' }}>{p.nombre}:</strong>
                        <span>{p.volumen} {abreviarUnidad(unidadSeleccionada)}</span>
                        <span style={{ color: 'var(--color-primario, #3b82f6)', fontWeight: 600 }}>({p.porcentaje}%)</span>
                        <span style={{ color: 'var(--color-texto-sec)', fontSize: '11px' }}>· {p.lotes} {p.lotes === 1 ? 'lote' : 'lotes'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : tipoGraficoEvolucion === 'rendimiento' ? (
                <div style={{ width: '100%', height: 360 }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={datosRendimientoLotes} margin={{ top: 16, right: 24, left: 10, bottom: 35 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} vertical={false} />
                      <XAxis
                        dataKey="nombre"
                        stroke={colores.textoSec}
                        fontSize={12}
                        tickLine={false}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={40}
                      />
                      <YAxis
                        allowDecimals={false}
                        stroke={colores.textoSec}
                        fontSize={12}
                        tickLine={false}
                        width={50}
                        label={{
                          value: `Promedio (${abreviarUnidad(unidadSeleccionada)}/lote)`,
                          angle: -90,
                          position: 'insideLeft',
                          offset: 10,
                          fill: colores.textoSec,
                          fontSize: 11,
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-superficie-elevada, #ffffff)',
                          borderColor: 'var(--color-borde)',
                          borderRadius: '8px',
                          color: 'var(--color-texto)',
                        }}
                        formatter={(val: any, _, item: any) => [
                          `${val} ${abreviarUnidad(unidadSeleccionada)}/lote (${item?.payload?.lotes} lotes, total ${item?.payload?.volumen} ${abreviarUnidad(unidadSeleccionada)})`,
                          'Rendimiento promedio',
                        ]}
                      />
                      <Bar dataKey="promedio" radius={[5, 5, 0, 0]}>
                        {datosRendimientoLotes.map((_, index) => (
                          <Cell
                            key={`rendimiento-bar-${index}`}
                            fill={PALETA_COLORES[index % PALETA_COLORES.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ width: '100%', height: 360 }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <ComposedChart data={datosEvolucionTemporal} margin={{ top: 16, right: 30, left: 10, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} vertical={false} />
                      <XAxis
                        dataKey="etiqueta"
                        stroke={colores.textoSec}
                        fontSize={12}
                        tickLine={false}
                        interval={datosEvolucionTemporal.length > 15 ? 'preserveStartEnd' : 0}
                        angle={datosEvolucionTemporal.length > 8 ? -20 : 0}
                        textAnchor={datosEvolucionTemporal.length > 8 ? 'end' : 'middle'}
                        height={datosEvolucionTemporal.length > 8 ? 38 : 25}
                      />
                      <YAxis
                        yAxisId="left"
                        allowDecimals={false}
                        stroke={colores.textoSec}
                        fontSize={12}
                        tickLine={false}
                        width={42}
                        label={{
                          value: 'Lotes Producidos',
                          angle: -90,
                          position: 'insideLeft',
                          offset: 10,
                          fill: colores.textoSec,
                          fontSize: 11,
                        }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#f59e0b"
                        fontSize={12}
                        tickLine={false}
                        width={54}
                        unit={` ${abreviarUnidad(unidadSeleccionada)}`}
                        label={{
                          value: `Volumen (${abreviarUnidad(unidadSeleccionada)})`,
                          angle: 90,
                          position: 'insideRight',
                          offset: 10,
                          fill: '#f59e0b',
                          fontSize: 11,
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-superficie-elevada, #ffffff)',
                          borderColor: 'var(--color-borde)',
                          borderRadius: '8px',
                          color: 'var(--color-texto)',
                        }}
                        formatter={(valor: any, nombre: any, item: any) => {
                          if (nombre.includes('Volumen')) {
                            return [`${valor} ${abreviarUnidad(unidadSeleccionada)}`, nombre];
                          }
                          return [`${valor} ${valor === 1 ? 'lote' : 'lotes'}${item?.payload?.detalle ? ` (${item.payload.detalle})` : ''}`, nombre];
                        }}
                        labelFormatter={(_, items) => items?.[0]?.payload?.etiquetaCompleta || ''}
                      />
                      <Legend verticalAlign="top" align="right" height={30} wrapperStyle={{ fontSize: '12px' }} />
                      <Bar yAxisId="left" dataKey="lotes" name="Lotes Producidos" fill={colores.primario} radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="volumen" name={`Volumen Fabricado (${abreviarUnidad(unidadSeleccionada)})`} stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3.5, fill: '#f59e0b' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(460px, 100%), 1fr))',
          gap: '16px',
          marginBottom: '1.5rem',
        }}
      >
        <Card>
          <CardHeader style={{ padding: '20px 24px 12px 24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div>
                <CardTitle style={{ fontSize: '1rem' }}>Totales de Productos Fabricados</CardTitle>
                <CardDescription>Cantidad acumulada elaborada en {formatearUnidad(unidadSeleccionada)}</CardDescription>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-texto-sec)' }}>Unidad:</label>
                <select
                  value={unidadSeleccionada}
                  onChange={(e) => setUnidadSeleccionada(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--color-superficie)',
                    color: 'var(--color-texto)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                >
                  {unidadesDisponibles.map((u) => (
                    <option key={u} value={u}>
                      {formatearUnidad(u)}
                    </option>
                  ))}
                </select>
                {!cargando && datosProductosPorUnidad.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setExportGraficoModal({
                        titulo: `Totales de Productos Fabricados (${formatearUnidad(unidadSeleccionada)})`,
                        filtros: `${obtenerResumenFiltros()} | Unidad: ${formatearUnidad(unidadSeleccionada)}`,
                        nombreArchivo: `totales_productos_${unidadSeleccionada}_${desde || 'inicio'}_a_${hasta || 'hoy'}`,
                        graficos: [
                          {
                            id: 'produccion-totales-unidad',
                            titulo: `Totales de Productos Fabricados (${formatearUnidad(unidadSeleccionada)})`,
                            subtitulo: 'Cantidad acumulada elaborada por producto',
                            filtros: `${obtenerResumenFiltros()} | Unidad: ${formatearUnidad(unidadSeleccionada)}`,
                            contenedor: graficoProductosRef.current,
                          },
                        ],
                      })
                    }
                    className="btn-cancelar"
                    style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    title="Exportar gráfico en PNG, JPEG o PDF"
                  >
                    <ExportIcon size={14} /> Exportar gráfico
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent style={{ padding: '0 24px 20px 24px' }}>
            {cargando ? (
              <div style={{ minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-texto-sec)' }}>
                Cargando totales de productos...
              </div>
            ) : datosProductosPorUnidad.length === 0 ? (
              <div style={{ minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-texto-sec)', fontSize: '13px', textAlign: 'center', padding: '0 16px' }}>
                No se elaboraron productos medidos en {formatearUnidad(unidadSeleccionada)} en este período.
              </div>
            ) : (
              <div ref={graficoProductosRef} style={{ width: '100%', height: 340 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart
                    data={datosProductosPorUnidad}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 20, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} horizontal={false} />
                    <XAxis type="number" stroke={colores.textoSec} fontSize={12} unit={` ${abreviarUnidad(unidadSeleccionada)}`} />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      stroke={colores.textoSec}
                      fontSize={12}
                      tickLine={false}
                      width={130}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-superficie-elevada)',
                        borderColor: 'var(--color-borde)',
                        color: 'var(--color-texto)',
                      }}
                      itemStyle={{ color: 'var(--color-texto)' }}
                      formatter={(val, _, item) => [
                        `${val} ${abreviarUnidad(item.payload.unidad)} (${item.payload.lotes} ${item.payload.lotes === 1 ? 'lote' : 'lotes'})`,
                        'Cantidad Total',
                      ]}
                    />
                    <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                      {datosProductosPorUnidad.map((entry, idx) => (
                        <Cell key={`prod-cell-${idx}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader style={{ padding: '20px 24px 12px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <div>
                <CardTitle style={{ fontSize: '1rem' }}>Insumos Más Utilizados</CardTitle>
                <CardDescription>Materias primas con mayor demanda en los lotes del período</CardDescription>
              </div>
              {!cargando && datosInsumosMasUtilizados.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setExportGraficoModal({
                      titulo: 'Insumos Más Utilizados',
                      filtros: obtenerResumenFiltros(),
                      nombreArchivo: `insumos_mas_utilizados_${desde || 'inicio'}_a_${hasta || 'hoy'}`,
                      graficos: [
                        {
                          id: 'produccion-insumos-usados',
                          titulo: 'Insumos Más Utilizados',
                          subtitulo: 'Materias primas con mayor demanda en los lotes del período',
                          filtros: obtenerResumenFiltros(),
                          contenedor: graficoInsumosRef.current,
                        },
                      ],
                    })
                  }
                  className="btn-cancelar"
                  style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  title="Exportar gráfico en PNG, JPEG o PDF"
                >
                  <ExportIcon size={14} /> Exportar gráfico
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent style={{ padding: '0 24px 20px 24px' }}>
            {cargando ? (
              <div style={{ minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-texto-sec)' }}>
                Cargando insumos más utilizados...
              </div>
            ) : datosInsumosMasUtilizados.length === 0 ? (
              <div style={{ minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-texto-sec)', fontSize: '13px', textAlign: 'center', padding: '0 16px' }}>
                No se registró consumo de insumos en los lotes de este período.
              </div>
            ) : (
              <div ref={graficoInsumosRef} style={{ width: '100%', height: 340 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart
                    data={datosInsumosMasUtilizados.slice(0, 8)}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 20, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} horizontal={false} />
                    <XAxis type="number" stroke={colores.textoSec} fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      stroke={colores.textoSec}
                      fontSize={12}
                      tickLine={false}
                      width={130}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-superficie-elevada)',
                        borderColor: 'var(--color-borde)',
                        color: 'var(--color-texto)',
                      }}
                      itemStyle={{ color: 'var(--color-texto)' }}
                      formatter={(val, _, item) => [
                        `${val} ${abreviarUnidad(item.payload.medida)} (en ${item.payload.lotesCount} ${item.payload.lotesCount === 1 ? 'lote' : 'lotes'})`,
                        'Cantidad Usada',
                      ]}
                    />
                    <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                      {datosInsumosMasUtilizados.slice(0, 8).map((entry, idx) => (
                        <Cell key={`ins-cell-${idx}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card style={{ marginBottom: '2rem' }}>
        <CardHeader style={{ padding: '20px 24px 12px 24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <CardTitle style={{ fontSize: '1.05rem' }}>Listado Detallado de Lotes Elaborados</CardTitle>
              <CardDescription>
                Historial completo de producción y composición de materias primas
              </CardDescription>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Buscar por código, producto o responsable..."
                value={busquedaLote}
                onChange={(e) => {
                  setBusquedaLote(e.target.value);
                  setPaginaActual(1);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-borde)',
                  backgroundColor: 'var(--color-superficie)',
                  color: 'var(--color-texto)',
                  fontSize: '12.5px',
                  width: '260px',
                  maxWidth: '100%',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '12px', color: 'var(--color-texto-sec)' }}>
                Total: <strong>{totalRegistros}</strong> lotes
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent style={{ padding: '0 24px 20px 24px' }}>
          {cargando ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
              Cargando lotes de producción...
            </div>
          ) : lotesFiltrados.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
              No se encontraron lotes que coincidan con los filtros aplicados.
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-borde)', color: 'var(--color-texto-sec)', fontSize: '11.5px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 12px' }}>Fecha</th>
                      <th style={{ padding: '10px 12px' }}>Código Lote</th>
                      <th style={{ padding: '10px 12px' }}>Producto</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Cantidad</th>
                      <th style={{ padding: '10px 12px' }}>Responsable</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Insumos</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Estado</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsPaginados.map((l) => (
                      <tr key={l.id} style={{ borderBottom: '1px solid var(--color-borde)' }}>
                        <td style={{ padding: '10px 12px', color: 'var(--color-texto)' }}>
                          {formatearFechaVisual(l.fecha)}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--color-primario)' }}>
                          {l.codigo}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-h)' }}>
                          {l.producto.nombre}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--color-texto)' }}>
                          {l.cantidad} {abreviarUnidad(l.producto.unidadMedida)}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-texto)' }}>
                          <span>{l.nombre_responsable}</span>
                          <span style={{ fontSize: '10.5px', color: 'var(--color-texto-sec)', display: 'block' }}>
                            Legajo #{l.responsable_legajo}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
                          {l.insumos.length} {l.insumos.length === 1 ? 'insumo' : 'insumos'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <Badge variant={l.editable ? 'proximo' : 'al_dia'}>
                            {l.editable ? 'Abierto' : 'Finalizado'}
                          </Badge>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn-secundario"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => setLoteParaModal(l)}
                          >
                            Ver composición
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '16px' }}>
                <Paginacion
                  paginaActual={paginaActual}
                  totalPaginas={totalPaginas}
                  totalRegistros={totalRegistros}
                  indiceInicio={indiceInicio}
                  indiceFin={indiceFin}
                  filasPorPagina={filasPorPagina}
                  onCambiarPagina={setPaginaActual}
                  onCambiarFilasPorPagina={setFilasPorPagina}
                  etiqueta="lotes"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {loteParaModal && (
        <ModalDetalleLote
          lote={loteParaModal}
          onClose={() => setLoteParaModal(null)}
        />
      )}

      <ConfirmExportDialog
        open={dialogExportarAbierto}
        totalRegistros={totalRegistros}
        filtrosAplicados={obtenerResumenFiltros()}
        loading={exportando}
        onConfirm={ejecutarExportacion}
        onCancel={() => setDialogExportarAbierto(false)}
      />

      <ConfirmExportGraficoDialog
        open={Boolean(exportGraficoModal)}
        tituloGrafico={exportGraficoModal?.titulo || ''}
        cantidadGraficos={exportGraficoModal?.graficos.length || 1}
        filtrosAplicados={exportGraficoModal?.filtros || obtenerResumenFiltros()}
        loading={exportandoGrafico}
        onConfirm={ejecutarExportacionGrafico}
        onCancel={() => setExportGraficoModal(null)}
      />

      <ErrorAlertDialog
        open={Boolean(errorExportDialog)}
        title="No se pudo completar la exportación"
        description={errorExportDialog || ''}
        onClose={() => setErrorExportDialog(null)}
      />
    </div>
  );
};