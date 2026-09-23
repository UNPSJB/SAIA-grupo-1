import React, { useState } from 'react';
import { type InsumoQuimico, type InsumoQuimicoUpdateDTO, OPCIONES_TIPO, OPCIONES_UNIDAD } from './tipos';

interface Props {
  insumo: InsumoQuimico;
  onVolver: () => void;
  onActualizado: () => void;
}

export const EditarDetalle: React.FC<Props> = ({ insumo, onVolver, onActualizado }) => {
  const [formData, setFormData] = useState<InsumoQuimicoUpdateDTO>({
    nombre: insumo.nombre,
    tipo: insumo.tipo,
    unidad_medida: insumo.unidad_medida,
    stock_actual: insumo.stock_actual,
    activo: insumo.activo,
  });

  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre?.trim()) {
      setError('El nombre no puede estar vacío.');
      return;
    }
    if ((formData.stock_actual ?? 0) < 0) {
      setError('El stock no puede ser menor a cero.');
      return;
    }

    try {
      const res = await fetch(`http://localhost:8000/api/insumos-quimicos/${insumo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Error al actualizar');
      onActualizado();
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la API');
    }
  };

  return (
    <div className="min-h-screen bg-[#11121c] text-white p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Editar Insumo Químico</h1>
        <p className="text-sm text-gray-400 mt-1">02 · Edición</p>
      </div>

      {error && (
        <div className="max-w-2xl mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleUpdate} className="max-w-2xl space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre</label>
          <input
            type="text"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            className="w-full bg-[#1b1c28] border border-[#292a3b] rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Tipo</label>
          <select
            value={formData.tipo}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
            className="w-full bg-[#1b1c28] border border-[#292a3b] rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none"
          >
            {OPCIONES_TIPO.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Unidad de Medida</label>
          <select
            value={formData.unidad_medida}
            onChange={(e) => setFormData({ ...formData, unidad_medida: e.target.value as any })}
            className="w-full bg-[#1b1c28] border border-[#292a3b] rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none"
          >
            {OPCIONES_UNIDAD.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Stock Actual</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.stock_actual}
            onChange={(e) => setFormData({ ...formData, stock_actual: parseFloat(e.target.value) || 0 })}
            className="w-full bg-[#1b1c28] border border-[#292a3b] rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            className="bg-white text-gray-900 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-gray-200 transition-colors"
          >
            Guardar Cambios
          </button>
          <button
            type="button"
            onClick={onVolver}
            className="bg-[#202231] text-gray-300 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-[#2a2c3f] transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};