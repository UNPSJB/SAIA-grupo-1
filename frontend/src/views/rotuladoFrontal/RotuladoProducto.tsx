import React, { Fragment, useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import '../../styles/rotulado.css';
import { calcularRotulado, listarCalculos, obtenerEstadoModulo } from './api';
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

/**
 * Sección del detalle de producto: último cálculo de sellos, formulario para calcular de nuevo
 * e historial. Solo se muestra con el módulo de octógonos activo.
 */
export const RotuladoProducto: React.FC<RotuladoProductoProps> = ({ productoId, unidadMedida }) => {
  const [moduloActivo, setModuloActivo] = useState<boolean | null>(null);
  const [calculos, setCalculos] = useState<Calculo[]>([]);
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
          const lista = await listarCalculos(productoId);
          if (!cancelado) setCalculos(lista);
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

  // con el módulo apagado (o sin poder consultarlo) la sección no se muestra
  if (moduloActivo === false || (moduloActivo === null && !cargando)) return null;

  const ultimo = calculos[0] ?? null;

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
        <h2 style={{ margin: 0 }}>Rotulado frontal</h2>
        {!formAbierto && !cargando && (
          <button type="button" className="btn-guardar rot-btn-chico" onClick={abrirFormulario}>
            {ultimo ? 'Recalcular sellos' : 'Calcular sellos'}
          </button>
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
              <h3>Valores nutricionales cada 100 {estadoDeducido === 'LIQUIDO' ? 'ml' : estadoDeducido === 'SOLIDO' ? 'g' : 'g / ml'}</h3>
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

          {ultimo ? (
            <>
              <ListaSellos leyendas={leyendasDeSellos(ultimo)} />
              <p className="rot-texto-sec" style={{ marginBottom: 0 }}>
                Último cálculo: {formatearFecha(ultimo.calculado_en)}
                {ultimo.calculado_por_legajo != null && ` · Legajo ${ultimo.calculado_por_legajo}`} · Parámetros versión{' '}
                {ultimo.version_parametros} ({ultimo.norma_origen}) · {ETIQUETA_ESTADO_FISICO[ultimo.estado_fisico]}
              </p>
            </>
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
                                <DetalleEvaluacion detalle={c.detalle} />
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
