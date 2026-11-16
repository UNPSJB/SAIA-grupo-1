import React, { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import '../../styles/rotulado.css';
import { obtenerConjunto } from './api';
import { EstadoConjuntoChip } from './listado';
import { NuevaVersionDialog } from './NuevaVersionDialog';
import {
  describirCondicion,
  etiquetaNutriente,
  formatearFecha,
  SIMBOLO_COMPARADOR,
  type Conjunto,
} from './tipos';

interface DetalleConjuntoProps {
  conjuntoId: number | null;
  onVolver: () => void;
  onEditar: (id: number) => void;
}

export const DetalleConjunto: React.FC<DetalleConjuntoProps> = ({ conjuntoId, onVolver, onEditar }) => {
  const [conjunto, setConjunto] = useState<Conjunto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nuevaVersionAbierta, setNuevaVersionAbierta] = useState(false);

  useEffect(() => {
    if (conjuntoId == null) return;
    let cancelado = false;
    obtenerConjunto(conjuntoId)
      .then((c) => !cancelado && setConjunto(c))
      .catch((e: Error) => !cancelado && setError(e.message))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [conjuntoId]);

  const reglas = [...(conjunto?.reglas ?? [])].sort((a, b) => a.orden - b.orden);

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Parámetros de rotulado</h1>
          <div className="subtitulo">{conjunto ? `Versión ${conjunto.version}` : 'Detalle'}</div>
        </div>
        {conjunto && (
          <div style={{ display: 'flex', gap: 10 }}>
            {conjunto.estado === 'BORRADOR' ? (
              <button className="btn-guardar" onClick={() => onEditar(conjunto.id)}>
                ✎ Editar borrador
              </button>
            ) : (
              <button className="btn-guardar" onClick={() => setNuevaVersionAbierta(true)}>
                ⧉ Nueva versión
              </button>
            )}
          </div>
        )}
      </div>

      {cargando ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</div>
      ) : error || !conjunto ? (
        <div className="alerta-error">{error || 'El conjunto no existe.'}</div>
      ) : (
        <>
          <div className="rot-tarjeta">
            <h2>Datos generales</h2>
            <div className="rot-datos">
              <div>
                <div className="rot-dato-etiqueta">Versión</div>
                <div className="rot-dato-valor">{conjunto.version}</div>
              </div>
              <div>
                <div className="rot-dato-etiqueta">Fecha de vigencia</div>
                <div className="rot-dato-valor">{formatearFecha(conjunto.fecha_vigencia)}</div>
              </div>
              <div>
                <div className="rot-dato-etiqueta">Norma de origen</div>
                <div className="rot-dato-valor">{conjunto.norma_origen}</div>
              </div>
              <div>
                <div className="rot-dato-etiqueta">Estado</div>
                <div className="rot-dato-valor">
                  <EstadoConjuntoChip conjunto={conjunto} />
                </div>
              </div>
              <div>
                <div className="rot-dato-etiqueta">Creado</div>
                <div className="rot-dato-valor">{formatearFecha(conjunto.creado_en)}</div>
              </div>
              <div>
                <div className="rot-dato-etiqueta">Publicado</div>
                <div className="rot-dato-valor">{formatearFecha(conjunto.publicado_en)}</div>
              </div>
              <div>
                <div className="rot-dato-etiqueta">Cálculos realizados</div>
                <div className="rot-dato-valor">{conjunto.cantidad_calculos}</div>
              </div>
            </div>
            {conjunto.descripcion && (
              <div style={{ marginTop: '0.9rem' }}>
                <div className="rot-dato-etiqueta">Descripción</div>
                <div className="rot-dato-valor">{conjunto.descripcion}</div>
              </div>
            )}
          </div>

          <div className="rot-tarjeta">
            <h2>Reglas ({reglas.length})</h2>
            <div className="tabla-wrapper">
              <table className="tabla-custom rot-tabla-detalle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Leyenda del sello</th>
                    <th>Se aplica si…</th>
                    <th>Lleva sello cuando…</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {reglas.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem' }}>
                        Este conjunto todavía no tiene reglas.
                      </td>
                    </tr>
                  ) : (
                    reglas.map((r) => (
                      <tr key={r.id}>
                        <td>{r.orden}</td>
                        <td>
                          <strong>{r.leyenda}</strong>
                          <div className="rot-texto-sec">{r.codigo}</div>
                        </td>
                        <td>
                          {r.aplicabilidad.length === 0 ? (
                            <span className="rot-texto-sec">Siempre</span>
                          ) : (
                            r.aplicabilidad.map((a, i) => (
                              <span key={i} className="rot-condicion-linea">
                                {i > 0 && <span className="rot-texto-sec">y </span>}
                                {etiquetaNutriente(a.campo)} {SIMBOLO_COMPARADOR[a.comparador]} {a.valor}
                              </span>
                            ))
                          )}
                        </td>
                        <td>
                          {r.condiciones.map((c, i) => (
                            <span key={i} className="rot-condicion-linea">
                              {i > 0 && <span className="rot-texto-sec">o </span>}
                              {describirCondicion(c)}
                            </span>
                          ))}
                        </td>
                        <td>
                          <span className={`rot-chip ${r.activa ? 'rot-chip--activo' : 'rot-chip--inactivo'}`}>
                            {r.activa ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="form-acciones">
        <button type="button" className="btn-cancelar" onClick={onVolver}>
          Volver
        </button>
      </div>

      <NuevaVersionDialog
        origen={nuevaVersionAbierta ? conjunto : null}
        onCancel={() => setNuevaVersionAbierta(false)}
        onCreada={(creado) => {
          setNuevaVersionAbierta(false);
          onEditar(creado.id);
        }}
      />
    </div>
  );
};
