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
  const [quimicoAConfirmar, setQuimicoAConfirmar] = useState<InsumoQuimico | null>(null);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const res = await fetch('http://localhost:8000/api/insumos-quimicos');
      if (!res.ok) {
        console.error('Error del servidor:', await res.text());
        throw new Error('Error al cargar insumos');
      }
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
    <div style={{ width: '100%', maxWidth: '1080px', margin: '0 auto', fontFamily: 'inherit', color: '#2b2b2b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '38px', fontWeight: '800', margin: '0 0 6px 0', color: '#2b2b2b', letterSpacing: '-0.5px' }}>
            Lista de Insumos Químicos
          </h1>
          <span style={{ fontSize: '15px', color: '#6b6b6b', fontWeight: '500' }}>01 · Listado</span>
        </div>

        <button
          onClick={onNuevo}
          style={{
            backgroundColor: '#32322e',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
        >
          + Agregar Insumo Químico
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ flex: 1, minWidth: '220px', backgroundColor: '#faf9f5', border: '1px solid #e5e4de', borderRadius: '8px', padding: '10px 16px', color: '#2b2b2b', fontSize: '14px', outline: 'none' }}
        />

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          style={{ backgroundColor: '#faf9f5', border: '1px solid #e5e4de', borderRadius: '8px', padding: '10px 14px', color: '#444444', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
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
          style={{ backgroundColor: '#faf9f5', border: '1px solid #e5e4de', borderRadius: '8px', padding: '10px 14px', color: '#444444', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
        >
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f4f3ed', color: '#2b2b2b' }}>
              <th style={{ padding: '14px 20px', fontWeight: '700', borderRadius: '8px 0 0 8px' }}>Nombre</th>
              <th style={{ padding: '14px 20px', fontWeight: '700' }}>Tipo</th>
              <th style={{ padding: '14px 20px', fontWeight: '700' }}>Existencias</th>
              <th style={{ padding: '14px 20px', fontWeight: '700' }}>Unidad</th>
              <th style={{ padding: '14px 20px', fontWeight: '700' }}>Estado</th>
              <th style={{ padding: '14px 20px', fontWeight: '700', textAlign: 'center', borderRadius: '0 8px 8px 0' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#888888' }}>Cargando insumos químicos...</td></tr>
            ) : insumosFiltrados.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#888888' }}>No hay insumos químicos registrados.</td></tr>
            ) : (
              insumosFiltrados.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #eeeeee' }}>
                  <td style={{ padding: '18px 20px', color: '#2b2b2b', fontWeight: '500' }}>{item.nombre}</td>
                  <td style={{ padding: '18px 20px', color: '#555555' }}>{item.tipo}</td>
                  <td style={{ padding: '18px 20px', color: '#2b2b2b', fontWeight: '600' }}>{item.stock_actual}</td>
                  <td style={{ padding: '18px 20px', color: '#555555' }}>{item.unidad_medida}</td>
                  <td style={{ padding: '18px 20px' }}>
                    <span style={{ padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '600', backgroundColor: item.activo ? '#e7f7ed' : '#fdeced', color: item.activo ? '#1e7e34' : '#c82333', display: 'inline-block' }}>
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button onClick={() => onVerDetalle(item)} title="Ver Detalle" style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f5f4ef', border: 'none', color: '#2b2b2b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>👁</button>
                      <button onClick={() => onEditar(item)} title="Editar" style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f5f4ef', border: 'none', color: '#2b2b2b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✏️</button>
                      <button onClick={() => setQuimicoAConfirmar(item)} title={item.activo ? 'Dar de baja' : 'Reactivar'} style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f5f4ef', border: 'none', color: '#2b2b2b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>{item.activo ? '🗑️' : '🔄'}</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {quimicoAConfirmar && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '28px', maxWidth: '440px', width: '90%', boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#2b2b2b', fontWeight: 'bold' }}>{quimicoAConfirmar.activo ? '¿Dar de baja insumo químico?' : '¿Reactivar insumo químico?'}</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#666666', lineHeight: '1.5' }}>
              ¿Estás seguro de que deseas {quimicoAConfirmar.activo ? 'desactivar' : 'reactivar'} el insumo <strong style={{ color: '#2b2b2b' }}>"{quimicoAConfirmar.nombre}"</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setQuimicoAConfirmar(null)} style={{ backgroundColor: '#ffffff', color: '#444444', border: '1px solid #cccccc', borderRadius: '8px', padding: '10px 18px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={ejecutarToggle} style={{ backgroundColor: quimicoAConfirmar.activo ? '#c82333' : '#1e7e34', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>{quimicoAConfirmar.activo ? 'Confirmar Baja' : 'Confirmar Reactivación'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};