import React, { useState } from 'react';
import '../../styles/formularioAlta.css';
import '../../styles/rotulado.css';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { nuevaVersion } from './api';
import type { Conjunto, ConjuntoResumen } from './tipos';

interface NuevaVersionDialogProps {
  origen: ConjuntoResumen | null;
  onCancel: () => void;
  onCreada: (conjunto: Conjunto) => void;
}

/** Crea un borrador nuevo a partir de un conjunto: el backend copia las reglas, acá se piden los datos de la versión. */
export const NuevaVersionDialog: React.FC<NuevaVersionDialogProps> = ({ origen, onCancel, onCreada }) => {
  return (
    <Dialog open={Boolean(origen)} onOpenChange={(abierto) => !abierto && onCancel()}>
      <DialogContent size="default">
        {origen && <Formulario key={origen.id} origen={origen} onCancel={onCancel} onCreada={onCreada} />}
      </DialogContent>
    </Dialog>
  );
};

const Formulario: React.FC<{ origen: ConjuntoResumen } & Omit<NuevaVersionDialogProps, 'origen'>> = ({
  origen,
  onCancel,
  onCreada,
}) => {
  const [version, setVersion] = useState('');
  const [fechaVigencia, setFechaVigencia] = useState('');
  const [normaOrigen, setNormaOrigen] = useState(origen.norma_origen);
  const [descripcion, setDescripcion] = useState(`Basada en la versión ${origen.version}`);
  const [errores, setErrores] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const faltan: string[] = [];
    if (!version.trim()) faltan.push('Indicá la versión.');
    if (!fechaVigencia) faltan.push('Indicá la fecha de vigencia.');
    if (normaOrigen.trim().length < 3) faltan.push('La norma de origen debe tener al menos 3 caracteres.');
    setErrores(faltan);
    if (faltan.length) return;

    setGuardando(true);
    try {
      const creado = await nuevaVersion(origen.id, {
        version: version.trim(),
        fecha_vigencia: fechaVigencia,
        norma_origen: normaOrigen.trim(),
        descripcion: descripcion.trim() || null,
      });
      onCreada(creado);
    } catch (err) {
      setErrores([(err as Error).message]);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar}>
      <DialogHeader>
        <DialogTitle>Nueva versión de parámetros</DialogTitle>
        <DialogDescription>
          Se crea un borrador con las reglas de la versión {origen.version}. Después podés ajustar los umbrales y
          publicarlo.
        </DialogDescription>
      </DialogHeader>

      <div style={{ marginTop: '1rem' }}>
        {errores.length > 0 && (
          <ul className="rot-errores">
            {errores.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
        <div className="form-group">
          <label htmlFor="nv-version">Versión *</label>
          <input id="nv-version" maxLength={20} value={version} onChange={(e) => setVersion(e.target.value)} placeholder="Ej.: 2024.1" />
        </div>
        <div className="form-group">
          <label htmlFor="nv-fecha">Fecha de vigencia *</label>
          <input id="nv-fecha" type="date" value={fechaVigencia} onChange={(e) => setFechaVigencia(e.target.value)} />
          <span className="rot-texto-sec">Debe ser posterior a la del último conjunto publicado.</span>
        </div>
        <div className="form-group">
          <label htmlFor="nv-norma">Norma de origen *</label>
          <input id="nv-norma" maxLength={200} value={normaOrigen} onChange={(e) => setNormaOrigen(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="nv-desc">Descripción</label>
          <textarea id="nv-desc" className="rot-textarea" maxLength={500} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>
      </div>

      <DialogFooter>
        <button type="button" className="btn-cancelar" onClick={onCancel} disabled={guardando}>
          Cancelar
        </button>
        <button type="submit" className="btn-guardar" disabled={guardando}>
          {guardando ? 'Creando...' : 'Crear borrador'}
        </button>
      </DialogFooter>
    </form>
  );
};
