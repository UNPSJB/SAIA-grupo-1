/*
 * Tablas como tarjetas en celular.
 *
 * En pantallas chicas cada fila de las tablas del sistema (.tabla-custom y
 * .tabla-custom-incidentes) se muestra como una tarjeta, con el nombre de la
 * columna al lado de cada dato (ver el final de src/styles/formularioAlta.css).
 *
 * Para eso cada celda necesita saber el nombre de su columna. En lugar de
 * escribirlo a mano en cada vista, esta función lo copia del encabezado (<th>)
 * a un atributo data-label de cada <td>, y lo mantiene al día cuando React
 * agrega o cambia filas.
 *
 * Para que una tabla NO se convierta en tarjetas, agregarle la clase
 * "tabla-sin-tarjetas".
 */

const SELECTOR_TABLAS = 'table.tabla-custom, table.tabla-custom-incidentes';

function etiquetarTabla(tabla: HTMLTableElement) {
  const filaEncabezado = tabla.tHead?.rows[tabla.tHead.rows.length - 1];
  if (!filaEncabezado) return;

  // nombre de cada columna, contando las celdas de encabezado que ocupan varias,
  // y cuáles son de acciones (sus botones van al pie de la tarjeta)
  const nombres: string[] = [];
  const esAcciones: boolean[] = [];
  for (const th of Array.from(filaEncabezado.cells)) {
    const texto = (th.textContent ?? '').trim();
    const acciones = th.classList.contains('acciones-col') || /^acci[oó]n(es)?$/i.test(texto);
    for (let i = 0; i < th.colSpan; i++) {
      nombres.push(texto);
      esAcciones.push(acciones);
    }
  }

  for (const cuerpo of Array.from(tabla.tBodies)) {
    for (const fila of Array.from(cuerpo.rows)) {
      let columna = 0;
      for (const celda of Array.from(fila.cells)) {
        // una celda que ocupa toda la fila (cargando, sin datos) no lleva nombre
        const ocupaFila = celda.colSpan > 1;
        const nombre = ocupaFila ? '' : nombres[columna] ?? '';
        if (celda.getAttribute('data-label') !== nombre) {
          celda.setAttribute('data-label', nombre);
        }
        celda.toggleAttribute('data-acciones', !ocupaFila && (esAcciones[columna] ?? false));
        columna += celda.colSpan;
      }
    }
  }
}

function etiquetarTodas() {
  document.querySelectorAll<HTMLTableElement>(SELECTOR_TABLAS).forEach(etiquetarTabla);
}

export function iniciarTablasResponsive() {
  let pendiente = false;
  const programar = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      etiquetarTodas();
    });
  };

  // solo cambios de estructura y de texto; los data-label que pone esta función no la vuelven a disparar
  new MutationObserver(programar).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  programar();
}
