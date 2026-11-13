import type { Modulo } from '../components/Sidebar';

/** Lo que ve un operador: el checklist del día, documentos vigentes, reportar incidentes y registrar lotes. El resto es del administrador. */
const MODULOS_DEL_OPERADOR: readonly Modulo[] = ['checklist', 'documentos', 'incidentes', 'produccion'];

export const puedeVerModulo = (modulo: Modulo, esAdministrador: boolean): boolean =>
  esAdministrador || MODULOS_DEL_OPERADOR.includes(modulo);

// 'configuraciones' y sus pantallas no están en MODULOS_DEL_OPERADOR: solo las ve el administrador
/** Pantallas que se abren desde Configuraciones: en el menú se marca "Configuraciones" como activo. */
export const MODULOS_DE_CONFIGURACION: readonly Modulo[] = ['sectores', 'tipoCertificado', 'tipoDocumento', 'motivos', 'vistaPublica'];

export const moduloInicial = (esAdministrador: boolean): Modulo =>
  esAdministrador ? 'dashboard' : 'checklist';
