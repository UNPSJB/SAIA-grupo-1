import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client';
import { Badge } from '../../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Paginacion, usePaginacion } from '../../components/ui/paginacion';
import '../../styles/formularioAlta.css';

export type OrigenVencimiento = 'personal' | 'equipo' | 'documento';
export type EstadoVencimiento = 'vencido' | 'proximo' | 'vigente';

export interface VencimientoTableroItem {
  id: string;
  origen: OrigenVencimiento;
  concepto: string;
  responsable: string;
  referenciaId: number;
  fecha: string;
  diasRestantes: number;
  estado: EstadoVencimiento;
}

interface VencimientoApiItem {
  id: string;
  origen: OrigenVencimiento;
  concepto: string;
  responsable: string;
  referencia_id: number;
  fecha: string;
  dias_restantes: number;
  estado: EstadoVencimiento;
}

interface SeccionVencimientosTableroProps {
  onIrAlRegistro: (item: VencimientoTableroItem) => void;
  onVerTodos?: () => void;
}

const ETIQUETA_ORIGEN: Record<OrigenVencimiento, { label: string; icon: string }> = {
  personal: { label: 'Personal', icon: '👤' },
  equipo: { label: 'Calibración / Equipo', icon: '⚙️' },
  documento: { label: 'Documentos', icon: '📄' },
};

const ETIQUETA_ESTADO: Record<EstadoVencimiento, string> = {
  vencido: '● Vencido',
  proximo: '▲ Próximo a vencer',
  vigente: '✓ Vigente',
};

const formatearFecha = (fecha?: string): string => {
  if (!fecha) return '-';
  const partes = fecha.slice(0, 10).split('-');
  if (partes.length < 3) return fecha;
  const [anio, mes, dia] = partes;
  return `${dia}/${mes}/${anio}`;
};

const describirPlazo = (dias: number): string => {
  if (dias < 0) return `Venció hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`;
  if (dias === 0) return 'Vence hoy';
  return `Vence en ${dias} ${dias === 1 ? 'día' : 'días'}`;
};

