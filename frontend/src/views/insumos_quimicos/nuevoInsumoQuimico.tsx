import React, { useState } from 'react';
import type { TipoQuimico, UnidadMedida } from './tipos';
import { OPCIONES_TIPO, OPCIONES_UNIDAD } from './tipos';
import '../../styles/formularioAlta.css';

interface Props {
  onVolver: () => void;
  onCreado: () => void;
}

export const NuevoInsumoQuimico: React.FC<Props> = ({ onVolver, onCreado }) => {
  const [formData, setFormData] = useState<{
    nombre: string;
    tipo: TipoQuimico;
    unidad_medida: UnidadMedida;
    stock_actual: string;
  }>({
    nombre: '',
    tipo: 'DETERGENTE',
    unidad_medida: 'L',
    stock_actual: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nombre.trim()) {
      setError('El nombre del insumo es obligatorio.');
      return;
    }

    const valorStock = parseFloat(formData.stock_actual);
    if (formData.stock_actual === '' || isNaN(valorStock) || valorStock <= 0) {
      setError('Las existencias iniciales deben ser mayores a cero.');
      return;
    }

    try {
      setCargando(true);
      const res = await fetch('http://localhost:8000/api/insumos-quimicos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          tipo: formData.tipo,
          unidad_medida: formData.unidad_medida,
          stock_actual: valorStock,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Error al guardar el insumo');
      }

      onCreado();
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el backend');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Nuevo Insumo Químico</h1>
        <div className="subtitulo">02 · Formulario</div>
      </div>

      {error && <div className="alerta-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            type="text"
            placeholder="Introduce el nombre"
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
          <label htmlFor="stock_actual">Existencias Iniciales</label>
          <input
            id="stock_actual"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Introduzca la cantidad (mayor a 0)"
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
