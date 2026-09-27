import React, { useState } from 'react';
import type { InsumoQuimico, TipoQuimico, UnidadMedida } from './tipos';
import { OPCIONES_TIPO, OPCIONES_UNIDAD } from './tipos';
import '../../styles/formularioAlta.css';

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

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Editar Insumo Químico</h1>
        <div className="subtitulo">02 · Formulario</div>
      </div>

      {error && <div className="alerta-error">{error}</div>}

      <form onSubmit={handleUpdate}>
        <div className="form-group">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            type="text"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label htmlFor="tipo">Tipo de Químico</label>
          <select
            id="tipo"
            value={formData.tipo}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoQuimico })}
          >
            {OPCIONES_TIPO.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="unidad_medida">Unidad de Medida</label>
          <select
            id="unidad_medida"
            value={formData.unidad_medida}
            onChange={(e) => setFormData({ ...formData, unidad_medida: e.target.value as UnidadMedida })}
          >
            {OPCIONES_UNIDAD.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="stock_actual">Existencias</label>
          <input
            id="stock_actual"
            type="number"
            min="0.01"
            step="0.01"
            value={formData.stock_actual}
            onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })}
          />
        </div>

        <div className="form-acciones">
          <button type="submit" className="btn-guardar" disabled={cargando}>
            {cargando ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" className="btn-cancelar" onClick={onVolver}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};
