import React from 'react';
import '../../styles/formularioAlta.css';
import '../../styles/rotulado.css';
import { describirCondicion, unidadValorCalculado, type PasoCalculoSello, type ResultadoRegla } from './tipos';

const redondear = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, ''));

interface DetalleEvaluacionProps {
  detalle: ResultadoRegla[];
  pasos?: PasoCalculoSello[] | null;
}

export const DetalleEvaluacion: React.FC<DetalleEvaluacionProps> = ({ detalle, pasos }) => (
  <div>
    {pasos && pasos.length > 0 && (
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--color-texto)' }}>
          Cálculo paso a paso frente al umbral
        </h4>
        <div className="tabla-wrapper">
          <table className="tabla-custom rot-tabla-detalle">
            <thead>
              <tr>
                <th>Criterio</th>
                <th>¿Tiene agregado?</th>
                <th>Cálculo realizado</th>
                <th>Umbral</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pasos.map((p) => (
                <tr key={p.codigo}>
                  <td>
                    <strong>{p.criterio}</strong>
                  </td>
                  <td>
                    {typeof p.tiene_agregado === 'boolean'
                      ? p.tiene_agregado
                        ? 'Sí'
                        : 'No'
                      : p.tiene_agregado}
                  </td>
                  <td>{p.calculo_realizado}</td>
                  <td>{p.umbral}</td>
                  <td>
                    {p.supera ? (
                      <span className="rot-resultado-supera" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined">check_box</span> Lleva sello
                      </span>
                    ) : !p.aplica ? (
                      <span className="rot-resultado-na" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined">cancel</span> No aplica
                      </span>
                    ) : (
                      <span className="rot-resultado-ok" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined">cancel</span> No supera
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {detalle && detalle.length > 0 && (
      <div className="tabla-wrapper">
        <table className="tabla-custom rot-tabla-detalle">
          <thead>
            <tr>
              <th>Regla</th>
              <th>Condiciones</th>
              <th>Valor calculado</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {detalle.map((r) => (
              <tr key={r.codigo}>
                <td>
                  <strong>{r.leyenda}</strong>
                  <div className="rot-texto-sec">{r.codigo}</div>
                </td>
                <td>
                  {r.condiciones.map((c, i) => (
                    <span key={i} className={`rot-condicion-linea ${c.evaluada ? '' : 'rot-resultado-na'}`}>
                      {describirCondicion(c.condicion)}
                    </span>
                  ))}
                </td>
                <td>
                  {r.condiciones.map((c, i) => (
                    <span key={i} className="rot-condicion-linea">
                      {!r.aplica || !c.evaluada ? (
                        <span className="rot-resultado-na">No evaluada</span>
                      ) : c.valor_calculado == null ? (
                        <span className="rot-resultado-na">—</span>
                      ) : (
                        <span className={c.cumple ? 'rot-resultado-supera' : ''}>
                          {redondear(c.valor_calculado)} {unidadValorCalculado(c.condicion)}
                        </span>
                      )}
                    </span>
                  ))}
                </td>
                <td>
                  {!r.aplica ? (
                    <span className="rot-resultado-na">No aplica</span>
                  ) : r.supera ? (
                    <span className="rot-resultado-supera">Lleva sello</span>
                  ) : (
                    <span className="rot-resultado-ok">No supera</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);
