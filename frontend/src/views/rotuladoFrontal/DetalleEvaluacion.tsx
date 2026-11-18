import React from 'react';
import '../../styles/formularioAlta.css';
import '../../styles/rotulado.css';
import { describirCondicion, unidadValorCalculado, type ResultadoRegla } from './tipos';

const redondear = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, ''));

/** Tabla de cómo se evaluó cada regla: si aplica, cada condición con su valor calculado y el resultado. */
export const DetalleEvaluacion: React.FC<{ detalle: ResultadoRegla[] }> = ({ detalle }) => (
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
);
