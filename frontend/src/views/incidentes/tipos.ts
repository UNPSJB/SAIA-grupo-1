// Mismos límites que el backend (src/incidentes/constants.py)
export const DESCRIPCION_MAX = 500;
export const FOTO_MAX_BYTES = 5 * 1024 * 1024;
export const TIPOS_FOTO = ['image/jpeg', 'image/png'];

/** Arma un mensaje legible a partir de la respuesta de error del backend. */
export const mensajeDeError = (detalle: unknown, porDefecto: string): string => {
  if (typeof detalle === 'string') return detalle;
  if (Array.isArray(detalle)) {
    return detalle.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(', ');
  }
  return porDefecto;
};