export const SeccionVencimientosTablero: React.FC<SeccionVencimientosTableroProps> = ({
  onIrAlRegistro,
  onVerTodos,
}) => {
  const [items, setItems] = useState<VencimientoTableroItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroOrigen, setFiltroOrigen] = useState<'' | OrigenVencimiento>('');
  const [filtroUrgencia, setFiltroUrgencia] = useState<'todos' | 'proximo' | 'vencido'>('todos');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const res = await apiFetch('/vencimientos/');
        if (!res.ok) {
          throw new Error('No se pudieron obtener los vencimientos.');
        }
        const data: VencimientoApiItem[] = await res.json();
        if (cancelado) return;

        setItems(
          data.map((d) => ({
            id: d.id,
            origen: d.origen,
            concepto: d.concepto,
            responsable: d.responsable,
            referenciaId: d.referencia_id,
            fecha: d.fecha,
            diasRestantes: d.dias_restantes,
            estado: d.estado,
          }))
        );
      } catch (err: unknown) {
        if (!cancelado) {
          const mensaje = err instanceof Error ? err.message : 'Error al cargar los vencimientos.';
          setError(mensaje);
          setItems([]);
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargar();
    return () => {
      cancelado = true;
    };
  }, []);

  const totalVencidos = useMemo(
    () => items.filter((i) => i.estado === 'vencido').length,
    [items]
  );
  const totalProximos = useMemo(
    () => items.filter((i) => i.estado === 'proximo').length,
    [items]
  );
  const totalVigentes = useMemo(
    () => items.filter((i) => i.estado === 'vigente').length,
    [items]
  );

  const itemsAtencion = useMemo(
    () => items.filter((i) => i.estado === 'proximo' || i.estado === 'vencido'),
    [items]
  );

  const conteoPorOrigen = useMemo(
    () => ({
      personal: itemsAtencion.filter((i) => i.origen === 'personal').length,
      equipo: itemsAtencion.filter((i) => i.origen === 'equipo').length,
      documento: itemsAtencion.filter((i) => i.origen === 'documento').length,
    }),
    [itemsAtencion]
  );

  const itemsFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return itemsAtencion.filter((i) => {
      if (filtroOrigen && i.origen !== filtroOrigen) return false;
      if (filtroUrgencia === 'vencido' && i.estado !== 'vencido') return false;
      if (filtroUrgencia === 'proximo' && i.estado !== 'proximo') return false;
      if (
        termino &&
        !`${i.concepto} ${i.responsable}`.toLowerCase().includes(termino)
      ) {
        return false;
      }
      return true;
    });
  }, [itemsAtencion, filtroOrigen, filtroUrgencia, busqueda]);

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
  } = usePaginacion(itemsFiltrados, 5);

  return (
    <Card
      className="dashboard-vencimientos-card"
      style={{
        marginTop: '1.75rem',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        backgroundColor: 'var(--bg)',
        boxShadow: 'var(--shadow)',
        overflow: 'hidden',
      }}
    >
      <CardHeader style={{ padding: '1.5rem 1.5rem 0.75rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CardTitle
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-h)',
                }}
              >
                Vencimientos Próximos
              </CardTitle>
            </div>
            <CardDescription style={{ marginTop: '4px', fontSize: '0.85rem' }}>
              01 · Control consolidado de carnets de personal, calibraciones y documentos
            </CardDescription>
          </div>

          {onVerTodos && (
            <button
              type="button"
              onClick={onVerTodos}
              className="btn-guardar"
              style={{
                fontSize: '0.85rem',
                padding: '7px 15px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Ver consolidado completo ↗
            </button>
          )}
        </div>

        <div className="venc-resumen" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
          <span className="venc-chip venc-chip--proximo">▲ {totalProximos} próximos a vencer</span>
          {totalVencidos > 0 ? (
            <span className="venc-chip venc-chip--vencido">● {totalVencidos} vencidos</span>
          ) : (
            <span className="venc-chip venc-chip--vigente">● 0 vencidos</span>
          )}
          <span
            className="venc-chip venc-chip--vigente"
            style={{ opacity: 0.85 }}
            title="Registros con vigencia al día que no requieren acción inmediata"
          >
            ✓ {totalVigentes} al día
          </span>
        </div>
      </CardHeader>

      <CardContent style={{ padding: '0.75rem 1.5rem 1.25rem' }}>
        {error && (
          <div className="alerta-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div className="venc-tabs">
            <button
              type="button"
              className={`venc-tab ${filtroOrigen === '' ? 'venc-tab--activo' : ''}`}
              onClick={() => setFiltroOrigen('')}
            >
              Todos ({itemsAtencion.length})
            </button>
            <button
              type="button"
              className={`venc-tab ${filtroOrigen === 'personal' ? 'venc-tab--activo' : ''}`}
              onClick={() => setFiltroOrigen('personal')}
            >
              👤 Personal ({conteoPorOrigen.personal})
            </button>
            <button
              type="button"
              className={`venc-tab ${filtroOrigen === 'equipo' ? 'venc-tab--activo' : ''}`}
              onClick={() => setFiltroOrigen('equipo')}
            >
              ⚙️ Equipos ({conteoPorOrigen.equipo})
            </button>
            <button
              type="button"
              className={`venc-tab ${filtroOrigen === 'documento' ? 'venc-tab--activo' : ''}`}
              onClick={() => setFiltroOrigen('documento')}
            >
              📄 Documentos ({conteoPorOrigen.documento})
            </button>
          </div>
        </div>

        <div className="filtros-top-bar" style={{ marginBottom: '1.25rem' }}>
          <input
            type="text"
            className="input-busqueda"
            placeholder="Buscar por persona, equipo, documento o concepto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          <select
            className="select-filtro"
            value={filtroUrgencia}
            onChange={(e) =>
              setFiltroUrgencia(e.target.value as 'todos' | 'proximo' | 'vencido')
            }
            aria-label="Filtrar por urgencia"
          >
            <option value="todos">Todos los pendientes ({itemsAtencion.length})</option>
            <option value="proximo">Solo próximos a vencer ({totalProximos})</option>
            <option value="vencido">Solo vencidos ({totalVencidos})</option>
          </select>
        </div>

        <div className="tabla-wrapper" style={{ margin: 0 }}>
          <table className="tabla-custom tabla-vencimientos">
            <thead>
              <tr>
                <th style={{ width: '140px' }}>Estado</th>
                <th style={{ width: '140px' }}>Tipo</th>
                <th>Qué vence</th>
                <th>Responsable / Entidad</th>
                <th style={{ width: '120px' }}>Vencimiento</th>
                <th style={{ width: '140px' }}>Plazo</th>
                <th className="acciones-col" style={{ width: '110px' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: 'center',
                      padding: '2.5rem 1rem',
                      color: 'var(--color-texto-sec)',
                    }}
                  >
                    Cargando vencimientos...
                  </td>
                </tr>
              ) : itemsFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: 'center',
                      padding: '2.5rem 1rem',
                      color: 'var(--color-texto-sec)',
                    }}
                  >
                    <div style={{ fontSize: '1.6rem', marginBottom: '6px' }}>✨</div>
                    <strong
                      style={{
                        color: 'var(--text-h)',
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      ¡Todo al día!
                    </strong>
                    <span style={{ fontSize: '0.85rem' }}>
                      {filtroOrigen || filtroUrgencia !== 'todos' || busqueda
                        ? 'No se encontraron vencimientos pendientes con los filtros seleccionados.'
                        : `No hay vencimientos próximos ni vencidos en este momento. Hay ${totalVigentes} registros al día.`}
                    </span>
                  </td>
                </tr>
              ) : (
                itemsPaginados.map((item) => {
                  const metaOrigen = ETIQUETA_ORIGEN[item.origen];
                  const esCritico = item.estado === 'vencido';

                  return (
                    <tr
                      key={item.id}
                      className={`venc-fila--${item.estado}`}
                      style={{
                        backgroundColor: esCritico
                          ? 'color-mix(in srgb, var(--color-error) 4%, transparent)'
                          : undefined,
                      }}
                    >
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <Badge
                          variant={
                            item.estado === 'vencido'
                              ? 'vencido'
                              : item.estado === 'proximo'
                              ? 'proximo'
                              : 'al_dia'
                          }
                          className={`venc-badge venc-badge--${item.estado}`}
                        >
                          {ETIQUETA_ESTADO[item.estado]}
                        </Badge>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ marginRight: '6px' }}>{metaOrigen.icon}</span>
                        {metaOrigen.label}
                      </td>
                      <td>
                        <strong style={{ color: 'var(--text-h)' }}>{item.concepto}</strong>
                      </td>
                      <td>{item.responsable}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <strong>{formatearFecha(item.fecha)}</strong>
                      </td>
                      <td
                        style={{
                          whiteSpace: 'nowrap',
                          color: esCritico ? 'var(--color-error-texto)' : undefined,
                          fontWeight: esCritico ? 600 : undefined,
                        }}
                      >
                        {describirPlazo(item.diasRestantes)}
                      </td>
                      <td className="acciones-col">
                        <button
                          type="button"
                          className="btn-guardar btn-gestionar-venc"
                          title="Gestionar registro y ver su detalle"
                          onClick={() => onIrAlRegistro(item)}
                        >
                          Gestionar ↗
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {itemsFiltrados.length > 0 && (
          <Paginacion
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            totalRegistros={totalRegistros}
            indiceInicio={indiceInicio}
            indiceFin={indiceFin}
            filasPorPagina={filasPorPagina}
            onCambiarPagina={setPaginaActual}
            onCambiarFilasPorPagina={setFilasPorPagina}
            etiqueta="vencimientos"
          />
        )}
      </CardContent>

      {onVerTodos && (
        <CardFooter
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border)',
            padding: '12px 24px',
            fontSize: '0.85rem',
            color: 'var(--color-texto-sec)',
            backgroundColor: 'color-mix(in srgb, var(--color-fondo) 40%, transparent)',
          }}
        >
          <span>
            Mostrando <strong>{itemsFiltrados.length}</strong> de {itemsAtencion.length} vencimientos que requieren atención
          </span>
          <button
            type="button"
            onClick={onVerTodos}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primario)',
              cursor: 'pointer',
              fontWeight: 600,
              padding: 0,
            }}
          >
            Ir a la vista consolidada completa →
          </button>
        </CardFooter>
      )}
    </Card>
  );
};
