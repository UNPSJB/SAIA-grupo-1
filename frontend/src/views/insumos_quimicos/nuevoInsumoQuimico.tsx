import React, { useState } from 'react';
import type { InsumoQuimicoCreateDTO, TipoQuimico, UnidadMedida } from './tipos';
import { OPCIONES_TIPO, OPCIONES_UNIDAD } from './tipos';

interface Props {
  onVolver: () => void;
  onCreado: () => void;
}

export const NuevoInsumoQuimico: React.FC<Props> = ({ onVolver, onCreado }) => {
  const [formData, setFormData] = useState<InsumoQuimicoCreateDTO>({
    nombre: '',
    tipo: 'DETERGENTE',
    unidad_medida: 'L',
    stock_actual: 0,
  });

  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nombre.trim()) {
      setError('El nombre del insumo químico es obligatorio.');
      return;
    }

    if (formData.stock_actual < 0 || isNaN(formData.stock_actual)) {
      setError('El stock debe ser mayor o igual a cero.');
      return;
    }

    try {
      setCargando(true);
      const res = await fetch('http://localhost:8000/api/insumos-quimicos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          nombre: formData.nombre.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Error al guardar el insumo');
      }

      onCreado();
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setCargando(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: '#1b1c28',
    border: '1px solid #292a3b',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    marginTop: '6px'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#d0d2e0'
  };

  return (
    <div style={{ width: '100%', maxWidth: '650px', color: '#fff' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Nuevo Insumo Químico</h1>
        <span style={{ fontSize: '13px', color: '#7a7d90', fontWeight: '500' }}>02 · Formulario</span>
      </div>

      {error && (
        <div style={{ backgroundColor: '#3d1c23', border: '1px solid #f87171', color: '#fca5a5', padding: '12px', borderRadius: '8px', marginBottom: '18px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <label style={labelStyle}>Nombre</label>
          <input
            type="text"
            placeholder="Introduce el nombre"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Tipo de Químico</label>
          <select
            value={formData.tipo}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoQuimico })}
            style={inputStyle}
          >
            {OPCIONES_TIPO.map((opt) => (
              <option key={opt.value} value={opt.value} style={{ backgroundColor: '#1b1c28' }}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Unidad de Medida</label>
          <select
            value={formData.unidad_medida}
            onChange={(e) => setFormData({ ...formData, unidad_medida: e.target.value as UnidadMedida })}
            style={inputStyle}
          >
            {OPCIONES_UNIDAD.map((opt) => (
              <option key={opt.value} value={opt.value} style={{ backgroundColor: '#1b1c28' }}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Stock Inicial</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.stock_actual}
            onChange={(e) => setFormData({ ...formData, stock_actual: parseFloat(e.target.value) || 0 })}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <button
            type="submit"
            disabled={cargando}
            style={{
              backgroundColor: '#fff',
              color: '#12131c',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {cargando ? 'Guardando...' : 'Guardar Insumo'}
          </button>

          <button
            type="button"
            onClick={onVolver}
            style={{
              backgroundColor: '#202232',
              color: '#d0d2e0',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: '500',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};