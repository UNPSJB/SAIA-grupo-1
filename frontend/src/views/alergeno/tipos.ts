export interface Alergeno {
  id: number;
  nombre: string;
  simbolo: string;
}

export interface AlergenoCreate {
  nombre: string;
  simbolo: string;
}

export interface AlergenoUpdate {
  nombre?: string;
  simbolo?: string;
}

export interface SimboloAlergenoOption {
  etiqueta: string;
  ruta: string;
}

// Agregá acá los demás íconos que guardes en frontend/public/alergenos/
export const SIMBOLOS_ALERGENOS: SimboloAlergenoOption[] = [
  { etiqueta: 'Altramuces', ruta: '/alergenos/IconoAltramucesAlergeno.png' },
  { etiqueta: 'Apio', ruta: '/alergenos/IconoApioAlergeno.png' },
  { etiqueta: 'Cacahuetes', ruta: '/alergenos/IconoCacahueteAlergeno.png' },
  { etiqueta: 'Crustáceos', ruta: '/alergenos/IconoCrustaceoAlergeno.png' },
  { etiqueta: 'Dióxido de azufre y sulfitos', ruta: '/alergenos/IconoDioxidoAzufreSulfitosAlergeno.png' },
  { etiqueta: 'Frutos de cáscara', ruta: '/alergenos/IconoFrutosCascaraAlergeno.png' },
  { etiqueta: 'Contiene Gluten', ruta: '/alergenos/IconoGlutenAlergeno.png' },
  { etiqueta: 'Granos de sésamo', ruta: '/alergenos/IconoGranosSesamoAlergeno.png' },
  { etiqueta: 'Huevos', ruta: '/alergenos/IconoHuevoAlergeno.png' },
  { etiqueta: 'Lácteos', ruta: '/alergenos/IconoLacteosAlergeno.png' },
  { etiqueta: 'Moluscos', ruta: '/alergenos/IconoMoluscosAlergeno.png' },
  { etiqueta: 'Mostaza', ruta: '/alergenos/IconoMostazaAlergeno.png' },
  { etiqueta: 'Pescado', ruta: '/alergenos/IconoPescadoAlergeno.png' },
  { etiqueta: 'Soja', ruta: '/alergenos/IconoSojaAlergeno.png' },
];