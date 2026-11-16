import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiFetch } from '../../api/client';
import { CsvIcon } from '../../components/icons/CsvIcon';
import { Badge } from '../../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Paginacion } from '../../components/ui/paginacion';
import { usePaginacion } from '../../components/ui/usePaginacion';
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
    <div
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
      <div
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
          <button
            type="button"
            onClick={onClose}
            className="btn-secundario"
            style={{ padding: '6px 12px', fontSize: '13px' }}
          >
            ✕ Cerrar
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
  const [tipoGraficoEvolucion, setTipoGraficoEvolucion] = useState<'lineas' | 'barras' | 'combinado' | 'control_spc' | 'radar'>('combinado');
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<string>('kilogramos');

  const [loteParaModal, setLoteParaModal] = useState<LoteProduccion | null>(null);

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
      const esFuera = (n > 1 && sigma > 0) ? (cant > ucl || cant < lcl) : false;
      const esAdv = (n > 1 && sigma > 0 && !esFuera) ? (cant > uwcl || cant < lwcl) : false;

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

  const datosRadarProduccion = useMemo(() => {
    if (lotes.length === 0) return { dimensiones: [], productos: [] };
    const mapa = new Map<string, {
      nombre: string;
      lotes: number;
      volumen: number;
      insumosSet: Set<string>;
    }>();

    for (const l of lotes) {
      const pNom = l.producto?.nombre || 'Sin producto';
      if (!mapa.has(pNom)) {
        mapa.set(pNom, {
          nombre: pNom,
          lotes: 0,
          volumen: 0,
          insumosSet: new Set<string>(),
        });
      }
      const item = mapa.get(pNom)!;
      item.lotes += 1;
      item.volumen += Number(l.cantidad) || 0;
      for (const ins of l.insumos || []) {
        if (ins?.insumo?.nombre) item.insumosSet.add(ins.insumo.nombre);
      }
    }

    const prods = Array.from(mapa.values());
    if (prods.length === 0) return { dimensiones: [], productos: [] };

    const maxLotes = Math.max(...prods.map((p) => p.lotes), 1);
    const maxVol = Math.max(...prods.map((p) => p.volumen), 1);
    const maxInsumos = Math.max(...prods.map((p) => p.insumosSet.size), 1);
    const maxProm = Math.max(...prods.map((p) => p.volumen / Math.max(p.lotes, 1)), 1);

    const prodsOrdenados = prods.sort((a, b) => b.lotes - a.lotes).slice(0, 4);

    const configDims = [
      { metrica: 'Volumen Fabricado', key: 'vol' },
      { metrica: 'Frecuencia Lotes', key: 'lot' },
      { metrica: 'Variedad Insumos', key: 'ins' },
      { metrica: 'Tamaño Medio', key: 'prom' },
      { metrica: 'Consistencia Operativa', key: 'cons' },
    ];

    const dimensiones = configDims.map((dim) => {
      const fila: Record<string, any> = { dimension: dim.metrica };
      prodsOrdenados.forEach((p, idx) => {
        let score = 50;
        if (dim.key === 'vol') score = Math.round((p.volumen / maxVol) * 100);
        else if (dim.key === 'lot') score = Math.round((p.lotes / maxLotes) * 100);
        else if (dim.key === 'ins') score = Math.round((p.insumosSet.size / maxInsumos) * 100);
        else if (dim.key === 'prom') score = Math.round(((p.volumen / Math.max(p.lotes, 1)) / maxProm) * 100);
        else if (dim.key === 'cons') score = Math.min(100, Math.round(70 + (p.lotes / maxLotes) * 30));

        fila[`prod_${idx}`] = score;
      });
      return fila;
    });

    return {
      dimensiones,
      productos: prodsOrdenados.map((p, idx) => ({
        key: `prod_${idx}`,
        nombre: p.nombre,
        color: PALETA_COLORES[idx % PALETA_COLORES.length],
        lotes: p.lotes,
        volumen: Math.round(p.volumen * 100) / 100,
      })),
    };
  }, [lotes]);

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

  const exportarCSV = () => {
    if (lotesFiltrados.length === 0) return;

    const cabeceras = [
      'ID',
      'Código',
      'Fecha',
      'Producto',
      'Cantidad',
      'Unidad',
      'Responsable',
      'Legajo',
      'Insumos Usados',
    ];

    const filas = lotesFiltrados.map((l) => [
      l.id,
      `"${(l.codigo || '').replace(/"/g, '""')}"`,
      l.fecha,
      `"${(l.producto?.nombre || '').replace(/"/g, '""')}"`,
      l.cantidad,
      `"${(l.producto?.unidadMedida || '').replace(/"/g, '""')}"`,
      `"${(l.nombre_responsable || '').replace(/"/g, '""')}"`,
      l.responsable_legajo,
      `"${l.insumos.map((i) => `${i.insumo.nombre}: ${i.cantidad} ${abreviarUnidad(i.insumo.medida)}`).join(', ')}"`,
    ]);

    const contenidoCSV =
      '\uFEFF' + [cabeceras.join(';'), ...filas.map((f) => f.join(';'))].join('\r\n');
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `produccion_detallada_${formatearFechaInput(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {lotesFiltrados.length > 0 && (
              <button
                type="button"
                onClick={exportarCSV}
                className="btn-cancelar"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <CsvIcon /> Exportar CSV
              </button>
            )}
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
                {tipoGraficoEvolucion === 'control_spc'
                  ? 'Control Estadístico de Procesos (CEP / SPC)'
                  : tipoGraficoEvolucion === 'radar'
                  ? 'Red de Araña: Perfil Multicriterio de Producción'
                  : tipoGraficoEvolucion === 'combinado'
                  ? 'Gráfico Combinado: Lotes y Volumen Fabricado'
                  : 'Producción de Lotes por Fecha y Producto'}
              </CardTitle>
              <CardDescription>
                {tipoGraficoEvolucion === 'control_spc'
                  ? 'Monitoreo estadístico de tamaño de lote con límites superior e inferior (UCL/LCL a ±3σ) y media'
                  : tipoGraficoEvolucion === 'radar'
                  ? 'Comparativa radial multicriterio entre productos (volumen, lotes, insumos, regularidad)'
                  : tipoGraficoEvolucion === 'combinado'
                  ? `Lotes elaborados (barras) y volumen total en ${formatearUnidad(unidadSeleccionada)} (línea)`
                  : productoSeleccionado
                  ? 'Evolución temporal de lotes elaborados del producto seleccionado'
                  : 'Cantidad de lotes producidos a lo largo del tiempo clasificados por período'}
              </CardDescription>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {(tipoGraficoEvolucion === 'lineas' || tipoGraficoEvolucion === 'barras' || tipoGraficoEvolucion === 'combinado') && (
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
                  { id: 'combinado', label: 'Combinado' },
                  { id: 'barras', label: 'Barras' },
                  { id: 'lineas', label: 'Líneas' },
                  { id: 'control_spc', label: 'Control (CEP)' },
                  { id: 'radar', label: 'Red de Araña' },
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
            <div style={{ width: '100%' }}>
              {tipoGraficoEvolucion === 'control_spc' ? (
                <div>
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--color-fondo)', border: '1px solid var(--color-borde)', fontSize: '12px' }}>
                    <div><span style={{ color: 'var(--color-texto-sec)' }}>Media (X̄):</span> <strong style={{ color: 'var(--text-h)' }}>{datosControlEstadistico.media} {abreviarUnidad(unidadSeleccionada)}</strong></div>
                    <div><span style={{ color: 'var(--color-texto-sec)' }}>Desvío (σ):</span> <strong style={{ color: 'var(--text-h)' }}>±{datosControlEstadistico.sigma}</strong></div>
                    <div><span style={{ color: 'var(--color-texto-sec)' }}>Límite Sup. (UCL +3σ):</span> <strong style={{ color: '#ef4444' }}>{datosControlEstadistico.ucl}</strong></div>
                    <div><span style={{ color: 'var(--color-texto-sec)' }}>Límite Inf. (LCL -3σ):</span> <strong style={{ color: '#ef4444' }}>{datosControlEstadistico.lcl}</strong></div>
                    <div><span style={{ color: 'var(--color-texto-sec)' }}>Bajo Control:</span> <strong style={{ color: '#10b981' }}>{datosControlEstadistico.enControl} / {datosControlEstadistico.totalLotes}</strong></div>
                    {datosControlEstadistico.fueraDeControl > 0 && (
                      <div><strong style={{ color: '#ef4444' }}>⚠ {datosControlEstadistico.fueraDeControl} desvío(s) fuera de límites normativos</strong></div>
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
              ) : tipoGraficoEvolucion === 'radar' ? (
                <div style={{ width: '100%', height: 360 }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={datosRadarProduccion.dimensiones}>
                      <PolarGrid stroke="var(--color-borde, #334155)" strokeDasharray="3 3" />
                      <PolarAngleAxis
                        dataKey="dimension"
                        tick={{ fill: 'var(--color-texto, #cbd5e1)', fontSize: 12, fontWeight: 500 }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        stroke="var(--color-texto-sec, #64748b)"
                        tick={{ fontSize: 10, fill: 'var(--color-texto-sec, #64748b)' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-superficie-elevada, #1e293b)',
                          borderColor: 'var(--color-borde, #334155)',
                          borderRadius: '8px',
                          color: 'var(--color-texto, #f8fafc)',
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={28}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }}
                      />
                      {datosRadarProduccion.productos.map((prod) => (
                        <Radar
                          key={prod.key}
                          name={`${prod.nombre} (${prod.lotes} lotes)`}
                          dataKey={prod.key}
                          stroke={prod.color}
                          fill={prod.color}
                          fillOpacity={0.25}
                          strokeWidth={2}
                          dot={{ r: 3, fill: prod.color }}
                        />
                      ))}
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : tipoGraficoEvolucion === 'combinado' ? (
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
              ) : tipoGraficoEvolucion === 'lineas' ? (
                <div style={{ width: '100%', height: 360 }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={datosEvolucionTemporal} margin={{ top: 12, right: 16, left: -10, bottom: 20 }}>
                      <defs>
                        <linearGradient id="gradEvolucionLotes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colores.primario} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={colores.primario} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} vertical={false} />
                      <XAxis
                        dataKey="etiqueta"
                        stroke={colores.textoSec}
                        fontSize={12}
                        tickLine={false}
                        interval={datosEvolucionTemporal.length > 15 ? 'preserveStartEnd' : 0}
                        angle={datosEvolucionTemporal.length > 8 ? -20 : 0}
                        textAnchor={datosEvolucionTemporal.length > 8 ? 'end' : 'middle'}
                        height={datosEvolucionTemporal.length > 8 ? 35 : 25}
                      />
                      <YAxis
                        allowDecimals={false}
                        stroke={colores.textoSec}
                        fontSize={12}
                        tickLine={false}
                        width={42}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-superficie-elevada, #ffffff)',
                          borderColor: 'var(--color-borde)',
                          borderRadius: '8px',
                          color: 'var(--color-texto)',
                        }}
                        formatter={(valor: any, _, item: any) => [
                          `${valor} ${valor === 1 ? 'lote' : 'lotes'}${item?.payload?.detalle ? ` (${item.payload.detalle})` : ''}`,
                          'Lotes Producidos',
                        ]}
                        labelFormatter={(_, items) => items?.[0]?.payload?.etiquetaCompleta || ''}
                      />
                      <Area
                        type="monotone"
                        dataKey="lotes"
                        stroke={colores.primario}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#gradEvolucionLotes)"
                        dot={{ r: 3.5, fill: colores.primario, strokeWidth: 2, stroke: 'var(--color-superficie)' }}
                        activeDot={{ r: 6, stroke: colores.primario, strokeWidth: 2, fill: 'var(--color-superficie)' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ width: '100%', height: 360 }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={datosEvolucionTemporal} margin={{ top: 12, right: 16, left: -10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} vertical={false} />
                      <XAxis
                        dataKey="etiqueta"
                        stroke={colores.textoSec}
                        fontSize={12}
                        tickLine={false}
                        interval={datosEvolucionTemporal.length > 15 ? 'preserveStartEnd' : 0}
                        angle={datosEvolucionTemporal.length > 8 ? -20 : 0}
                        textAnchor={datosEvolucionTemporal.length > 8 ? 'end' : 'middle'}
                        height={datosEvolucionTemporal.length > 8 ? 35 : 25}
                      />
                      <YAxis
                        allowDecimals={false}
                        stroke={colores.textoSec}
                        fontSize={12}
                        tickLine={false}
                        width={42}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-superficie-elevada, #ffffff)',
                          borderColor: 'var(--color-borde)',
                          borderRadius: '8px',
                          color: 'var(--color-texto)',
                        }}
                        formatter={(valor: any, _, item: any) => [
                          `${valor} ${valor === 1 ? 'lote' : 'lotes'}${item?.payload?.detalle ? ` (${item.payload.detalle})` : ''}`,
                          'Lotes Producidos',
                        ]}
                        labelFormatter={(_, items) => items?.[0]?.payload?.etiquetaCompleta || ''}
                      />
                      <Bar dataKey="lotes" fill={colores.primario} radius={[5, 5, 0, 0]} />
                    </BarChart>
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
          gap: '16px',
          marginBottom: '1.5rem',
        }}
      >
        <Card>
          <CardHeader style={{ padding: '20px 24px 14px 24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <CardTitle style={{ fontSize: '1rem' }}>Totales de Productos Fabricados</CardTitle>
                <CardDescription>
                  Cantidad acumulada elaborada por producto en la unidad elegida
                </CardDescription>
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
                    cursor: 'pointer',
                  }}
                >
                  {unidadesDisponibles.map((u) => (
                    <option key={u} value={u}>
                      {formatearUnidad(u)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent style={{ padding: '0 24px 20px 24px' }}>
            {cargando ? (
              <div style={{ minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-texto-sec)' }}>
                Cargando totales de productos...
              </div>
            ) : datosProductosPorUnidad.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
                <strong style={{ display: 'block', color: 'var(--text-h)', marginBottom: '4px' }}>Sin productos en {formatearUnidad(unidadSeleccionada)}</strong>
                <span>No se registraron productos producidos en esta unidad durante el período.</span>
              </div>
            ) : (
              <div style={{ width: '100%', height: 340 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart
                    data={datosProductosPorUnidad}
                    layout="vertical"
                    margin={{ top: 8, right: 30, left: 10, bottom: 8 }}
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
                        backgroundColor: 'var(--color-superficie-elevada, #ffffff)',
                        borderColor: 'var(--color-borde)',
                        borderRadius: '8px',
                        color: 'var(--color-texto)',
                      }}
                      formatter={(val: any, _, item: any) => [
                        `${val} ${abreviarUnidad(unidadSeleccionada)} (${item?.payload?.lotes || 0} lotes)`,
                        'Total Fabricado',
                      ]}
                    />
                    <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                      {datosProductosPorUnidad.map((entry, index) => (
                        <Cell key={`prod-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader style={{ padding: '20px 24px 14px 24px' }}>
            <CardTitle style={{ fontSize: '1rem' }}>Insumos Más Utilizados</CardTitle>
            <CardDescription>
              Materias primas con mayor demanda en los lotes del período
            </CardDescription>
          </CardHeader>
          <CardContent style={{ padding: '0 24px 20px 24px' }}>
            {cargando ? (
              <div style={{ minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-texto-sec)' }}>
                Cargando insumos más utilizados...
              </div>
            ) : datosInsumosMasUtilizados.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
                <strong style={{ display: 'block', color: 'var(--text-h)', marginBottom: '4px' }}>Sin insumos registrados</strong>
                <span>Los lotes seleccionados no tienen insumos asociados.</span>
              </div>
            ) : (
              <div style={{ width: '100%', height: 340 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart
                    data={datosInsumosMasUtilizados.slice(0, 7)}
                    layout="vertical"
                    margin={{ top: 8, right: 30, left: 10, bottom: 8 }}
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
                        backgroundColor: 'var(--color-superficie-elevada, #ffffff)',
                        borderColor: 'var(--color-borde)',
                        borderRadius: '8px',
                        color: 'var(--color-texto)',
                      }}
                      formatter={(val: any, _, item: any) => [
                        `${val} ${abreviarUnidad(item?.payload?.medida)} (en ${item?.payload?.lotesCount} lotes)`,
                        'Consumo Acumulado',
                      ]}
                    />
                    <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                      {datosInsumosMasUtilizados.slice(0, 7).map((entry, index) => (
                        <Cell key={`insumo-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader style={{ padding: '20px 24px 14px 24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', width: '100%' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CardTitle style={{ fontSize: '1.1rem' }}>
                  Listado Detallado de Lotes de Producción
                </CardTitle>
                <Badge variant="outline" style={{ fontSize: '12px' }}>
                  {lotesFiltrados.length} {lotesFiltrados.length === 1 ? 'lote' : 'lotes'}
                </Badge>
              </div>
              <CardDescription>
                Trazabilidad completa de lotes registrados con insumos, cantidad y responsable
              </CardDescription>
            </div>

            <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
              <input
                type="text"
                placeholder="Buscar por código, producto, operador..."
                value={busquedaLote}
                onChange={(e) => setBusquedaLote(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '7px 12px 7px 30px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-borde)',
                  backgroundColor: 'var(--color-fondo)',
                  color: 'var(--color-texto)',
                  fontSize: '12.5px',
                  outline: 'none',
                }}
              />
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-texto-sec)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>
        </CardHeader>

        <CardContent style={{ padding: 0 }}>
          {cargando ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
              Cargando lotes...
            </div>
          ) : lotesFiltrados.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
              <strong style={{ display: 'block', color: 'var(--text-h)', marginBottom: '4px' }}>
                No se encontraron lotes de producción
              </strong>
              <p style={{ margin: 0, fontSize: '13px' }}>
                No hay registros que coincidan con los filtros y búsqueda aplicados.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-borde)', color: 'var(--color-texto-sec)', fontSize: '11.5px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 14px', width: '15%' }}>Código</th>
                    <th style={{ padding: '10px 14px', width: '12%' }}>Fecha</th>
                    <th style={{ padding: '10px 14px', width: '25%' }}>Producto</th>
                    <th style={{ padding: '10px 14px', width: '15%' }}>Cantidad Fabricada</th>
                    <th style={{ padding: '10px 14px', width: '18%' }}>Responsable</th>
                    <th style={{ padding: '10px 14px', width: '15%', textAlign: 'center' }}>Insumos</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsPaginados.map((l) => (
                    <tr
                      key={l.id}
                      onClick={() => setLoteParaModal(l)}
                      style={{ borderBottom: '1px solid var(--color-borde)', cursor: 'pointer' }}
                      className="fila-incidente-clickeable"
                      title="Clic para ver detalle completo del lote"
                    >
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-primario)', fontSize: '13px' }}>
                          {l.codigo}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-texto-sec)' }}>
                          ID #{l.id}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--color-texto)' }}>
                          {formatearFechaVisual(l.fecha)}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-h)' }}>
                          {l.producto?.nombre}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-texto)', fontSize: '13px' }}>
                          {l.cantidad} <span style={{ fontWeight: 500, color: 'var(--color-texto-sec)', fontSize: '12px' }}>{abreviarUnidad(l.producto?.unidadMedida)}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--color-texto)' }}>
                          {l.nombre_responsable}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-texto-sec)' }}>
                          Legajo #{l.responsable_legajo}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <Badge variant="outline">
                          {l.insumos.length} {l.insumos.length === 1 ? 'insumo' : 'insumos'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ padding: '12px 18px' }}>
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
        </CardContent>
      </Card>

      {loteParaModal && (
        <ModalDetalleLote lote={loteParaModal} onClose={() => setLoteParaModal(null)} />
      )}
    </div>
  );
};

