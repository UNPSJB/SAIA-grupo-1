import React, { Fragment, useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import '../../styles/rotulado.css';
import { apiFetch } from '../../api/client';
import { calcularDesdeNutricion, calcularRotulado, listarCalculos, obtenerEstadoModulo, obtenerParametrosSellosVigentes } from './api';
import { DetalleEvaluacion } from './DetalleEvaluacion';
import { ListaSellos } from './Octogono';
import {
  ETIQUETA_ESTADO_FISICO,
  NUTRIENTES,
  estadoFisicoPorUnidad,
  formatearFecha,
  leyendasDeSellos,
  type Calculo,
  type EstadoFisico,
  type Nutriente,
  type ParametrosSellos,
  type ValoresNutricionales,
} from './tipos';

interface RotuladoProductoProps {
  productoId: number;
  unidadMedida: string;
}

type ValoresForm = Record<Nutriente, string>;

const VALORES_VACIOS: ValoresForm = {
  energia_kcal: '',
  azucares_anadidos: '',
  grasas_totales: '',
  grasas_saturadas: '',
  sodio_mg: '',
};

const aFormulario = (v: ValoresNutricionales): ValoresForm => ({
  energia_kcal: String(v.energia_kcal),
  azucares_anadidos: String(v.azucares_anadidos),
  grasas_totales: String(v.grasas_totales),
  grasas_saturadas: String(v.grasas_saturadas),
  sodio_mg: String(v.sodio_mg),
});

export const RotuladoProducto: React.FC<RotuladoProductoProps> = ({ productoId, unidadMedida }) => {
  const [moduloActivo, setModuloActivo] = useState<boolean | null>(null);
  const [calculos, setCalculos] = useState<Calculo[]>([]);
  const [parametrosVigentes, setParametrosVigentes] = useState<ParametrosSellos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formAbierto, setFormAbierto] = useState(false);
  const [valores, setValores] = useState<ValoresForm>(VALORES_VACIOS);
  const [estadoElegido, setEstadoElegido] = useState<'' | EstadoFisico>('');
  const [erroresForm, setErroresForm] = useState<string[]>([]);
  const [calculando, setCalculando] = useState(false);
  const [detalleAbierto, setDetalleAbierto] = useState<number | null>(null);

  const estadoDeducido = estadoFisicoPorUnidad(unidadMedida);

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

  const cargarValoresDesdeNutricion = async () => {
    try {
      const res = await apiFetch(`/productos/${productoId}/informacion-nutricional`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.tabla_nutricional) {
          const mapa: Record<string, number> = {};
          data.tabla_nutricional.forEach((row: { nutriente: string; valor_100g: number }) => {
            mapa[row.nutriente] = row.valor_100g;
          });
          setValores({
            energia_kcal: mapa.energia_kcal !== undefined ? String(mapa.energia_kcal) : '',
            azucares_anadidos: mapa.azucares_anadidos !== undefined ? String(mapa.azucares_anadidos) : '',
            grasas_totales: mapa.grasas_totales !== undefined ? String(mapa.grasas_totales) : '',
            grasas_saturadas: mapa.grasas_saturadas !== undefined ? String(mapa.grasas_saturadas) : '',
            sodio_mg: mapa.sodio_mg !== undefined ? String(mapa.sodio_mg) : '',
          });
        }
      }
    } catch {
    }
  };

  const calcularAutoNutricion = async () => {
    setCalculando(true);
    setError(null);
    try {
      const nuevo = await calcularDesdeNutricion(productoId);
      setCalculos((prev) => [nuevo, ...prev]);
      setFormAbierto(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCalculando(false);
    }
  };

  const abrirFormulario = () => {
    setValores(ultimo ? aFormulario(ultimo.valores_entrada) : VALORES_VACIOS);
    setEstadoElegido(ultimo && !estadoDeducido ? ultimo.estado_fisico : '');
    setErroresForm([]);
    setFormAbierto(true);
  };

  // no es un <form>: la sección vive dentro del formulario de solo lectura del detalle de producto
  const calcular = async () => {
    const errores: string[] = [];
    NUTRIENTES.forEach((n) => {
      const v = valores[n.valor];
      if (v.trim() === '' || Number.isNaN(Number(v)) || Number(v) < 0)
        errores.push(`${n.etiqueta}: ingresá un número mayor o igual a 0.`);
    });
    if (!estadoDeducido && !estadoElegido) errores.push('Indicá si el producto es sólido o líquido.');
    setErroresForm(errores);
    if (errores.length) return;

    setCalculando(true);
    try {
      const nuevo = await calcularRotulado(
        productoId,
        {
          energia_kcal: Number(valores.energia_kcal),
          azucares_anadidos: Number(valores.azucares_anadidos),
          grasas_totales: Number(valores.grasas_totales),
          grasas_saturadas: Number(valores.grasas_saturadas),
          sodio_mg: Number(valores.sodio_mg),
        },
        estadoDeducido ? null : (estadoElegido as EstadoFisico),
      );
      setCalculos((prev) => [nuevo, ...prev]);
      setFormAbierto(false);
    } catch (err) {
      setErroresForm([(err as Error).message]);
    } finally {
      setCalculando(false);
    }
  };

  return (
    <div className="rot-tarjeta" style={{ marginTop: '1.5rem' }}>
      <div className="rot-regla-cabecera">
        <h2 style={{ margin: 0 }}>Rotulado frontal (Sellos de Advertencia)</h2>
        {!formAbierto && !cargando && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-secundario rot-btn-chico"
              onClick={calcularAutoNutricion}
              disabled={calculando}
              title="Calcular sellos automáticamente a partir de los datos nutricionales calculados en E11"
            >
              {calculando ? 'Calculando...' : 'Calcular desde Nutrición (E11)'}
            </button>
            <button type="button" className="btn-guardar rot-btn-chico" onClick={abrirFormulario}>
              {ultimo ? 'Ajuste manual de sellos' : 'Ingreso manual'}
            </button>
          </div>
        )}
      </div>

      {cargando ? (
        <div className="rot-texto-sec">Cargando rotulado...</div>
      ) : error ? (
        <div className="alerta-error">{error}</div>
      ) : (
        <>
          {formAbierto && (
            <div className="rot-regla">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0 }}>Valores nutricionales cada 100 {estadoDeducido === 'LIQUIDO' ? 'ml' : estadoDeducido === 'SOLIDO' ? 'g' : 'g / ml'}</h3>
                <button
                  type="button"
                  className="btn-secundario rot-btn-chico"
                  onClick={cargarValoresDesdeNutricion}
                  style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                >
                  Cargar desde Nutrición E11
                </button>
              </div>
              {erroresForm.length > 0 && (
                <ul className="rot-errores">
                  {erroresForm.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              )}
              <div className="rot-valores-grid">
                {NUTRIENTES.map((n) => (
                  <div className="form-group" key={n.valor}>
                    <label htmlFor={`rot-${n.valor}`}>{n.etiqueta}</label>
                    <div className="rot-input-unidad">
                      <input
                        id={`rot-${n.valor}`}
                        type="number"
                        min={0}
                        step="any"
                        value={valores[n.valor]}
                        onChange={(e) => setValores((v) => ({ ...v, [n.valor]: e.target.value }))}
                      />
                      <span>{n.unidad}</span>
                    </div>
                  </div>
                ))}
                <div className="form-group">
                  <label htmlFor="rot-estado">Estado físico</label>
                  {estadoDeducido ? (
                    <input id="rot-estado" value={`${ETIQUETA_ESTADO_FISICO[estadoDeducido]} (por unidad de medida)`} disabled />
                  ) : (
                    <select id="rot-estado" value={estadoElegido} onChange={(e) => setEstadoElegido(e.target.value as '' | EstadoFisico)}>
                      <option value="">Seleccioná...</option>
                      <option value="SOLIDO">Sólido</option>
                      <option value="LIQUIDO">Líquido</option>
                    </select>
                  )}
                </div>
              </div>
              <div className="form-acciones" style={{ marginTop: 0 }}>
                <button type="button" className="btn-cancelar" onClick={() => setFormAbierto(false)} disabled={calculando}>
                  Cancelar
                </button>
                <button type="button" className="btn-guardar" onClick={calcular} disabled={calculando}>
                  {calculando ? 'Calculando...' : 'Calcular'}
                </button>
              </div>
            </div>
          )}

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
                <span>⚡</span>
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
            !formAbierto && (
              <p className="rot-texto-sec" style={{ margin: 0 }}>
                Este producto todavía no tiene cálculos de rotulado.
              </p>
            )
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
                                  {c.calculado_por_legajo != null && ` · Legajo ${c.calculado_por_legajo}`} · Valores ingresados:{' '}
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
