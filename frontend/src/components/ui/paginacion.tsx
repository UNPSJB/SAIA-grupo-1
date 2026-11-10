export { usePaginacion } from './usePaginacion';
import React from 'react';
import '../../styles/formularioAlta.css';



interface PaginacionProps {
  paginaActual: number;
  totalPaginas: number;
  totalRegistros: number;
  indiceInicio: number;
  indiceFin: number;
  filasPorPagina: number;
  onCambiarPagina: (pagina: number) => void;
  onCambiarFilasPorPagina: (filas: number) => void;
  etiqueta?: string;
}

type ItemPaginacion = number | 'ellipsis-izq' | 'ellipsis-der';

const obtenerItemsPaginacion = (actual: number, total: number): ItemPaginacion[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (actual <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-der', total];
  }
  if (actual >= total - 3) {
    return [1, 'ellipsis-izq', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, 'ellipsis-izq', actual - 1, actual, actual + 1, 'ellipsis-der', total];
};

export const Paginacion: React.FC<PaginacionProps> = ({
  paginaActual,
  totalPaginas,
  totalRegistros,
  indiceInicio,
  indiceFin,
  filasPorPagina,
  onCambiarPagina,
  onCambiarFilasPorPagina,
  etiqueta = 'registros',
}) => {
  if (totalRegistros === 0) return null;

  const paginaValida = Math.min(Math.max(1, paginaActual), totalPaginas);
  const itemsPagina = obtenerItemsPaginacion(paginaValida, totalPaginas);

  return (
    <div className="saia-paginacion-container" role="navigation" aria-label="Paginación de tabla">
      <div className="saia-paginacion-info">
        <div className="saia-paginacion-resumen">
          <span className="saia-paginacion-dot" aria-hidden="true" />
          <span>
            Mostrando <strong>{indiceInicio + 1}–{indiceFin}</strong> de{' '}
            <strong>{totalRegistros}</strong> {etiqueta}
          </span>
        </div>

        <span className="saia-paginacion-divider" aria-hidden="true" />

        <div className="saia-paginacion-filas">
          <label className="saia-paginacion-label">Filas por página</label>
          <select
            className="saia-select-filas"
            value={filasPorPagina}
            onChange={(e) => onCambiarFilasPorPagina(Number(e.target.value))}
            aria-label="Filas por página"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="saia-paginacion-derecha">
        <span className="saia-paginacion-indicador-pagina">
          Página <strong>{paginaValida}</strong> de <strong>{totalPaginas}</strong>
        </span>

        <div className="saia-paginacion-controles">
          <button
            type="button"
            className="saia-btn-pag saia-btn-pag-icono"
            onClick={() => onCambiarPagina(1)}
            disabled={paginaValida <= 1}
            title="Primera página"
            aria-label="Primera página"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
          </button>

          <button
            type="button"
            className="saia-btn-pag"
            onClick={() => onCambiarPagina(Math.max(1, paginaValida - 1))}
            disabled={paginaValida <= 1}
            title="Página anterior"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Anterior</span>
          </button>

          <div className="saia-paginacion-numeros">
            {itemsPagina.map((item) =>
              typeof item === 'string' ? (
                <span key={item} className="saia-paginacion-ellipsis" aria-hidden="true">
                  •••
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={`saia-btn-pag-num ${item === paginaValida ? 'activo' : ''}`}
                  onClick={() => onCambiarPagina(item)}
                  aria-current={item === paginaValida ? 'page' : undefined}
                >
                  {item}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            className="saia-btn-pag"
            onClick={() => onCambiarPagina(Math.min(totalPaginas, paginaValida + 1))}
            disabled={paginaValida >= totalPaginas}
            title="Página siguiente"
          >
            <span>Siguiente</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button
            type="button"
            className="saia-btn-pag saia-btn-pag-icono"
            onClick={() => onCambiarPagina(totalPaginas)}
            disabled={paginaValida >= totalPaginas}
            title="Última página"
            aria-label="Última página"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7" />
              <polyline points="6 17 11 12 6 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

