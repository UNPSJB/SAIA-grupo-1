import React, { useEffect, useState } from 'react';
import type { RecetaConId } from "./tipos";
import '../../styles/formularioAlta.css';
import { Paginacion } from '../../components/ui/paginacion';
import { usePaginacion } from '../../components/ui/usePaginacion';
import { apiFetch } from '../../api/client';
import { descargarCSV } from '../../utils/exportarCsv';
import { ConfirmExportDialog } from '../../components/ui/confirmExportDialog';
import { CsvIcon } from '../../components/icons/CsvIcon';

interface ListadoRecetasProps {
  onNuevoClick?: () => void;
  onDetalleClick?: (id: number) => void;
  onEditarClick?: (id: number) => void;
}

export const ListadoRecetas: React.FC<ListadoRecetasProps> = ({
  onNuevoClick,
  onDetalleClick,
  onEditarClick,
}) => {
  const [recetas, setRecetas] = useState<RecetaConId[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [dialogExportarAbierto, setDialogExportarAbierto] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroVigencia, setFiltroVigencia] = useState('TODOS');
  const [filtroAditivos, setFiltroAditivos] = useState('TODOS');

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await apiFetch(`/recetas/`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore) setRecetas(data);
        } else {
          if (!ignore) setRecetas([]);
        }
      } catch {
        if (!ignore) setRecetas([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const recetasFiltradas = recetas.filter((r) => {
    const term = busqueda.toLowerCase().trim();
    const etapas = r.detalles ?? r.version_actual?.detalles ?? [];

    const coincideBusqueda =
      !term ||
      (r.nombre?.toLowerCase().includes(term) ?? false) ||
      etapas.some(
        (d) =>
          (d.nombre?.toLowerCase().includes(term) ?? false) ||
          (d.nombre_ingrediente?.toLowerCase().includes(term) ?? false) ||
          (d.nombre_operario?.toLowerCase().includes(term) ?? false)
      );

    const tieneVersionVigente = Boolean(r.version_vigente);
    const coincideVigencia =
      filtroVigencia === 'TODOS' ||
      (filtroVigencia === 'VIGENTES' ? tieneVersionVigente : !tieneVersionVigente);

    const tieneAditivos = etapas.some((d) => d.es_aditivo);
    const coincideAditivos =
      filtroAditivos === 'TODOS' ||
      (filtroAditivos === 'CON_ADITIVOS' ? tieneAditivos : !tieneAditivos);

    return coincideBusqueda && coincideVigencia && coincideAditivos;
  });

  const ejecutarExportacion = async () => {
    try {
      setExportando(true);

      const params = new URLSearchParams();
      if (busqueda.trim()) params.append('busqueda', busqueda.trim());
      if (filtroVigencia !== 'TODOS') params.append('vigencia', filtroVigencia);
      if (filtroAditivos !== 'TODOS') params.append('aditivos', filtroAditivos);

      const queryString = params.toString();
      const url = `/recetas/exportar-csv${queryString ? `?${queryString}` : ''}`;

      await descargarCSV(url, "recetas.csv");
      setDialogExportarAbierto(false);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Error al exportar las recetas a CSV."
      );
    } finally {
      setExportando(false);
    }
  };

  const obtenerResumenFiltros = () => {
    const partes: string[] = [];
    if (busqueda.trim()) partes.push(`Búsqueda: "${busqueda}"`);
    if (filtroVigencia !== 'TODOS') partes.push(`Estado: ${filtroVigencia}`);
    if (filtroAditivos !== 'TODOS') partes.push(`Aditivos: ${filtroAditivos}`);
    return partes.length > 0 ? partes.join(' | ') : 'Sin filtros aplicados';
  };

  const {
    itemsPaginados: recetasPaginadas,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(recetasFiltradas);

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Lista de Recetas</h1>
          <div className="subtitulo">01 · Listado</div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setDialogExportarAbierto(true)}
            className="btn-cancelar"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <CsvIcon /> Exportar CSV
          </button>

          {onNuevoClick && (
            <button onClick={onNuevoClick} className="btn-guardar">
              + Crear Receta
            </button>
          )}
        </div>
      </div>

      <div className="filtros-top-bar">
        <input
          type="text"
          className="input-busqueda"
          placeholder="Buscar por receta, etapa, ingrediente u operario..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <select
          value={filtroVigencia}
          onChange={(e) => setFiltroVigencia(e.target.value)}
          className="select-filtro"
        >
          <option value="TODOS">Todas las recetas</option>
          <option value="VIGENTES">Con versión vigente</option>
          <option value="NO_VIGENTES">Sin versión vigente / Vencidas</option>
        </select>

        <select
          value={filtroAditivos}
          onChange={(e) => setFiltroAditivos(e.target.value)}
          className="select-filtro"
        >
          <option value="TODOS">Con y sin aditivos</option>
          <option value="CON_ADITIVOS">Con aditivos</option>
          <option value="SIN_ADITIVOS">Sin aditivos</option>
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Rendimiento Final</th>
              <th>Versión Actual</th>
              <th>Etapas</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando Recetas...
                </td>
              </tr>
            ) : recetasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  {busqueda || filtroVigencia !== 'TODOS' || filtroAditivos !== 'TODOS'
                    ? 'No se encontraron recetas que coincidan con los filtros.'
                    : 'No hay recetas registradas.'}
                </td>
              </tr>
            ) : (
              recetasPaginadas.map((r) => {
                const cantEtapas = r.detalles?.length ?? r.version_actual?.detalles?.length ?? 0;
                const verNum = r.version_actual?.version ?? 1;
                const esVigente = Boolean(r.version_vigente);

                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.nombre}</td>
                    <td>{r.rendimiento_final}</td>
                    <td>
                      v{verNum} {esVigente ? '(Vigente)' : '(No vigente)'}
                    </td>
                    <td>{cantEtapas}</td>
                    <td className="acciones-col">
                      <div className="acciones-btns">
                        <button
                          className="btn-icon btn-ver"
                          title="Ver detalles"
                          onClick={() => onDetalleClick?.(r.id)}
                        >
                          👁
                        </button>
                        <button
                          className="btn-icon btn-editar"
                          title="Editar"
                          onClick={() => onEditarClick?.(r.id)}
                        >
                          ✎
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Paginacion
        paginaActual={paginaActual}
        totalPaginas={totalPaginas}
        totalRegistros={totalRegistros}
        indiceInicio={indiceInicio}
        indiceFin={indiceFin}
        filasPorPagina={filasPorPagina}
        onCambiarPagina={setPaginaActual}
        onCambiarFilasPorPagina={setFilasPorPagina}
        etiqueta="recetas"
      />

      <ConfirmExportDialog
        open={dialogExportarAbierto}
        totalRegistros={recetasFiltradas.length}
        filtrosAplicados={obtenerResumenFiltros()}
        loading={exportando}
        onConfirm={ejecutarExportacion}
        onCancel={() => setDialogExportarAbierto(false)}
      />
    </div>
  );
};