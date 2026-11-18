import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { Badge } from '../../components/ui/badge';

export interface EquivalenciaFaltanteItem {
  detalle_id: number;
  ingrediente_id?: number | null;
  tipo_insumo_id?: number | null;
  nombre: string;
  unidad_medida: string;
  mensaje: string;
}

export interface ItemComposicionPorcentual {
  detalle_id: number;
  ingrediente_id?: number | null;
  tipo_insumo_id?: number | null;
  aditivo_id?: number | null;
  nombre: string;
  nombre_etapa: string;
  cantidad: number;
  unidad_medida: string;
  gramos_equivalentes?: number | null;
  porcentaje?: number | null;
  es_aditivo: boolean;
  clase_funcional?: string | null;
  numero_ins?: string | null;
}

export interface ComposicionPorcentualData {
  receta_id: number;
  nombre_receta: string;
  id_producto: number;
  nombre_producto?: string | null;
  version_receta_id: number;
  version: number;
  rendimiento_final: number;
  peso_total_gramos: number;
  suma_porcentajes: number;
  diferencia_redondeo: number;
  cumple_cien_por_ciento: boolean;
  tiene_equivalencias_faltantes: boolean;
  equivalencias_faltantes: EquivalenciaFaltanteItem[];
  ingredientes: ItemComposicionPorcentual[];
  aditivos: ItemComposicionPorcentual[];
}

interface ComposicionPorcentualCardProps {
  recetaId?: number | null;
  productoId?: number | null;
  versionId?: number | null;
  titulo?: string;
}

