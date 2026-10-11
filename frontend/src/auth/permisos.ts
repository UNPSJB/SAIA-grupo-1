import type { Modulo } from '../components/Sidebar';

/** Lo que ve un operador: el checklist del día, documentos vigentes y reportar incidentes. El resto es del administrador. */
const MODULOS_DEL_OPERADOR: readonly Modulo[] = ['checklist', 'documentos', 'incidentes'];

export const puedeVerModulo = (modulo: Modulo, esAdministrador: boolean): boolean =>
  esAdministrador || MODULOS_DEL_OPERADOR.includes(modulo);

export const moduloInicial = (esAdministrador: boolean): Modulo =>
  esAdministrador ? 'dashboard' : 'checklist';
