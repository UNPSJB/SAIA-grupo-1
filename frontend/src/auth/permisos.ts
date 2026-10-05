import type { Modulo } from '../components/Sidebar';

/** Lo único que ve un operador: el checklist del día. El resto es del administrador. */
const MODULOS_DEL_OPERADOR: readonly Modulo[] = ['checklist'];

export const puedeVerModulo = (modulo: Modulo, esAdministrador: boolean): boolean =>
  esAdministrador || MODULOS_DEL_OPERADOR.includes(modulo);

export const moduloInicial = (esAdministrador: boolean): Modulo =>
  esAdministrador ? 'dashboard' : 'checklist';