export const ComposicionPorcentualCard: React.FC<ComposicionPorcentualCardProps> = ({
  recetaId,
  productoId,
  versionId,
  titulo = 'Composición Porcentual de la Formulación',
}) => {
  const [datos, setDatos] = useState<ComposicionPorcentualData | null>(null);
  const [cargando, setCargando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recetaId && !productoId) return;
    let cancelado = false;

    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const qs = versionId ? `?version_id=${versionId}` : '';
        const url = recetaId
          ? `/recetas/${recetaId}/composicion-porcentual${qs}`
          : `/productos/${productoId}/composicion-porcentual${qs}`;
        const res = await apiFetch(url);
        if (!cancelado) {
          if (res.ok) {
            const json: ComposicionPorcentualData = await res.json();
            setDatos(json);
          } else {
            const errJson = await res.json().catch(() => ({}));
            setError(errJson.detail || 'No se pudo calcular la composición porcentual.');
            setDatos(null);
          }
        }
      } catch {
        if (!cancelado) {
          setError('Error de conexión al consultar la composición porcentual.');
          setDatos(null);
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargar();
    return () => {
      cancelado = true;
    };
  }, [recetaId, productoId, versionId]);

  if (!recetaId && !productoId) return null;

  return (
    <div
      style={{
        margin: '1.5rem 0',
        padding: '1.25rem',
        backgroundColor: 'var(--color-superficie, #1e293b)',
        borderRadius: '10px',
        border: '1px solid var(--border, #334155)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-h)' }}>
            {titulo}
          </h3>
          {datos && (
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--color-texto-sec, #94a3b8)' }}>
              Receta: <strong>{datos.nombre_receta}</strong> (Versión v{datos.version}) · Peso total formulado:{' '}
              <strong>{datos.peso_total_gramos} g</strong>
            </p>
          )}
        </div>

        {datos && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <Badge variant={datos.cumple_cien_por_ciento ? 'activo' : 'vencido'}>
              {datos.cumple_cien_por_ciento
                ? `✓ Suma verificada: ${datos.suma_porcentajes}%`
                : `⚠ Suma: ${datos.suma_porcentajes}%`}
            </Badge>
            {datos.cumple_cien_por_ciento && datos.diferencia_redondeo !== 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-texto-sec, #94a3b8)' }}>
                (Diferencia de {datos.diferencia_redondeo > 0 ? `+${datos.diferencia_redondeo}` : datos.diferencia_redondeo}% por redondeo)
              </span>
            )}
          </div>
        )}
      </div>

      {cargando ? (
        <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--color-texto-sec)' }}>
          Calculando composición porcentual...
        </div>
      ) : error ? (
        <div className="alerta-error" style={{ margin: 0 }}>
          {error}
        </div>
      ) : datos ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {datos.tiene_equivalencias_faltantes && (
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(234, 179, 8, 0.14)',
                border: '1px solid #eab308',
                color: '#fde047',
                fontSize: '0.85rem',
              }}
            >
              <strong style={{ display: 'block', marginBottom: '0.35rem' }}>
                ⚠ Atención: Faltan equivalencias en gramos en el maestro de tipos de insumo
              </strong>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                {datos.equivalencias_faltantes.map((eq) => (
                  <li key={eq.detalle_id}>{eq.mensaje}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4
              style={{
                margin: '0 0 0.5rem 0',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--text-h)',
              }}
            >
              Grupo 1 · Ingredientes ({datos.ingredientes.length})
            </h4>
            <div className="tabla-wrapper" style={{ margin: 0 }}>
              <table className="tabla-custom" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Ingrediente</th>
                    <th>Etapa / Paso</th>
                    <th>Cantidad en Receta</th>
                    <th>Equivalente (g)</th>
                    <th>Porcentaje (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.ingredientes.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '1rem' }}>
                        No hay ingredientes registrados.
                      </td>
                    </tr>
                  ) : (
                    datos.ingredientes.map((ing) => (
                      <tr key={ing.detalle_id}>
                        <td style={{ fontWeight: 600 }}>{ing.nombre}</td>
                        <td>{ing.nombre_etapa}</td>
                        <td>
                          {ing.cantidad} {ing.unidad_medida}
                        </td>
                        <td>
                          {ing.gramos_equivalentes !== null && ing.gramos_equivalentes !== undefined
                            ? `${ing.gramos_equivalentes} g`
                            : 'Sin equivalencia'}
                        </td>
                        <td style={{ fontWeight: 700, color: '#38bdf8' }}>
                          {ing.porcentaje !== null && ing.porcentaje !== undefined
                            ? `${ing.porcentaje.toFixed(2)}%`
                            : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4
              style={{
                margin: '0 0 0.5rem 0',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--text-h)',
              }}
            >
              Grupo 2 · Aditivos ({datos.aditivos.length})
            </h4>
            {datos.aditivos.length === 0 ? (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--code-bg)',
                  border: '1px solid var(--border)',
                  fontSize: '0.83rem',
                  color: 'var(--color-texto-sec)',
                }}
              >
                Esta receta no contiene aditivos declarados.
              </div>
            ) : (
              <div className="tabla-wrapper" style={{ margin: 0 }}>
                <table className="tabla-custom" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Aditivo</th>
                      <th>Clase Funcional</th>
                      <th>N° INS</th>
                      <th>Cantidad en Receta</th>
                      <th>Equivalente (g)</th>
                      <th>Porcentaje (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.aditivos.map((adit) => (
                      <tr key={adit.detalle_id}>
                        <td style={{ fontWeight: 600 }}>{adit.nombre}</td>
                        <td>{adit.clase_funcional || 'Aditivo'}</td>
                        <td>{adit.numero_ins || 'No aplica'}</td>
                        <td>
                          {adit.cantidad} {adit.unidad_medida}
                        </td>
                        <td>
                          {adit.gramos_equivalentes !== null && adit.gramos_equivalentes !== undefined
                            ? `${adit.gramos_equivalentes} g`
                            : 'Sin equivalencia'}
                        </td>
                        <td style={{ fontWeight: 700, color: '#a78bfa' }}>
                          {adit.porcentaje !== null && adit.porcentaje !== undefined
                            ? `${adit.porcentaje.toFixed(2)}%`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
