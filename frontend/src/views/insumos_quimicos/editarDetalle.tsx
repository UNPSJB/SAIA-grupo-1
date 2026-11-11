import React, { useEffect, useState } from 'react';
import type { InsumoQuimico, TipoQuimico } from './tipos';
import { OPCIONES_TIPO } from './tipos';
import type { UnidadMedidaItem } from '../unidadesMedida/tipos';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';

interface Props {
  insumo: InsumoQuimico;
  onVolver: () => void;
  onActualizado: () => void;
}

export const EditarDetalle: React.FC<Props> = ({ insumo, onVolver, onActualizado }) => {
  const [unidades, setUnidades] = useState<UnidadMedidaItem[]>([]);
  const [formData, setFormData] = useState<{
    nombre: string;
    tipo: TipoQuimico;
    unidad_medida_id: number | '';
    stock_actual: string;
    proveedor: string;
  }>({
    nombre: insumo.nombre,
    tipo: insumo.tipo,
    unidad_medida_id: insumo.unidad_medida_id ?? '',
    stock_actual: String(insumo.stock_actual),
    proveedor: insumo.proveedor || '',
  });

  useEffect(() => {
    let cancelado = false;
    async function cargarUnidades() {
      try {
        const res = await apiFetch('/unidades-medida/?solo_activos=false');
        if (!cancelado && res.ok) {
          const data: UnidadMedidaItem[] = await res.json();
          setUnidades(data);
          setFormData((prev) => {
            if (prev.unidad_medida_id !== '') return prev;
            const coincidencia = data.find(
              (u) =>
                u.abreviatura.toUpperCase() === (insumo.unidad_medida || '').toUpperCase() ||
                u.nombre.toLowerCase() === (insumo.unidad_medida || '').toLowerCase()
            );
            return coincidencia ? { ...prev, unidad_medida_id: coincidencia.id } : prev;
          });
        }
      } catch {
        if (!cancelado) setUnidades([]);
      }
    }
    cargarUnidades();
    return () => {
      cancelado = true;
    };
  }, [insumo.unidad_medida]);

  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nombre.trim()) {
      setError('El nombre no puede estar vacío.');
      return;
    }

    if (!formData.unidad_medida_id) {
      setError('Debe seleccionar una unidad de medida.');
      return;
    }

    const valorStock = parseFloat(formData.stock_actual);
    if (formData.stock_actual === '' || isNaN(valorStock) || valorStock <= 0) {
      setError('Las existencias deben ser mayores a cero.');
      return;
    }

    try {
      setCargando(true);
      const res = await apiFetch(`/api/insumos-quimicos/${insumo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          tipo: formData.tipo,
          unidad_medida_id: Number(formData.unidad_medida_id),
          stock_actual: valorStock,
          proveedor: formData.proveedor.trim() || null,
          activo: insumo.activo,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Error al actualizar el insumo');
      }

      onActualizado();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
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
          <label htmlFor="unidad_medida_id">Unidad de Medida</label>
          <select
            id="unidad_medida_id"
            value={formData.unidad_medida_id}
            onChange={(e) => setFormData({ ...formData, unidad_medida_id: e.target.value ? Number(e.target.value) : '' })}
            required
          >
            <option value="" disabled>Seleccione una unidad</option>
            {unidades
              .filter((opt) => opt.activo || opt.id === Number(formData.unidad_medida_id))
              .map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.nombre} ({opt.abreviatura})
                </option>
              ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="proveedor">Proveedor (Opcional)</label>
          <input
            id="proveedor"
            type="text"
            placeholder="Ej. Diversey, Spartan Chemical, Ecolab..."
            value={formData.proveedor}
            onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
          />
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
