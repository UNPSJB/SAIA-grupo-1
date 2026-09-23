import React, { useEffect, useState } from 'react';
import type { InsumoQuimico } from './tipos';

interface Props {
  onNuevo: () => void;
  onEditar: (insumo: InsumoQuimico) => void;
  onVerDetalle: (insumo: InsumoQuimico) => void;
}

export const ListadoInsumosQuimicos: React.FC<Props> = ({ onNuevo, onEditar, onVerDetalle }) => {
  const [insumos, setInsumos] = useState<InsumoQuimico[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [cargando, setCargando] = useState(false);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const res = await fetch('http://localhost:8000/api/insumos-quimicos');
      if (!res.ok) throw new Error('Error al consultar insumos químicos');
      const data = await res.json();
      setInsumos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setInsumos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleToggleEstado = async (id: number) => {
    try {
      await fetch(`http://localhost:8000/api/insumos-quimicos/${id}/toggle`, { method: 'PATCH' });
      cargarDatos();
    } catch (err) {
      console.error('Error al cambiar estado:', err);
    }
  };

  const insumosFiltrados = Array.isArray(insumos)
    ? insumos.filter((item) => {
        const coincideNombre = item.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ?? false;
        const coincideTipo = filtroTipo === 'TODOS' || item.tipo === filtroTipo;
        const coincideEstado =
          filtroEstado === 'TODOS' ||
          (filtroEstado === 'ACTIVO' && item.activo) ||
          (filtroEstado === 'INACTIVO' && !item.activo);
        return coincideNombre && coincideTipo && coincideEstado;
      })
    : [];

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', color: '#fff', fontFamily: 'inherit' }}>
      {/* Header idéntico al de Lista de Personas / Insumos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            Lista de Insumos Químicos
          </h1>
          <span style={{ fontSize: '13px', color: '#7a7d90', fontWeight: '500' }}>01 · Listado</span>
        </div>

        <button
          onClick={onNuevo}
          style={{
            backgroundColor: '#ffffff',
            color: '#12131c',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 18px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          + Agregar Insumo Químico
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            flex: 1,
            minWidth: '240px',
            backgroundColor: '#1b1c28',
            border: '1px solid #292a3b',
            borderRadius: '8px',
            padding: '10px 16px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none'
          }}
        />

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          style={{
            backgroundColor: '#1b1c28',
            border: '1px solid #292a3b',
            borderRadius: '8px',
            padding: '10px 16px',
            color: '#c5c7d5',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="TODOS">Todos los tipos</option>
          <option value="DETERGENTE">Detergente</option>
          <option value="DESINFECTANTE">Desinfectante</option>
          <option value="DESENGRASANTE">Desengrasante</option>
          <option value="SANITIZANTE">Sanitizante</option>
          <option value="OTRO">Otro</option>
        </select>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={{
            backgroundColor: '#1b1c28',
            border: '1px solid #292a3b',
            borderRadius: '8px',
            padding: '10px 16px',
            color: '#c5c7d5',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>

      {/* Tabla con estilo oscuro redondeado idéntico a Lista de Personas */}
      <div style={{ backgroundColor: '#161722', borderRadius: '12px', border: '1px solid #232435', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #232435', color: '#7a7d90', fontSize: '12px', fontWeight: 'bold' }}>
              <th style={{ padding: '16px 20px' }}>Nombre</th>
              <th style={{ padding: '16px 20px' }}>Tipo</th>
              <th style={{ padding: '16px 20px' }}>Stock</th>
              <th style={{ padding: '16px 20px' }}>Unidad</th>
              <th style={{ padding: '16px 20px' }}>Estado</th>
              <th style={{ padding: '16px 20px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#7a7d90' }}>
                  Cargando insumos químicos...
                </td>
              </tr>
            ) : insumosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#7a7d90' }}>
                  No se encontraron insumos químicos.
                </td>
              </tr>
            ) : (
              insumosFiltrados.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #1f2030' }}>
                  <td style={{ padding: '16px 20px', color: '#fff', fontWeight: '500' }}>{item.nombre}</td>
                  <td style={{ padding: '16px 20px', color: '#9da0b5' }}>{item.tipo}</td>
                  <td style={{ padding: '16px 20px', color: '#fff' }}>{item.stock_actual}</td>
                  <td style={{ padding: '16px 20px', color: '#9da0b5' }}>{item.unidad_medida}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: item.activo ? '#143828' : '#3d1c23',
                        color: item.activo ? '#3dd68c' : '#f87171',
                        display: 'inline-block'
                      }}
                    >
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button
                        onClick={() => onVerDetalle(item)}
                        title="Ver Detalle"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#202232',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        👁
                      </button>
                      <button
                        onClick={() => onEditar(item)}
                        title="Editar"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#202232',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleToggleEstado(item.id)}
                        title={item.activo ? 'Desactivar' : 'Activar'}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#202232',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {item.activo ? '🗑️' : '🔄'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};