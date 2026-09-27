import React, { useEffect, useRef, useState } from 'react';
import type { InsumoQuimico } from './tipos';
import '../../styles/formularioAlta.css';

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
  const dialogConfirmar = useRef<HTMLDialogElement>(null);

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

  const abrirConfirmacion = (item: InsumoQuimico) => {
    setQuimicoAConfirmar(item);
    dialogConfirmar.current?.showModal();
  };

  const cerrarConfirmacion = () => {
    dialogConfirmar.current?.close();
    setQuimicoAConfirmar(null);
  };

  const ejecutarToggle = async () => {
    if (!quimicoAConfirmar) return;
    try {
      await fetch(`http://localhost:8000/api/insumos-quimicos/${quimicoAConfirmar.id}/toggle`, { method: 'PATCH' });
      cerrarConfirmacion();
      cargarDatos();
    } catch (err) {
      console.error(err);
      cerrarConfirmacion();
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

  const campoFiltroStyle: React.CSSProperties = {
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    backgroundColor: 'var(--code-bg)',
    fontSize: '14px',
    color: 'var(--text-h)',
    outline: 'none',
  };

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Insumos Químicos</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>

        <button onClick={onNuevo} className="btn-guardar">
          + Agregar Insumo Químico
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ ...campoFiltroStyle, flex: 1, minWidth: '220px' }}
        />

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          style={{ ...campoFiltroStyle, cursor: 'pointer' }}
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
          style={{ ...campoFiltroStyle, cursor: 'pointer' }}
        >
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Existencias</th>
              <th>Unidad</th>
              <th>Estado</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando insumos químicos...
                </td>
              </tr>
            ) : insumosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  No hay insumos químicos registrados.
                </td>
              </tr>
            ) : (
              insumosFiltrados.map((item) => (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                  <td>{item.tipo}</td>
                  <td>{item.stock_actual}</td>
                  <td>{item.unidad_medida}</td>
                  <td>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: item.activo ? '#dcfce7' : '#fee2e2',
                        color: item.activo ? '#166534' : '#991b1b',
                      }}
                    >
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button className="btn-icon" title="Ver Detalle" onClick={() => onVerDetalle(item)}>
                        👁
                      </button>
                      <button className="btn-icon" title="Editar" onClick={() => onEditar(item)}>
                        ✎
                      </button>
                      <button
                        className="btn-icon"
                        title={item.activo ? 'Dar de baja' : 'Reactivar'}
                        onClick={() => abrirConfirmacion(item)}
                      >
                        {item.activo ? '🗑' : '🔄'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <dialog ref={dialogConfirmar} className="seguro">
        <h2>
          {quimicoAConfirmar?.activo ? '¿Dar de baja insumo químico?' : '¿Reactivar insumo químico?'}
        </h2>
        <p>
          ¿Estás seguro de que deseas {quimicoAConfirmar?.activo ? 'desactivar' : 'reactivar'} el insumo "
          {quimicoAConfirmar?.nombre}"?
        </p>
        <button type="button" className="btn-eliminar" onClick={ejecutarToggle}>
          {quimicoAConfirmar?.activo ? 'Confirmar Baja' : 'Confirmar Reactivación'}
        </button>
        <button type="button" className="btn-cancelar" onClick={cerrarConfirmacion}>
          Cancelar
        </button>
      </dialog>
    </div>
  );
};
