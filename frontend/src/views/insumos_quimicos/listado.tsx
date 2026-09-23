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

  // Estado para el modal de confirmación de baja lógica / reactivación
  const [quimicoAConfirmar, setQuimicoAConfirmar] = useState<InsumoQuimico | null>(null);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const res = await fetch('http://localhost:8000/api/insumos-quimicos');
      if (!res.ok) throw new Error('Error al consultar');
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

  const ejecutarToggle = async () => {
    if (!quimicoAConfirmar) return;
    try {
      await fetch(`http://localhost:8000/api/insumos-quimicos/${quimicoAConfirmar.id}/toggle`, { method: 'PATCH' });
      setQuimicoAConfirmar(null);
      cargarDatos();
    } catch (err) {
      console.error(err);
      setQuimicoAConfirmar(null);
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
    <div style={{ width: '100%', maxWidth: '1150px' }}>
      {/* Header superior */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            Lista de Insumos Químicos
          </h1>
          <span style={{ fontSize: '13px', color: '#7a7e93', fontWeight: '500' }}>01 · Listado</span>
        </div>

        <button
          onClick={onNuevo}
          style={{
            backgroundColor: '#ffffff',
            color: '#11121d',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          + Agregar Insumo Químico
        </button>
      </div>

      {/* Buscador y Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            flex: 1,
            backgroundColor: '#171824',
            border: '1px solid #232537',
            borderRadius: '8px',
            padding: '11px 16px',
            color: '#ffffff',
            fontSize: '14px',
            outline: 'none',
          }}
        />

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          style={{
            backgroundColor: '#171824',
            border: '1px solid #232537',
            borderRadius: '8px',
            padding: '11px 16px',
            color: '#c4c7d7',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer',
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
            backgroundColor: '#171824',
            border: '1px solid #232537',
            borderRadius: '8px',
            padding: '11px 16px',
            color: '#c4c7d7',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>

      {/* Tabla estilo Insumos */}
      <div
        style={{
          backgroundColor: '#151622',
          border: '1px solid #202234',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1b1c2b', borderBottom: '1px solid #232537', color: '#ffffff', fontWeight: 'bold' }}>
              <th style={{ padding: '16px 22px' }}>Nombre</th>
              <th style={{ padding: '16px 22px' }}>Tipo</th>
              <th style={{ padding: '16px 22px' }}>Existencias</th>
              <th style={{ padding: '16px 22px' }}>Unidad</th>
              <th style={{ padding: '16px 22px' }}>Estado</th>
              <th style={{ padding: '16px 22px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#7a7e93' }}>
                  Cargando insumos químicos...
                </td>
              </tr>
            ) : insumosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#7a7e93' }}>
                  No hay insumos químicos registrados.
                </td>
              </tr>
            ) : (
              insumosFiltrados.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #1c1d2c' }}>
                  <td style={{ padding: '16px 22px', color: '#ffffff', fontWeight: '600' }}>{item.nombre}</td>
                  <td style={{ padding: '16px 22px', color: '#9da0b3' }}>{item.tipo}</td>
                  <td style={{ padding: '16px 22px', color: '#ffffff', fontWeight: '500' }}>{item.stock_actual}</td>
                  <td style={{ padding: '16px 22px', color: '#9da0b3' }}>{item.unidad_medida}</td>
                  <td style={{ padding: '16px 22px' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: item.activo ? '#143828' : '#3d1c23',
                        color: item.activo ? '#3dd68c' : '#f87171',
                        display: 'inline-block',
                      }}
                    >
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 22px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button
                        onClick={() => onVerDetalle(item)}
                        title="Ver Detalle"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#202234',
                          border: 'none',
                          color: '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
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
                          backgroundColor: '#202234',
                          border: 'none',
                          color: '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setQuimicoAConfirmar(item)}
                        title={item.activo ? 'Desactivar' : 'Activar'}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#202234',
                          border: 'none',
                          color: '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
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

      {/* Modal de confirmación para Baja / Reactivación */}
      {quimicoAConfirmar && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: '#171826',
              border: '1px solid #282a3e',
              borderRadius: '12px',
              padding: '24px 28px',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#ffffff', fontWeight: 'bold' }}>
              {quimicoAConfirmar.activo ? '¿Dar de baja producto?' : '¿Reactivar producto?'}
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#9da0b3', lineHeight: '1.5' }}>
              ¿Estás seguro de que deseas {quimicoAConfirmar.activo ? 'desactivar' : 'reactivar'} el insumo{' '}
              <strong style={{ color: '#ffffff' }}>"{quimicoAConfirmar.nombre}"</strong>?
              {quimicoAConfirmar.activo && ' Dejará de estar disponible para el registro de consumo en tareas.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setQuimicoAConfirmar(null)}
                style={{
                  backgroundColor: '#202234',
                  color: '#c4c7d7',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarToggle}
                style={{
                  backgroundColor: quimicoAConfirmar.activo ? '#dc2626' : '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {quimicoAConfirmar.activo ? 'Confirmar Baja' : 'Confirmar Reactivación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};