import type { Modulo } from '../components/Sidebar';

const MODULOS_DEL_OPERADOR: readonly Modulo[] = [
  'checklist',
  'checklistRecetas',
  'documentos',
  'incidentes',
  'produccion',
  'insumos',
];

export const puedeVerModulo = (modulo: Modulo, esAdministrador: boolean): boolean =>
  esAdministrador || MODULOS_DEL_OPERADOR.includes(modulo);

export const moduloInicial = (esAdministrador: boolean): Modulo =>
  esAdministrador ? 'dashboard' : 'checklist';
