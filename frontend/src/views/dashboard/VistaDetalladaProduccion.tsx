import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiFetch } from '../../api/client';
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
  const [tipoGraficoEvolucion, setTipoGraficoEvolucion] = useState<'lineas' | 'barras'>('barras');
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
      const conteos = new Map<string, { lotes: number; productos: Map<string, number> }>();
      for (const l of lotes) {
        if (l.fecha) {
          const k = l.fecha;
          if (!conteos.has(k)) {
            conteos.set(k, { lotes: 0, productos: new Map() });
          }
          const item = conteos.get(k)!;
          item.lotes += 1;
          const pNom = l.producto?.nombre || 'Producto';
          item.productos.set(pNom, (item.productos.get(pNom) || 0) + 1);
        }
      }

      const puntos: { clave: string; etiqueta: string; etiquetaCompleta: string; lotes: number; detalle: string }[] = [];
      const cur = new Date(fechaInicio);
      while (cur <= fechaFin) {
        const anio = cur.getFullYear();
        const mes = String(cur.getMonth() + 1).padStart(2, '0');
        const dia = String(cur.getDate()).padStart(2, '0');
        const clave = `${anio}-${mes}-${dia}`;
        const dat = conteos.get(clave);
        const lotesCant = dat ? dat.lotes : 0;
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

      const conteos = new Map<string, { lotes: number; productos: Map<string, number> }>();
      for (const l of lotes) {
        if (l.fecha) {
          const d = new Date(`${l.fecha}T00:00:00`);
          if (!isNaN(d.getTime())) {
            const sem = obtenerInicioSemana(d);
            const k = `${sem.getFullYear()}-${String(sem.getMonth() + 1).padStart(2, '0')}-${String(sem.getDate()).padStart(2, '0')}`;
            if (!conteos.has(k)) {
              conteos.set(k, { lotes: 0, productos: new Map() });
            }
            const item = conteos.get(k)!;
            item.lotes += 1;
            const pNom = l.producto?.nombre || 'Producto';
            item.productos.set(pNom, (item.productos.get(pNom) || 0) + 1);
          }
        }
      }

      const puntos: { clave: string; etiqueta: string; etiquetaCompleta: string; lotes: number; detalle: string }[] = [];
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
          detalle,
        });

        cur.setDate(cur.getDate() + 7);
      }
      return puntos;
    }

    const mesesCortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const mesesLargos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const conteos = new Map<string, { lotes: number; productos: Map<string, number> }>();
    for (const l of lotes) {
      if (l.fecha && l.fecha.length >= 7) {
        const k = l.fecha.slice(0, 7);
        if (!conteos.has(k)) {
          conteos.set(k, { lotes: 0, productos: new Map() });
        }
        const item = conteos.get(k)!;
        item.lotes += 1;
        const pNom = l.producto?.nombre || 'Producto';
        item.productos.set(pNom, (item.productos.get(pNom) || 0) + 1);
      }
    }

    const puntos: { clave: string; etiqueta: string; etiquetaCompleta: string; lotes: number; detalle: string }[] = [];
    let curAnio = fechaInicio.getFullYear();
    let curMes = fechaInicio.getMonth();
    const finAnio = fechaFin.getFullYear();
    const finMes = fechaFin.getMonth();

    while (curAnio < finAnio || (curAnio === finAnio && curMes <= finMes)) {
      const clave = `${curAnio}-${String(curMes + 1).padStart(2, '0')}`;
      const dat = conteos.get(clave);
      const lotesCant = dat ? dat.lotes : 0;
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
                className="dashboard-btn-volver"
                onClick={exportarCSV}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  backgroundColor: 'var(--color-primario)',
                  color: 'var(--color-texto-sobre-primario, #ffffff)',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Exportar a CSV
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
              <CardTitle style={{ fontSize: '1rem' }}>Producción de Lotes por Fecha y Producto</CardTitle>
              <CardDescription>
                {productoSeleccionado
                  ? `Evolución temporal de lotes elaborados del producto seleccionado`
                  : 'Cantidad de lotes producidos a lo largo del tiempo clasificados por período'}
              </CardDescription>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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

              <div
                style={{
                  display: 'inline-flex',
                  borderRadius: '8px',
                  padding: '3px',
                  backgroundColor: 'var(--color-fondo)',
                  border: '1px solid var(--color-borde)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setTipoGraficoEvolucion('lineas')}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: tipoGraficoEvolucion === 'lineas' ? 600 : 500,
                    backgroundColor: tipoGraficoEvolucion === 'lineas' ? 'var(--color-superficie)' : 'transparent',
                    color: tipoGraficoEvolucion === 'lineas' ? 'var(--text-h)' : 'var(--color-texto-sec)',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                  title="Gráfico de líneas"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18" />
                    <path d="m19 9-5 5-4-4-3 3" />
                  </svg>
                  Líneas
                </button>
                <button
                  type="button"
                  onClick={() => setTipoGraficoEvolucion('barras')}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: tipoGraficoEvolucion === 'barras' ? 600 : 500,
                    backgroundColor: tipoGraficoEvolucion === 'barras' ? 'var(--color-superficie)' : 'transparent',
                    color: tipoGraficoEvolucion === 'barras' ? 'var(--text-h)' : 'var(--color-texto-sec)',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                  title="Gráfico de barras"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                  Barras
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent style={{ padding: '0 24px 20px 24px' }}>
          {cargando ? (
            <div style={{ minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-texto-sec)' }}>
              Cargando gráfico de producción de lotes...
            </div>
          ) : datosEvolucionTemporal.length === 0 || kpis.totalLotes === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
              <strong style={{ display: 'block', color: 'var(--text-h)', marginBottom: '4px' }}>Sin lotes registrados</strong>
              <span>No se encontraron lotes producidos en el rango de fechas seleccionado.</span>
            </div>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                {tipoGraficoEvolucion === 'lineas' ? (
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
                      fontSize={11}
                      tickLine={false}
                      interval={datosEvolucionTemporal.length > 15 ? 'preserveStartEnd' : 0}
                      angle={datosEvolucionTemporal.length > 8 ? -20 : 0}
                      textAnchor={datosEvolucionTemporal.length > 8 ? 'end' : 'middle'}
                      height={datosEvolucionTemporal.length > 8 ? 35 : 25}
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke={colores.textoSec}
                      fontSize={11}
                      tickLine={false}
                      width={36}
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
                ) : (
                  <BarChart data={datosEvolucionTemporal} margin={{ top: 12, right: 16, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} vertical={false} />
                    <XAxis
                      dataKey="etiqueta"
                      stroke={colores.textoSec}
                      fontSize={11}
                      tickLine={false}
                      interval={datosEvolucionTemporal.length > 15 ? 'preserveStartEnd' : 0}
                      angle={datosEvolucionTemporal.length > 8 ? -20 : 0}
                      textAnchor={datosEvolucionTemporal.length > 8 ? 'end' : 'middle'}
                      height={datosEvolucionTemporal.length > 8 ? 35 : 25}
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke={colores.textoSec}
                      fontSize={11}
                      tickLine={false}
                      width={36}
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
                )}
              </ResponsiveContainer>
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
              <div style={{ minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-texto-sec)' }}>
                Cargando totales de productos...
              </div>
            ) : datosProductosPorUnidad.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
                <strong style={{ display: 'block', color: 'var(--text-h)', marginBottom: '4px' }}>Sin productos en {formatearUnidad(unidadSeleccionada)}</strong>
                <span>No se registraron productos producidos en esta unidad durante el período.</span>
              </div>
            ) : (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={datosProductosPorUnidad}
                    layout="vertical"
                    margin={{ top: 8, right: 30, left: 10, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} horizontal={false} />
                    <XAxis type="number" stroke={colores.textoSec} fontSize={11} unit={` ${abreviarUnidad(unidadSeleccionada)}`} />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      stroke={colores.textoSec}
                      fontSize={11}
                      tickLine={false}
                      width={120}
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
              <div style={{ minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-texto-sec)' }}>
                Cargando insumos más utilizados...
              </div>
            ) : datosInsumosMasUtilizados.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--color-texto-sec)' }}>
                <strong style={{ display: 'block', color: 'var(--text-h)', marginBottom: '4px' }}>Sin insumos registrados</strong>
                <span>Los lotes seleccionados no tienen insumos asociados.</span>
              </div>
            ) : (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={datosInsumosMasUtilizados.slice(0, 7)}
                    layout="vertical"
                    margin={{ top: 8, right: 30, left: 10, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colores.borde} horizontal={false} />
                    <XAxis type="number" stroke={colores.textoSec} fontSize={11} />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      stroke={colores.textoSec}
                      fontSize={11}
                      tickLine={false}
                      width={120}
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

