import React from 'react';
import type { InsumoQuimico } from './tipos';

interface Props {
  insumo: InsumoQuimico;
  onVolver: () => void;
  onEditar: () => void;
}

export const VerDetalle: React.FC<Props> = ({ insumo, onVolver, onEditar }) => {
  return (
    <div className="min-h-screen bg-[#11121c] text-white p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Detalle del Insumo Químico</h1>
        <p className="text-sm text-gray-400 mt-1">03 · Consulta</p>
      </div>

      <div className="max-w-xl bg-[#161722] border border-[#232435] rounded-xl p-6 space-y-4">
        <div>
          <span className="text-xs uppercase text-gray-400 font-semibold">Nombre:</span>
          <p className="text-lg font-medium text-gray-100">{insumo.nombre}</p>
        </div>

        <div>
          <span className="text-xs uppercase text-gray-400 font-semibold">Tipo:</span>
          <p className="text-sm text-gray-300">{insumo.tipo}</p>
        </div>

        <div>
          <span className="text-xs uppercase text-gray-400 font-semibold">Stock Actual:</span>
          <p className="text-sm text-gray-300">{insumo.stock_actual} {insumo.unidad_medida}</p>
        </div>

        <div>
          <span className="text-xs uppercase text-gray-400 font-semibold">Estado:</span>
          <div className="mt-1">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                insumo.activo ? 'bg-[#153428] text-[#34d399]' : 'bg-[#371b22] text-[#f87171]'
              }`}
            >
              {insumo.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-6 border-t border-[#232435]">
          <button
            onClick={onEditar}
            className="bg-white text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-gray-200 transition-colors"
          >
            Editar Insumo
          </button>
          <button
            onClick={onVolver}
            className="bg-[#202231] text-gray-300 font-medium px-4 py-2 rounded-lg text-sm hover:bg-[#2a2c3f] transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
};