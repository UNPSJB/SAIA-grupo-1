import { useState } from 'react';

export function usePaginacion<T>(items: T[], filasIniciales: number = 10) {
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const [filasPorPagina, setFilasPorPagina] = useState<number>(filasIniciales);
  const [prevItemsLength, setPrevItemsLength] = useState(items.length);
  const [prevFilasPorPagina, setPrevFilasPorPagina] = useState(filasIniciales);

  if (items.length !== prevItemsLength || filasPorPagina !== prevFilasPorPagina) {
    setPrevItemsLength(items.length);
    setPrevFilasPorPagina(filasPorPagina);
    setPaginaActual(1);
  }

  const totalRegistros = items.length;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / filasPorPagina));
  const paginaValida = Math.min(Math.max(1, paginaActual), totalPaginas);
  const indiceInicio = (paginaValida - 1) * filasPorPagina;
  const indiceFin = Math.min(indiceInicio + filasPorPagina, totalRegistros);
  const itemsPaginados = items.slice(indiceInicio, indiceFin);

  return {
    itemsPaginados,
    paginaActual: paginaValida,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  };
}

