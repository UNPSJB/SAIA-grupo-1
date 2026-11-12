import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import type { InformacionNutricional, ParametroRedondeo, VerificacionReferencia } from './tipos';

interface InformacionNutricionalModalProps {
  productoId: number;
  nombreProducto: string;
  onClose: () => void;
}

export const InformacionNutricionalModal: React.FC<InformacionNutricionalModalProps> = ({
  productoId,
  nombreProducto,
  onClose,
}) => {
  const { esAdministrador } = useAuth();
  const [info, setInfo] = useState<InformacionNutricional | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [verificacion, setVerificacion] = useState<VerificacionReferencia | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [mostrarParametros, setMostrarParametros] = useState(false);
  const [parametros, setParametros] = useState<ParametroRedondeo[]>([]);
  const [cargandoParametros, setCargandoParametros] = useState(false);
  const [tamanoPorcion, setTamanoPorcion] = useState<number>(50);
  const [porcionesEnvase, setPorcionesEnvase] = useState<number>(28);
  const [descPorcion, setDescPorcion] = useState<string>('1 rebanada (50g)');
  const [paramEditando, setParamEditando] = useState<ParametroRedondeo | null>(null);
  const [guardandoParam, setGuardandoParam] = useState(false);

  const cargarNutricion = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/nutricion/productos/${productoId}`);
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
        if (data.tamano_porcion_g) setTamanoPorcion(data.tamano_porcion_g);
        if (data.porciones_por_envase) setPorcionesEnvase(data.porciones_por_envase);
        if (data.descripcion_porcion) setDescPorcion(data.descripcion_porcion);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'No se pudo obtener la información nutricional.');
      }
    } catch {
      setError('Error de comunicación con el servidor al cargar información nutricional.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarNutricion();
  }, [productoId]);

  const cargarParametros = async () => {
    setCargandoParametros(true);
    try {
      const res = await apiFetch('/nutricion/parametros');
      if (res.ok) {
        const data = await res.json();
        setParametros(data);
      }
    } catch {
    } finally {
      setCargandoParametros(false);
    }
  };

  const ejecutarCalculo = async () => {
    if (!esAdministrador) return;
    setCalculando(true);
    setError(null);
    setMensajeExito(null);
    try {
      const res = await apiFetch(`/productos/${productoId}/calcular-nutricion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tamano_porcion_g: Number(tamanoPorcion) || 50,
          porciones_por_envase: Number(porcionesEnvase) || undefined,
          descripcion_porcion: descPorcion || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
        setMensajeExito('Información nutricional calculada con éxito desde la receta estructurada.');
        setVerificacion(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'No se pudo calcular la información nutricional.');
      }
    } catch {
      setError('Error al procesar el cálculo nutricional.');
    } finally {
      setCalculando(false);
    }
  };

  const ejecutarVerificacionReferencia = async () => {
    setVerificando(true);
    setError(null);
    try {
      const res = await apiFetch(`/nutricion/productos/${productoId}/verificar-referencia`);
      if (res.ok) {
        const data = await res.json();
        setVerificacion(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'No se pudo verificar el patrón de referencia.');
      }
    } catch {
      setError('Error al consultar la verificación del producto de referencia.');
    } finally {
      setVerificando(false);
    }
  };

  const guardarParametro = async () => {
    if (!paramEditando || !esAdministrador) return;
    setGuardandoParam(true);
    try {
      const res = await apiFetch(`/nutricion/parametros/${paramEditando.nutriente}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          umbral_no_significativo: Number(paramEditando.umbral_no_significativo),
          cifras_decimales: Number(paramEditando.cifras_decimales),
          cifras_decimales_mayores_10: Number(paramEditando.cifras_decimales_mayores_10),
          vdr: paramEditando.vdr ? Number(paramEditando.vdr) : null,
          texto_no_significativo: paramEditando.texto_no_significativo,
        }),
      });
      if (res.ok) {
        await cargarParametros();
        setParamEditando(null);
        await ejecutarCalculo();
      }
    } catch {
      setError('Error al guardar el parámetro.');
    } finally {
      setGuardandoParam(false);
    }
  };

  const restablecerParametros = async () => {
    if (!esAdministrador) return;
    setCargandoParametros(true);
    try {
      const res = await apiFetch('/nutricion/parametros/restablecer', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setParametros(data);
        await ejecutarCalculo();
      }
    } catch {
      setError('Error al restablecer los parámetros.');
    } finally {
      setCargandoParametros(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          color: '#f8fafc',
        }}
      >
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#1e293b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#38bdf8' }}>
              nutrition
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
                Información Nutricional Oficial
              </h2>
              <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                Producto: <strong style={{ color: '#f1f5f9' }}>{nombreProducto}</strong>
                {info?.nombre_receta && (
                  <span> · Receta vinculada: <span style={{ color: '#38bdf8' }}>{info.nombre_receta}</span></span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0.25rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
              close
            </span>
          </button>
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                error
              </span>
              <span>{error}</span>
            </div>
          )}

          {mensajeExito && (
            <div
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid #22c55e',
                color: '#86efac',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                check_circle
              </span>
              <span>{mensajeExito}</span>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>
                sync
              </span>
              <p>Cargando información nutricional...</p>
            </div>
          ) : (
            <>
              {esAdministrador && (
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '1rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-end',
                    gap: '1rem',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        Tamaño Porción (g)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={tamanoPorcion}
                        onChange={(e) => setTamanoPorcion(Number(e.target.value))}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          color: '#f8fafc',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '6px',
                          width: '100px',
                          fontSize: '0.9rem',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        Porciones por envase
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={porcionesEnvase}
                        onChange={(e) => setPorcionesEnvase(Number(e.target.value))}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          color: '#f8fafc',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '6px',
                          width: '100px',
                          fontSize: '0.9rem',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        Descripción de porción
                      </label>
                      <input
                        type="text"
                        value={descPorcion}
                        onChange={(e) => setDescPorcion(e.target.value)}
                        placeholder="ej: 1 rebanada (50g)"
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          color: '#f8fafc',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '6px',
                          width: '180px',
                          fontSize: '0.9rem',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={ejecutarCalculo}
                      disabled={calculando}
                      style={{
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: calculando ? 'not-allowed' : 'pointer',
                        opacity: calculando ? 0.7 : 1,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        calculate
                      </span>
                      {calculando ? 'Calculando...' : 'Calcular desde la receta'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMostrarParametros(!mostrarParametros);
                        if (!mostrarParametros) cargarParametros();
                      }}
                      style={{
                        backgroundColor: '#334155',
                        color: '#f8fafc',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        padding: '0.5rem 0.85rem',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                      }}
                      title="Configuración de parámetros de redondeo y expresión CAA"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        tune
                      </span>
                      Parámetros CAA
                    </button>
                  </div>
                </div>
              )}

              {mostrarParametros && (
                <div
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #38bdf8',
                    borderRadius: '8px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#38bdf8' }}>
                        Parámetros Configurables de Redondeo y Expresión (Cap. V CAA)
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                        Las cifras, decimales y umbrales no están fijos en código: se aplican dinámicamente desde esta configuración.
                      </p>
                    </div>
                    {esAdministrador && (
                      <button
                        type="button"
                        onClick={restablecerParametros}
                        style={{
                          backgroundColor: '#475569',
                          color: '#f8fafc',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        Restablecer CAA
                      </button>
                    )}
                  </div>

                  {cargandoParametros ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>Cargando parámetros...</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                            <th style={{ padding: '0.4rem' }}>Nutriente</th>
                            <th style={{ padding: '0.4rem' }}>Unidad</th>
                            <th style={{ padding: '0.4rem' }}>VDR</th>
                            <th style={{ padding: '0.4rem' }}>Umbral "0"</th>
                            <th style={{ padding: '0.4rem' }}>Decim. (&le;10)</th>
                            <th style={{ padding: '0.4rem' }}>Decim. (&gt;10)</th>
                            {esAdministrador && <th style={{ padding: '0.4rem' }}>Acciones</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {parametros.map((p) => (
                            <tr key={p.id} style={{ borderBottom: '1px solid #1e293b' }}>
                              <td style={{ padding: '0.4rem', fontWeight: 500 }}>{p.nombre_mostrar}</td>
                              <td style={{ padding: '0.4rem', color: '#94a3b8' }}>{p.unidad}</td>
                              <td style={{ padding: '0.4rem' }}>{p.vdr ? `${p.vdr} ${p.unidad}` : '-'}</td>
                              <td style={{ padding: '0.4rem' }}>&le; {p.umbral_no_significativo} {p.unidad}</td>
                              <td style={{ padding: '0.4rem' }}>{p.cifras_decimales}</td>
                              <td style={{ padding: '0.4rem' }}>{p.cifras_decimales_mayores_10}</td>
                              {esAdministrador && (
                                <td style={{ padding: '0.4rem' }}>
                                  <button
                                    type="button"
                                    onClick={() => setParamEditando(p)}
                                    style={{
                                      backgroundColor: 'transparent',
                                      border: '1px solid #475569',
                                      color: '#38bdf8',
                                      borderRadius: '4px',
                                      padding: '0.2rem 0.5rem',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Editar
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {paramEditando && (
                    <div
                      style={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        padding: '0.75rem',
                        marginTop: '0.5rem',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'flex-end',
                        gap: '0.75rem',
                      }}
                    >
                      <strong style={{ width: '100%', fontSize: '0.85rem', color: '#38bdf8' }}>
                        Editando parámetro: {paramEditando.nombre_mostrar}
                      </strong>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>Umbral "0"</label>
                        <input
                          type="number"
                          step="0.1"
                          value={paramEditando.umbral_no_significativo}
                          onChange={(e) =>
                            setParamEditando({ ...paramEditando, umbral_no_significativo: Number(e.target.value) })
                          }
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #475569',
                            color: '#fff',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            width: '80px',
                            fontSize: '0.8rem',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>Decim. (&le;10)</label>
                        <input
                          type="number"
                          min="0"
                          max="3"
                          value={paramEditando.cifras_decimales}
                          onChange={(e) =>
                            setParamEditando({ ...paramEditando, cifras_decimales: Number(e.target.value) })
                          }
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #475569',
                            color: '#fff',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            width: '70px',
                            fontSize: '0.8rem',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>Decim. (&gt;10)</label>
                        <input
                          type="number"
                          min="0"
                          max="3"
                          value={paramEditando.cifras_decimales_mayores_10}
                          onChange={(e) =>
                            setParamEditando({ ...paramEditando, cifras_decimales_mayores_10: Number(e.target.value) })
                          }
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #475569',
                            color: '#fff',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            width: '70px',
                            fontSize: '0.8rem',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={guardarParametro}
                          disabled={guardandoParam}
                          style={{
                            backgroundColor: '#22c55e',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          {guardandoParam ? 'Guardando...' : 'Guardar y Recalcular'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setParamEditando(null)}
                          style={{
                            backgroundColor: '#475569',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {info && (
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    border: '2px solid #334155',
                  }}
                >
                  <div
                    style={{
                      borderBottom: '3px solid #f8fafc',
                      paddingBottom: '0.75rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Información Nutricional
                    </h3>
                    <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: '0.25rem' }}>
                      Porción: <strong>{info.tamano_porcion_g} g</strong> {info.descripcion_porcion ? `(${info.descripcion_porcion})` : ''}
                      {info.porciones_por_envase && (
                        <span> · Porciones por envase: <strong>{info.porciones_por_envase}</strong></span>
                      )}
                    </div>
                  </div>

                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.92rem',
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f8fafc', textAlign: 'left' }}>
                        <th style={{ padding: '0.6rem 0.5rem', fontWeight: 700 }}>Nutriente</th>
                        <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 700 }}>Por 100 g</th>
                        <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 700 }}>
                          Porción ({info.tamano_porcion_g} g)
                        </th>
                        <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 700 }}>% VD (*)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {info.tabla_nutricional.map((f, idx) => {
                        const esSubItem = [
                          'azucares_totales',
                          'azucares_anadidos',
                          'grasas_saturadas',
                          'grasas_trans',
                        ].includes(f.nutriente);
                        return (
                          <tr
                            key={f.nutriente}
                            style={{
                              borderBottom: idx === info.tabla_nutricional.length - 1 ? 'none' : '1px solid #334155',
                              backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                            }}
                          >
                            <td
                              style={{
                                padding: '0.5rem',
                                paddingLeft: esSubItem ? '1.75rem' : '0.5rem',
                                color: esSubItem ? '#94a3b8' : '#f8fafc',
                                fontWeight: esSubItem ? 400 : 600,
                              }}
                            >
                              {f.nombre_mostrar}
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                              {f.valor_100g_formateado} {f.unidad}
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#38bdf8' }}>
                              {f.valor_porcion_formateado} {f.unidad}
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                              {f.vd_formateado}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div
                    style={{
                      borderTop: '2px solid #475569',
                      paddingTop: '0.75rem',
                      marginTop: '0.75rem',
                      fontSize: '0.78rem',
                      color: '#94a3b8',
                      lineHeight: 1.4,
                    }}
                  >
                    (*) % Valores Diarios con base a una dieta de 2.000 kcal u 8.400 kJ. Sus valores diarios pueden ser mayores o menores según sus necesidades energéticas (Resolución GMC 46/03 - Código Alimentario Argentino).
                  </div>
                </div>
              )}

              <div
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: '8px',
                  padding: '1rem',
                  border: '1px solid #334155',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="material-symbols-outlined" style={{ color: '#fbbf24', fontSize: '20px' }}>
                      verified
                    </span>
                    <strong style={{ fontSize: '0.9rem' }}>Validación contra Producto Patrón de la Cátedra</strong>
                  </div>
                  <button
                    type="button"
                    onClick={ejecutarVerificacionReferencia}
                    disabled={verificando}
                    style={{
                      backgroundColor: '#334155',
                      color: '#f8fafc',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      cursor: verificando ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      rule
                    </span>
                    {verificando ? 'Verificando...' : 'Verificar Tolerancia (±5%)'}
                  </button>
                </div>

                {verificacion && (
                  <div
                    style={{
                      backgroundColor: verificacion.resultado_global_valido
                        ? 'rgba(34, 197, 94, 0.1)'
                        : 'rgba(239, 68, 68, 0.1)',
                      border: `1px solid ${verificacion.resultado_global_valido ? '#22c55e' : '#ef4444'}`,
                      borderRadius: '6px',
                      padding: '0.75rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span
                        className="material-symbols-outlined"
                        style={{ color: verificacion.resultado_global_valido ? '#22c55e' : '#ef4444', fontSize: '20px' }}
                      >
                        {verificacion.resultado_global_valido ? 'check_circle' : 'warning'}
                      </span>
                      <strong style={{ color: verificacion.resultado_global_valido ? '#86efac' : '#fca5a5' }}>
                        {verificacion.mensaje}
                      </strong>
                    </div>

                    <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #475569', color: '#94a3b8' }}>
                            <th style={{ textAlign: 'left', padding: '0.25rem' }}>Nutriente</th>
                            <th style={{ textAlign: 'right', padding: '0.25rem' }}>Calculado (100g)</th>
                            <th style={{ textAlign: 'right', padding: '0.25rem' }}>Esperado Cátedra</th>
                            <th style={{ textAlign: 'right', padding: '0.25rem' }}>Desvío %</th>
                            <th style={{ textAlign: 'center', padding: '0.25rem' }}>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {verificacion.detalles_100g.map((d) => (
                            <tr key={d.nutriente} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <td style={{ padding: '0.25rem' }}>{d.nutriente}</td>
                              <td style={{ textAlign: 'right', padding: '0.25rem' }}>{d.valor_calculado}</td>
                              <td style={{ textAlign: 'right', padding: '0.25rem' }}>{d.valor_esperado}</td>
                              <td style={{ textAlign: 'right', padding: '0.25rem' }}>{d.diferencia_porcentual}%</td>
                              <td style={{ textAlign: 'center', padding: '0.25rem' }}>
                                <span
                                  style={{
                                    color: d.cumple_tolerancia ? '#22c55e' : '#ef4444',
                                    fontWeight: 600,
                                  }}
                                >
                                  {d.cumple_tolerancia ? 'DENTRO DE TOLERANCIA' : 'FUERA DE RANGO'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#1e293b',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#475569',
              color: '#f8fafc',
              border: 'none',
              borderRadius: '6px',
              padding: '0.5rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
