import { useEffect, useState } from "react";
import type { InsumoConId, InsumoDetalleTrazabilidad } from "./tipos";
import "../../styles/formularioAlta.css";
import { apiFetch } from "../../api/client";

interface VerInsumoProps {
  insumo: InsumoConId;
  onEditarClick?: (insumo: InsumoConId) => void;
  onVolver?: () => void;
  textoVolver?: string;
}

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "No perecedero";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("es-AR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
  } catch {
    return dateStr;
  }
};

export default function VerInsumo({ insumo, onEditarClick, onVolver, textoVolver }: VerInsumoProps) {
  const [trazabilidad, setTrazabilidad] = useState<InsumoDetalleTrazabilidad | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    async function cargarTrazabilidad() {
      try {
        let res = await apiFetch(`/insumos/${insumo.id}/trazabilidad`);
        if (res.status === 403 || res.status === 404) {
          res = await apiFetch(`/insumos-operador/${insumo.id}/trazabilidad`);
        }
        if (!cancelado && res.ok) {
          const data = await res.json();
          setTrazabilidad(data);
        }
      } catch {
        if (!cancelado) setTrazabilidad(null);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    cargarTrazabilidad();
    return () => {
      cancelado = true;
    };
  }, [insumo.id]);

  const renderBadge = (estado?: string | null) => {
    switch (estado) {
      case 'VENCIDO':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#dc2626',
            }}
          >
            Vencido
          </span>
        );
      case 'PROXIMO_A_VENCER':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: 'rgba(234, 179, 8, 0.15)',
              color: '#ca8a04',
            }}
          >
            Próximo a Vencer
          </span>
        );
      case 'VIGENTE':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              color: '#16a34a',
            }}
          >
            Vigente
          </span>
        );
      default:
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: 'rgba(100, 116, 139, 0.15)',
              color: '#64748b',
            }}
          >
            Agotado / Sin Alerta
          </span>
        );
    }
  };

  const detalle = trazabilidad || {
    id: insumo.id,
    nombre: insumo.nombre,
    lote: insumo.lote,
    stock: insumo.stock,
    cantRecibida: insumo.cantRecibida,
    medida: insumo.medida,
    fechaRecepcion: insumo.fechaRecepcion,
    fechaVencimiento: insumo.fechaVencimiento || null,
    tipo_insumo_nombre: insumo.tipo_insumo_nombre || null,
    proveedor_nombre: insumo.proveedor_nombre || null,
    estadoVencimiento: insumo.estadoVencimiento || 'VIGENTE',
    lotes_produccion: [],
  };

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Detalle de Lote de Insumo</h1>
          <div className="subtitulo">Información del lote y trazabilidad en producción</div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {onEditarClick && (
            <button
              type="button"
              className="btn-guardar"
              onClick={() => onEditarClick(insumo)}
            >
              Editar Insumo
            </button>
          )}
          <button type="button" className="btn-cancelar" onClick={onVolver}>
            {textoVolver || 'Volver'}
          </button>
        </div>
      </div>

      <div
        style={{
          background: 'var(--code-bg, rgba(255, 255, 255, 0.03))',
          padding: '16px 20px',
          borderRadius: '8px',
          border: '1px solid var(--border, #334155)',
          marginBottom: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Código de Lote</span>
          <p style={{ fontWeight: 600, fontSize: '1.1rem', margin: '4px 0 0' }}>{detalle.lote}</p>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Nombre / Descripción</span>
          <p style={{ fontWeight: 600, margin: '4px 0 0' }}>{detalle.nombre}</p>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Tipo de Insumo</span>
          <p style={{ fontWeight: 500, margin: '4px 0 0' }}>{detalle.tipo_insumo_nombre || '-'}</p>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Proveedor</span>
          <p style={{ fontWeight: 500, margin: '4px 0 0' }}>{detalle.proveedor_nombre || '-'}</p>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Fecha de Recepción</span>
          <p style={{ margin: '4px 0 0' }}>{formatDate(detalle.fechaRecepcion)}</p>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Fecha de Vencimiento</span>
          <p style={{ margin: '4px 0 0' }}>{formatDate(detalle.fechaVencimiento)}</p>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Cantidad Recibida</span>
          <p style={{ margin: '4px 0 0' }}>{detalle.cantRecibida} {detalle.medida}</p>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Stock Disponible</span>
          <p style={{ fontWeight: 600, margin: '4px 0 0' }}>{detalle.stock} {detalle.medida}</p>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Estado de Vencimiento</span>
          <p style={{ margin: '4px 0 0' }}>{renderBadge(detalle.estadoVencimiento)}</p>
        </div>
      </div>

      <h2 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>
        Trazabilidad: Lotes de Producción donde fue utilizado
      </h2>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Código Lote Producción</th>
              <th>Producto Elaborado</th>
              <th>Fecha de Producción</th>
              <th>Cantidad Utilizada</th>
              <th>Responsable</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem' }}>
                  Cargando trazabilidad...
                </td>
              </tr>
            ) : detalle.lotes_produccion.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem' }}>
                  Este lote de insumo no ha sido utilizado aún en ningún lote de producción.
                </td>
              </tr>
            ) : (
              detalle.lotes_produccion.map((lp) => (
                <tr key={lp.lote_produccion_id}>
                  <td style={{ fontWeight: 600 }}>{lp.lote_produccion_codigo}</td>
                  <td>{lp.producto_nombre}</td>
                  <td>{formatDate(lp.fecha_produccion)}</td>
                  <td style={{ fontWeight: 600 }}>
                    {lp.cantidad_usada} {lp.unidad_medida}
                  </td>
                  <td>{lp.responsable_nombre}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
