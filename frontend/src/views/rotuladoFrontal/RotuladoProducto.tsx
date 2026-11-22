import React, { Fragment, useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import '../../styles/rotulado.css';
import { calcularDesdeNutricion, listarCalculos, obtenerEstadoModulo, obtenerParametrosSellosVigentes } from './api';
import { DetalleEvaluacion } from './DetalleEvaluacion';
import { ListaSellos } from './Octogono';
import {
  ETIQUETA_ESTADO_FISICO,
  NUTRIENTES,
  formatearFecha,
  leyendasDeSellos,
  type Calculo,
  type ParametrosSellos,
} from './tipos';

interface RotuladoProductoProps {
  productoId: number;
  unidadMedida?: string;
}

export const RotuladoProducto: React.FC<RotuladoProductoProps> = ({ productoId }) => {
  const [moduloActivo, setModuloActivo] = useState<boolean | null>(null);
  const [calculos, setCalculos] = useState<Calculo[]>([]);
  const [parametrosVigentes, setParametrosVigentes] = useState<ParametrosSellos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [detalleAbierto, setDetalleAbierto] = useState<number | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const estado = await obtenerEstadoModulo();
        if (cancelado) return;
        setModuloActivo(estado.activo);
        if (estado.activo) {
          const [lista, params] = await Promise.all([
            listarCalculos(productoId),
            obtenerParametrosSellosVigentes().catch(() => null),
          ]);
          if (!cancelado) {
            setCalculos(lista);
            setParametrosVigentes(params);
          }
        }
      } catch (e) {
        if (!cancelado) setError((e as Error).message);
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [productoId]);

  if (moduloActivo === false || (moduloActivo === null && !cargando)) return null;

  const ultimo = calculos[0] ?? null;

  const calcularAutoNutricion = async () => {
    setCalculando(true);
    setError(null);
    try {
      const nuevo = await calcularDesdeNutricion(productoId);
      setCalculos((prev) => [nuevo, ...prev]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCalculando(false);
    }
  };

  return (
    <div className="rot-tarjeta" style={{ marginTop: '1.5rem' }}>
      <div className="rot-regla-cabecera">
        <h2 style={{ margin: 0 }}>Rotulado frontal (Sellos de Advertencia)</h2>
        {!cargando && !ultimo && (
          <button
            type="button"
            className="btn-guardar rot-btn-chico"
            onClick={calcularAutoNutricion}
            disabled={calculando}
            title="Calcular sellos automáticamente a partir de la información nutricional del producto"
          >
            {calculando ? 'Calculando...' : 'Calcular sellos desde Nutrición'}
          </button>
        )}
      </div>

      {cargando ? (
        <div className="rot-texto-sec">Cargando rotulado...</div>
      ) : error ? (
        <div className="alerta-error">{error}</div>
      ) : (
        <>
          {ultimo && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.95rem', color: '#1e293b' }}>
                  <strong>Versión de parámetros:</strong>{' '}
                  {parametrosVigentes?.version || ultimo.version_parametros}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                  <strong>Fecha de vigencia:</strong>{' '}
                  {formatearFecha(parametrosVigentes?.fecha_vigencia || ultimo.fecha_vigencia_parametros)}
                </div>
              </div>
              <button
                type="button"
                className="btn-guardar rot-btn-chico"
                onClick={calcularAutoNutricion}
                disabled={calculando}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span>{calculando ? 'Recalculando...' : 'Recalcular Sellos'}</span>
              </button>
            </div>
          )}

          {ultimo ? (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                RESULTADO PARA CARA PRINCIPAL DEL ENVASE
              </h3>
              {ultimo.sellos && ultimo.sellos.length > 0 ? (
                <div style={{ padding: '0.5rem 0' }}>
                  <ListaSellos leyendas={leyendasDeSellos(ultimo)} />
                </div>
              ) : (
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    color: '#166534',
                    fontWeight: 600,
                  }}
                >
                  Producto sin sellos de advertencia
                </div>
              )}
              <p className="rot-texto-sec" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                Último cálculo: {formatearFecha(ultimo.calculado_en)}
                {ultimo.calculado_por_legajo != null && ` · Legajo ${ultimo.calculado_por_legajo}`} · Parámetros versión{' '}
                {ultimo.version_parametros} ({ultimo.norma_origen}) · {ETIQUETA_ESTADO_FISICO[ultimo.estado_fisico]}
              </p>

              <DetalleEvaluacion detalle={ultimo.detalle} pasos={ultimo.pasos} />
            </div>
          ) : (
            <p className="rot-texto-sec" style={{ margin: 0 }}>
              Este producto todavía no tiene cálculos de rotulado. Calculá primero su información nutricional y luego generá los sellos automáticamente.
            </p>
          )}

          {calculos.length > 0 && (
            <div style={{ marginTop: '1.25rem' }}>
              <h3>Historial de cálculos ({calculos.length})</h3>
              <div className="tabla-wrapper">
                <table className="tabla-custom rot-tabla-detalle">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Parámetros</th>
                      <th>Sellos</th>
                      <th className="acciones-col">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculos.map((c) => {
                      const leyendas = leyendasDeSellos(c);
                      const abierto = detalleAbierto === c.id;
                      return (
                        <Fragment key={c.id}>
                          <tr className={abierto ? 'rot-historial-fila-abierta' : ''}>
                            <td>{formatearFecha(c.calculado_en)}</td>
                            <td>
                              {c.version_parametros}
                              <div className="rot-texto-sec">Vigencia {formatearFecha(c.fecha_vigencia_parametros)}</div>
                            </td>
                            <td>{leyendas.length === 0 ? <span className="rot-resultado-ok">Sin sellos</span> : leyendas.join(' · ')}</td>
                            <td className="acciones-col">
                              <button
                                type="button"
                                className="btn-icon btn-ver"
                                title={abierto ? 'Ocultar detalle' : 'Ver detalle'}
                                onClick={() => setDetalleAbierto(abierto ? null : c.id)}
                              >
                                {abierto ? '▴' : '👁'}
                              </button>
                            </td>
                          </tr>
                          {abierto && (
                            <tr className="rot-historial-fila-abierta">
                              <td colSpan={4}>
                                <div style={{ marginBottom: '0.75rem' }}>
                                  <ListaSellos leyendas={leyendas} tamano={80} />
                                </div>
                                <div className="rot-texto-sec" style={{ marginBottom: '0.75rem' }}>
                                  {ETIQUETA_ESTADO_FISICO[c.estado_fisico]}
                                  {c.calculado_por_legajo != null && ` · Legajo ${c.calculado_por_legajo}`} · Valores nutricionales (cada 100g/ml):{' '}
                                  {NUTRIENTES.map((n) => `${n.etiqueta} ${c.valores_entrada[n.valor]} ${n.unidad}`).join(' · ')}
                                </div>
                                <DetalleEvaluacion detalle={c.detalle} pasos={c.pasos} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
