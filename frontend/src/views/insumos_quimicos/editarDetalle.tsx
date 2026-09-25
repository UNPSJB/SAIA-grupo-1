import React, { useState } from 'react';
import type { InsumoQuimico, TipoQuimico, UnidadMedida } from './tipos';
import { OPCIONES_TIPO, OPCIONES_UNIDAD } from './tipos';

interface Props {
  insumo: InsumoQuimico;
  onVolver: () => void;
  onActualizado: () => void;
}

export const EditarDetalle: React.FC<Props> = ({ insumo, onVolver, onActualizado }) => {
  const [formData, setFormData] = useState<{
    nombre: string;
    tipo: TipoQuimico;
    unidad_medida: UnidadMedida;
    stock_actual: string;
  }>({
    nombre: insumo.nombre,
    tipo: insumo.tipo,
    unidad_medida: insumo.unidad_medida,
    stock_actual: String(insumo.stock_actual),
  });

  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nombre.trim()) {
      setError('El nombre no puede estar vacío.');
      return;
    }

    const valorStock = parseFloat(formData.stock_actual);
    if (formData.stock_actual === '' || isNaN(valorStock) || valorStock <= 0) {
      setError('Las existencias deben ser mayores a cero.');
      return;
    }

    try {
      setCargando(true);
      const res = await fetch(`http://localhost:8000/api/insumos-quimicos/${insumo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          tipo: formData.tipo,
          unidad_medida: formData.unidad_medida,
          stock_actual: valorStock,
          activo: insumo.activo,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Error al actualizar el insumo');
      }

      onActualizado();
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setCargando(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '700',
    color: '#2b2b2b',
    marginBottom: '8px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: '#faf9f5',
    border: '1px solid #e7e5de',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#333333',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        padding: '20px 0 60px 0',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1
            style={{
              fontSize: '36px',
              fontWeight: '800',
              margin: '0 0 6px 0',
              color: '#2b2b2b',
              letterSpacing: '-0.5px',
            }}
          >
            Editar Insumo Químico
          </h1>
          <span style={{ fontSize: '15px', color: '#6b6b6b', fontWeight: '500' }}>02 · Formulario</span>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#fdeced',
              border: '1px solid #f5c6cb',
              color: '#721c24',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '24px',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div>
            <label style={labelStyle}>Nombre</label>
            <input
              type="text"
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
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {OPCIONES_TIPO.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ backgroundColor: '#faf9f5' }}>
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
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {OPCIONES_UNIDAD.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ backgroundColor: '#faf9f5' }}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Existencias</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={formData.stock_actual}
              onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: '14px', marginTop: '14px' }}>
            <button
              type="submit"
              disabled={cargando}
              style={{
                backgroundColor: '#32322e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 28px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              {cargando ? 'Guardando...' : 'Guardar'}
            </button>

            <button
              type="button"
              onClick={onVolver}
              style={{
                backgroundColor: '#ffffff',
                color: '#32322e',
                border: '1px solid #32322e',
                borderRadius: '8px',
                padding: '12px 28px',
                fontWeight: '500',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};