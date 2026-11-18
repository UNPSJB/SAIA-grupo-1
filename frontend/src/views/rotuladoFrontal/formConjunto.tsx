import React, { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import '../../styles/rotulado.css';
import { actualizarConjunto, crearConjunto, obtenerConjunto } from './api';
import {
  COMPARADORES,
  NUTRIENTES,
  SIMBOLO_COMPARADOR,
  TIPOS_CONDICION,
  type Comparador,
  type ConjuntoCreate,
  type EstadoFisico,
  type Nutriente,
  type TipoCondicion,
} from './tipos';

interface FormConjuntoProps {
  /** null: alta de un conjunto nuevo; con id: edición de un borrador */
  conjuntoId: number | null;
  onGuardado: (id: number) => void;
  onCancel: () => void;
}

// En el formulario los números se editan como texto para poder dejar el campo vacío mientras se escribe.
interface CondicionForm {
  tipo: TipoCondicion;
  nutriente: Nutriente;
  factor_kcal: string;
  comparador: Comparador;
  umbral: string;
  estado_fisico: '' | EstadoFisico;
}

interface AplicabilidadForm {
  campo: Nutriente;
  comparador: Comparador;
  valor: string;
}

interface ReglaForm {
  clave: number;
  codigo: string;
  leyenda: string;
  orden: string;
  activa: boolean;
  condiciones: CondicionForm[];
  aplicabilidad: AplicabilidadForm[];
}

let siguienteClave = 1;

const condicionVacia = (): CondicionForm => ({
  tipo: 'CANTIDAD_POR_100',
  nutriente: 'sodio_mg',
  factor_kcal: '',
  comparador: '>=',
  umbral: '',
  estado_fisico: '',
});

const reglaVacia = (orden: number): ReglaForm => ({
  clave: siguienteClave++,
  codigo: '',
  leyenda: 'EXCESO EN ',
  orden: String(orden),
  activa: true,
  condiciones: [condicionVacia()],
  aplicabilidad: [],
});

const esNumero = (v: string) => v.trim() !== '' && !Number.isNaN(Number(v));
const normalizarCodigo = (v: string) => v.trim().toUpperCase().split(/\s+/).filter(Boolean).join('_');

/** Repite las validaciones del backend para avisar antes de enviar. */
const validar = (
  version: string,
  fechaVigencia: string,
  normaOrigen: string,
  reglas: ReglaForm[],
): string[] => {
  const errores: string[] = [];
  if (!version.trim()) errores.push('Indicá la versión.');
  if (!fechaVigencia) errores.push('Indicá la fecha de vigencia.');
  if (normaOrigen.trim().length < 3) errores.push('La norma de origen debe tener al menos 3 caracteres.');

  const codigos = reglas.map((r) => normalizarCodigo(r.codigo));
  reglas.forEach((r, i) => {
    const n = `Regla ${i + 1}`;
    if (!codigos[i]) errores.push(`${n}: falta el código.`);
    if (!r.leyenda.trim()) errores.push(`${n}: falta la leyenda del sello.`);
    if (!/^-?\d+$/.test(r.orden.trim())) errores.push(`${n}: el orden debe ser un número entero.`);
    if (r.condiciones.length === 0) errores.push(`${n}: necesita al menos una condición.`);
    r.condiciones.forEach((c, j) => {
      const nc = `${n}, condición ${j + 1}`;
      if (!esNumero(c.umbral) || Number(c.umbral) < 0) errores.push(`${nc}: el umbral debe ser un número mayor o igual a 0.`);
      if (c.tipo !== 'CANTIDAD_POR_100' && c.nutriente === 'energia_kcal')
        errores.push(`${nc}: la energía no puede compararse contra sí misma.`);
      if (c.tipo === 'PORCENTAJE_ENERGIA' && (!esNumero(c.factor_kcal) || Number(c.factor_kcal) <= 0))
        errores.push(`${nc}: indicá las kcal por gramo del nutriente (4 para azúcares, 9 para grasas).`);
    });
    r.aplicabilidad.forEach((a, j) => {
      if (!esNumero(a.valor)) errores.push(`${n}, aplicabilidad ${j + 1}: el valor debe ser un número.`);
    });
  });
  const repetidos = codigos.filter((c, i) => c && codigos.indexOf(c) !== i);
  if (repetidos.length) errores.push(`Hay reglas con el mismo código: ${[...new Set(repetidos)].join(', ')}.`);
  return errores;
};

export const FormConjunto: React.FC<FormConjuntoProps> = ({ conjuntoId, onGuardado, onCancel }) => {
  const esEdicion = conjuntoId != null;
  const [cargando, setCargando] = useState(esEdicion);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [version, setVersion] = useState('');
  const [fechaVigencia, setFechaVigencia] = useState('');
  const [normaOrigen, setNormaOrigen] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [reglas, setReglas] = useState<ReglaForm[]>([]);
  const [errores, setErrores] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (conjuntoId == null) return;
    let cancelado = false;
    obtenerConjunto(conjuntoId)
      .then((c) => {
        if (cancelado) return;
        if (c.estado !== 'BORRADOR') {
          setErrorCarga('Un conjunto publicado no se puede modificar; creá una nueva versión.');
          return;
        }
        setVersion(c.version);
        setFechaVigencia(c.fecha_vigencia);
        setNormaOrigen(c.norma_origen);
        setDescripcion(c.descripcion || '');
        setReglas(
          [...c.reglas]
            .sort((a, b) => a.orden - b.orden)
            .map((r) => ({
              clave: siguienteClave++,
              codigo: r.codigo,
              leyenda: r.leyenda,
              orden: String(r.orden),
              activa: r.activa,
              condiciones: r.condiciones.map((x) => ({
                tipo: x.tipo,
                nutriente: x.nutriente,
                factor_kcal: x.factor_kcal != null ? String(x.factor_kcal) : '',
                comparador: x.comparador,
                umbral: String(x.umbral),
                estado_fisico: x.estado_fisico ?? '',
              })),
              aplicabilidad: r.aplicabilidad.map((a) => ({
                campo: a.campo,
                comparador: a.comparador,
                valor: String(a.valor),
              })),
            })),
        );
      })
      .catch((e: Error) => !cancelado && setErrorCarga(e.message))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [conjuntoId]);

  // --- edición de la lista de reglas ---
  const cambiarRegla = (clave: number, cambios: Partial<ReglaForm>) =>
    setReglas((prev) => prev.map((r) => (r.clave === clave ? { ...r, ...cambios } : r)));

  const cambiarCondicion = (clave: number, j: number, cambios: Partial<CondicionForm>) =>
    setReglas((prev) =>
      prev.map((r) =>
        r.clave === clave ? { ...r, condiciones: r.condiciones.map((c, i) => (i === j ? { ...c, ...cambios } : c)) } : r,
      ),
    );

  const cambiarAplicabilidad = (clave: number, j: number, cambios: Partial<AplicabilidadForm>) =>
    setReglas((prev) =>
      prev.map((r) =>
        r.clave === clave ? { ...r, aplicabilidad: r.aplicabilidad.map((a, i) => (i === j ? { ...a, ...cambios } : a)) } : r,
      ),
    );

  const armarPayload = (): ConjuntoCreate => ({
    version: version.trim(),
    fecha_vigencia: fechaVigencia,
    norma_origen: normaOrigen.trim(),
    descripcion: descripcion.trim() || null,
    reglas: reglas.map((r) => ({
      codigo: normalizarCodigo(r.codigo),
      leyenda: r.leyenda.trim(),
      orden: Number(r.orden),
      activa: r.activa,
      condiciones: r.condiciones.map((c) => ({
        tipo: c.tipo,
        nutriente: c.nutriente,
        factor_kcal: c.tipo === 'PORCENTAJE_ENERGIA' ? Number(c.factor_kcal) : null,
        comparador: c.comparador,
        umbral: Number(c.umbral),
        estado_fisico: c.estado_fisico || null,
      })),
      aplicabilidad: r.aplicabilidad.map((a) => ({ campo: a.campo, comparador: a.comparador, valor: Number(a.valor) })),
    })),
  });

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const encontrados = validar(version, fechaVigencia, normaOrigen, reglas);
    setErrores(encontrados);
    if (encontrados.length) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setGuardando(true);
    try {
      const datos = armarPayload();
      const guardado = esEdicion ? await actualizarConjunto(conjuntoId, datos) : await crearConjunto(datos);
      onGuardado(guardado.id);
    } catch (err) {
      setErrores([(err as Error).message]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <div className="modulo-container" style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</div>;

  if (errorCarga) {
    return (
      <div className="modulo-container">
        <div className="alerta-error">{errorCarga}</div>
        <div className="form-acciones">
          <button type="button" className="btn-cancelar" onClick={onCancel}>
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modulo-container">
      <div className="modulo-header">
        <h1>{esEdicion ? 'Editar borrador de parámetros' : 'Nuevo conjunto de parámetros'}</h1>
        <div className="subtitulo">
          Se guarda como borrador. Los sellos se calculan con el conjunto publicado vigente.
        </div>
      </div>

      <form onSubmit={guardar} noValidate>
        {errores.length > 0 && (
          <ul className="rot-errores alerta-error">
            {errores.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}

        <div className="rot-tarjeta">
          <h2>Datos generales</h2>
          <div className="rot-form-grid">
            <div className="form-group">
              <label htmlFor="cj-version">Versión *</label>
              <input id="cj-version" maxLength={20} value={version} onChange={(e) => setVersion(e.target.value)} placeholder="Ej.: 2024.1" />
            </div>
            <div className="form-group">
              <label htmlFor="cj-fecha">Fecha de vigencia *</label>
              <input id="cj-fecha" type="date" value={fechaVigencia} onChange={(e) => setFechaVigencia(e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="cj-norma">Norma de origen *</label>
              <input
                id="cj-norma"
                maxLength={200}
                value={normaOrigen}
                onChange={(e) => setNormaOrigen(e.target.value)}
                placeholder="Ej.: Ley 27.642 - Decreto 151/2022, Anexo II"
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="cj-desc">Descripción</label>
              <textarea id="cj-desc" className="rot-textarea" maxLength={500} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rot-tarjeta">
          <h2>Reglas ({reglas.length})</h2>
          <p className="rot-texto-sec" style={{ marginTop: 0 }}>
            Cada regla genera un sello. Lleva sello si se cumple <strong>alguna</strong> de sus condiciones, siempre que se
            cumplan <strong>todas</strong> las de aplicabilidad. Para publicar hace falta al menos una regla activa.
          </p>

          {reglas.map((r, i) => (
            <div key={r.clave} className="rot-regla">
              <div className="rot-regla-cabecera">
                <strong>Regla {i + 1}</strong>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <label className="rot-checkbox">
                    <input type="checkbox" checked={r.activa} onChange={(e) => cambiarRegla(r.clave, { activa: e.target.checked })} />
                    Activa
                  </label>
                  <button
                    type="button"
                    className="rot-btn-quitar"
                    title="Quitar regla"
                    onClick={() => setReglas((prev) => prev.filter((x) => x.clave !== r.clave))}
                  >
                    Quitar regla
                  </button>
                </div>
              </div>

              <div className="rot-form-grid">
                <div className="form-group">
                  <label>Código *</label>
                  <input
                    maxLength={40}
                    value={r.codigo}
                    onChange={(e) => cambiarRegla(r.clave, { codigo: e.target.value })}
                    onBlur={(e) => cambiarRegla(r.clave, { codigo: normalizarCodigo(e.target.value) })}
                    placeholder="EXCESO_SODIO"
                  />
                </div>
                <div className="form-group">
                  <label>Leyenda del sello *</label>
                  <input maxLength={60} value={r.leyenda} onChange={(e) => cambiarRegla(r.clave, { leyenda: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Orden</label>
                  <input type="number" step={1} value={r.orden} onChange={(e) => cambiarRegla(r.clave, { orden: e.target.value })} />
                </div>
              </div>

              <div className="rot-subseccion">
                <div className="rot-subseccion-titulo">Condiciones (lleva sello si se cumple alguna)</div>
                {r.condiciones.map((c, j) => (
                  <div key={j} className="rot-fila-condicion">
                    <div>
                      <label>Tipo</label>
                      <select value={c.tipo} onChange={(e) => cambiarCondicion(r.clave, j, { tipo: e.target.value as TipoCondicion })}>
                        {TIPOS_CONDICION.map((t) => (
                          <option key={t.valor} value={t.valor}>
                            {t.etiqueta}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>Nutriente</label>
                      <select value={c.nutriente} onChange={(e) => cambiarCondicion(r.clave, j, { nutriente: e.target.value as Nutriente })}>
                        {NUTRIENTES.map((n) => (
                          <option key={n.valor} value={n.valor}>
                            {n.etiqueta} ({n.unidad})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>Comparador</label>
                      <select value={c.comparador} onChange={(e) => cambiarCondicion(r.clave, j, { comparador: e.target.value as Comparador })}>
                        {COMPARADORES.map((cmp) => (
                          <option key={cmp} value={cmp}>
                            {SIMBOLO_COMPARADOR[cmp]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>Umbral</label>
                      <input type="number" min={0} step="any" value={c.umbral} onChange={(e) => cambiarCondicion(r.clave, j, { umbral: e.target.value })} />
                    </div>
                    <div>
                      <label title="kcal por gramo del nutriente">Factor kcal</label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={c.tipo === 'PORCENTAJE_ENERGIA' ? c.factor_kcal : ''}
                        disabled={c.tipo !== 'PORCENTAJE_ENERGIA'}
                        placeholder={c.tipo === 'PORCENTAJE_ENERGIA' ? '4 ó 9' : 'No aplica'}
                        onChange={(e) => cambiarCondicion(r.clave, j, { factor_kcal: e.target.value })}
                      />
                    </div>
                    <div>
                      <label>Aplica a</label>
                      <select
                        value={c.estado_fisico}
                        onChange={(e) => cambiarCondicion(r.clave, j, { estado_fisico: e.target.value as '' | EstadoFisico })}
                      >
                        <option value="">Sólidos y líquidos</option>
                        <option value="SOLIDO">Solo sólidos</option>
                        <option value="LIQUIDO">Solo líquidos</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      className="rot-btn-quitar"
                      title="Quitar condición"
                      onClick={() => cambiarRegla(r.clave, { condiciones: r.condiciones.filter((_, k) => k !== j) })}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="rot-btn-agregar"
                  onClick={() => cambiarRegla(r.clave, { condiciones: [...r.condiciones, condicionVacia()] })}
                >
                  + Condición
                </button>
              </div>

              <div className="rot-subseccion">
                <div className="rot-subseccion-titulo">Aplicabilidad (opcional: la regla solo se evalúa si se cumplen todas)</div>
                {r.aplicabilidad.map((a, j) => (
                  <div key={j} className="rot-fila-aplicabilidad">
                    <div>
                      <label>Nutriente</label>
                      <select value={a.campo} onChange={(e) => cambiarAplicabilidad(r.clave, j, { campo: e.target.value as Nutriente })}>
                        {NUTRIENTES.map((n) => (
                          <option key={n.valor} value={n.valor}>
                            {n.etiqueta} ({n.unidad})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>Comparador</label>
                      <select
                        value={a.comparador}
                        onChange={(e) => cambiarAplicabilidad(r.clave, j, { comparador: e.target.value as Comparador })}
                      >
                        {COMPARADORES.map((cmp) => (
                          <option key={cmp} value={cmp}>
                            {SIMBOLO_COMPARADOR[cmp]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>Valor</label>
                      <input type="number" step="any" value={a.valor} onChange={(e) => cambiarAplicabilidad(r.clave, j, { valor: e.target.value })} />
                    </div>
                    <button
                      type="button"
                      className="rot-btn-quitar"
                      title="Quitar"
                      onClick={() => cambiarRegla(r.clave, { aplicabilidad: r.aplicabilidad.filter((_, k) => k !== j) })}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="rot-btn-agregar"
                  onClick={() =>
                    cambiarRegla(r.clave, {
                      aplicabilidad: [...r.aplicabilidad, { campo: 'azucares_anadidos', comparador: '>', valor: '0' }],
                    })
                  }
                >
                  + Aplicabilidad
                </button>
              </div>
            </div>
          ))}

          <button type="button" className="rot-btn-agregar" onClick={() => setReglas((prev) => [...prev, reglaVacia(prev.length + 1)])}>
            + Agregar regla
          </button>
        </div>

        <div className="form-acciones">
          <button type="button" className="btn-cancelar" onClick={onCancel} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" className="btn-guardar" disabled={guardando}>
            {guardando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Guardar borrador'}
          </button>
        </div>
      </form>
    </div>
  );
};
