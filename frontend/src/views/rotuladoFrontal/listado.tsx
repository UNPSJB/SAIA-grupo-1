import React, { useCallback, useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import '../../styles/rotulado.css';
import { ConfirmAlertDialog, ErrorAlertDialog, SuccessAlertDialog } from '../../components/ui/alert-dialog';
import { Paginacion } from '../../components/ui/paginacion';
import { usePaginacion } from '../../components/ui/usePaginacion';
import { eliminarConjunto, listarConjuntos, publicarConjunto } from './api';
import { InterruptorModulo } from './InterruptorModulo';
import { NuevaVersionDialog } from './NuevaVersionDialog';
import { formatearFecha, type Conjunto, type ConjuntoResumen, type EstadoConjunto } from './tipos';

interface ListadoParametrosProps {
  onNuevoClick: () => void;
  onVerClick: (id: number) => void;
  onEditarClick: (id: number) => void;
}

type AccionPendiente = { tipo: 'publicar' | 'eliminar'; conjunto: ConjuntoResumen };

export const EstadoConjuntoChip: React.FC<{ conjunto: ConjuntoResumen }> = ({ conjunto }) => (
  <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
    <span className={`rot-chip ${conjunto.estado === 'BORRADOR' ? 'rot-chip--borrador' : 'rot-chip--publicado'}`}>
      {conjunto.estado === 'BORRADOR' ? 'Borrador' : 'Publicado'}
    </span>
    {conjunto.es_vigente && <span className="rot-chip rot-chip--vigente">Vigente</span>}
  </span>
);

export const ListadoParametros: React.FC<ListadoParametrosProps> = ({ onNuevoClick, onVerClick, onEditarClick }) => {
  const [conjuntos, setConjuntos] = useState<ConjuntoResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | EstadoConjunto>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [accion, setAccion] = useState<AccionPendiente | null>(null);
  const [origenVersion, setOrigenVersion] = useState<ConjuntoResumen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setConjuntos(await listarConjuntos());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const ejecutarAccion = async () => {
    if (!accion) return;
    const { tipo, conjunto } = accion;
    setAccion(null);
    try {
      if (tipo === 'publicar') {
        await publicarConjunto(conjunto.id);
        setExito(`La versión ${conjunto.version} quedó publicada.`);
      } else {
        await eliminarConjunto(conjunto.id);
        setExito(`El borrador ${conjunto.version} fue eliminado.`);
      }
      await cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const filtrados = conjuntos.filter((c) => {
    const term = busqueda.toLowerCase().trim();
    const coincide =
      !term ||
      c.version.toLowerCase().includes(term) ||
      c.norma_origen.toLowerCase().includes(term) ||
      (c.descripcion || '').toLowerCase().includes(term);
    return coincide && (filtroEstado === 'TODOS' || c.estado === filtroEstado);
  });

  const {
    itemsPaginados,
    paginaActual,
    setPaginaActual,
    filasPorPagina,
    setFilasPorPagina,
    totalRegistros,
    totalPaginas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(filtrados);

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1>Rotulado Frontal</h1>
          <div className="subtitulo">Parámetros normativos de los sellos de advertencia</div>
        </div>
        <button className="btn-guardar" onClick={onNuevoClick}>
          + Nuevo conjunto
        </button>
      </div>

      <InterruptorModulo />

      <div className="filtros-top-bar">
        <input
          type="text"
          className="input-busqueda"
          placeholder="Buscar por versión, norma o descripción..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          className="select-filtro"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as 'TODOS' | EstadoConjunto)}
        >
          <option value="TODOS">Todos los estados</option>
          <option value="BORRADOR">Borradores</option>
          <option value="PUBLICADO">Publicados</option>
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Versión</th>
              <th>Fecha de vigencia</th>
              <th>Norma de origen</th>
              <th>Estado</th>
              <th>Cálculos</th>
              <th className="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando parámetros...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  {busqueda || filtroEstado !== 'TODOS'
                    ? 'No hay conjuntos que coincidan con los filtros.'
                    : 'No hay conjuntos de parámetros cargados.'}
                </td>
              </tr>
            ) : (
              itemsPaginados.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.version}</td>
                  <td>{formatearFecha(c.fecha_vigencia)}</td>
                  <td>{c.norma_origen}</td>
                  <td>
                    <EstadoConjuntoChip conjunto={c} />
                  </td>
                  <td>{c.cantidad_calculos}</td>
                  <td className="acciones-col">
                    <div className="acciones-btns">
                      <button className="btn-icon btn-ver" title="Ver detalle" onClick={() => onVerClick(c.id)}>
                        <span className="material-symbols-outlined">visibility</span>
                      </button>
                      {c.estado === 'BORRADOR' ? (
                        <>
                          <button className="btn-icon btn-editar" title="Editar borrador" onClick={() => onEditarClick(c.id)}>
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button
                            className="btn-icon btn-reactivar"
                            title="Publicar"
                            onClick={() => setAccion({ tipo: 'publicar', conjunto: c })}
                          >
                            <span className="material-symbols-outlined">publish</span>
                          </button>
                          <button
                            className="btn-icon btn-eliminar"
                            title="Eliminar borrador"
                            onClick={() => setAccion({ tipo: 'eliminar', conjunto: c })}
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </>
                      ) : (
                        <button className="btn-icon btn-editar" title="Crear nueva versión" onClick={() => setOrigenVersion(c)}>
                          ⧉
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
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
        etiqueta="conjuntos"
      />

      <NuevaVersionDialog
        origen={origenVersion}
        onCancel={() => setOrigenVersion(null)}
        onCreada={(creado: Conjunto) => {
          setOrigenVersion(null);
          onEditarClick(creado.id);
        }}
      />

      <ConfirmAlertDialog
        open={Boolean(accion)}
        title={accion?.tipo === 'publicar' ? '¿Publicar estos parámetros?' : '¿Eliminar el borrador?'}
        description={
          accion?.tipo === 'publicar'
            ? `La versión ${accion.conjunto.version} entrará en vigencia el ${formatearFecha(accion.conjunto.fecha_vigencia)}. Una vez publicada no se puede modificar ni eliminar.`
            : `Se eliminará el borrador ${accion?.conjunto.version ?? ''}. Esta acción no se puede deshacer.`
        }
        confirmText={accion?.tipo === 'publicar' ? 'Publicar' : 'Eliminar'}
        cancelText="Cancelar"
        isDestructive={accion?.tipo === 'eliminar'}
        onConfirm={ejecutarAccion}
        onCancel={() => setAccion(null)}
      />

      <SuccessAlertDialog open={Boolean(exito)} title="Listo" description={exito || ''} onClose={() => setExito(null)} />
      <ErrorAlertDialog open={Boolean(error)} description={error || ''} onClose={() => setError(null)} />
    </div>
  );
};
