import { jsPDF } from 'jspdf';

export type FormatoGrafico = 'png' | 'jpeg' | 'pdf';

export interface ItemLeyendaGrafico {
  etiqueta: string;
  color: string;
}

export interface ConfiguracionGraficoExportar {
  id: string;
  titulo: string;
  subtitulo?: string;
  filtros?: string;
  contenedor: HTMLElement | null;
  leyenda?: ItemLeyendaGrafico[];
}

interface ImagenRenderizada {
  titulo: string;
  subtitulo?: string;
  filtros?: string;
  dataUrl: string;
  width: number;
  height: number;
}

const resolverVariablesCSS = (valor: string, estilosRoot: CSSStyleDeclaration): string => {
  if (!valor || !valor.includes('var(')) return valor;
  return valor.replace(/var\(\s*(--[^,\s)]+)\s*(?:,\s*([^)]+))?\)/g, (_match, nombreVar, fallback) => {
    const resuelto = estilosRoot.getPropertyValue(nombreVar).trim();
    if (resuelto) {
      return resolverVariablesCSS(resuelto, estilosRoot);
    }
    return fallback ? fallback.trim() : '#64748b';
  });
};

const clonarYResolverSvg = (svgOriginal: SVGSVGElement, estilosRoot: CSSStyleDeclaration): SVGSVGElement => {
  const clon = svgOriginal.cloneNode(true) as SVGSVGElement;
  const rect = svgOriginal.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width || Number(svgOriginal.getAttribute('width')) || 600));
  const height = Math.max(1, Math.round(rect.height || Number(svgOriginal.getAttribute('height')) || 300));

  clon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clon.setAttribute('width', String(width));
  clon.setAttribute('height', String(height));
  if (!clon.getAttribute('viewBox')) {
    clon.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }

  const originales = [svgOriginal, ...Array.from(svgOriginal.querySelectorAll('*'))];
  const clonados = [clon, ...Array.from(clon.querySelectorAll('*'))];

  const attrsColor = ['fill', 'stroke', 'stop-color', 'color'];

  clonados.forEach((el, idx) => {
    const origEl = originales[idx];
    if (!origEl) return;

    // Resolver atributos SVG que tengan var(--...)
    attrsColor.forEach((attr) => {
      const val = el.getAttribute(attr);
      if (val && val.includes('var(')) {
        el.setAttribute(attr, resolverVariablesCSS(val, estilosRoot));
      }
    });

    // Resolver estilos inline que tengan var(--...)
    const styleAttr = el.getAttribute('style');
    if (styleAttr && styleAttr.includes('var(')) {
      el.setAttribute('style', resolverVariablesCSS(styleAttr, estilosRoot));
    }

    // Copiar tipografía y colores computados para textos SVG
    if (el.tagName.toLowerCase() === 'text' || el.tagName.toLowerCase() === 'tspan') {
      const cs = window.getComputedStyle(origEl);
      const htmlEl = el as unknown as HTMLElement;
      htmlEl.style.fontFamily = cs.fontFamily || 'system-ui, -apple-system, sans-serif';
      if (!el.getAttribute('fill') || el.getAttribute('fill')?.includes('var(')) {
        el.setAttribute('fill', cs.fill && cs.fill !== 'none' ? cs.fill : cs.color || '#334155');
      }
    }
  });

  return clon;
};

const svgAImagen = (svgClon: SVGSVGElement, width: number, height: number): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClon);
    const svgBase64 = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.width = width;
    img.height = height;
    img.src = svgBase64;
  });
};

const envolverTexto = (
  ctx: CanvasRenderingContext2D,
  texto: string,
  maxWidth: number
): string[] => {
  const palabras = texto.split(' ');
  const lineas: string[] = [];
  let lineaActual = '';

  for (const palabra of palabras) {
    const prueba = lineaActual ? `${lineaActual} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width <= maxWidth) {
      lineaActual = prueba;
    } else {
      if (lineaActual) lineas.push(lineaActual);
      lineaActual = palabra;
    }
  }
  if (lineaActual) lineas.push(lineaActual);
  return lineas;
};

const renderizarGraficoEnCanvas = async (
  config: ConfiguracionGraficoExportar,
  formato: FormatoGrafico
): Promise<ImagenRenderizada> => {
  if (!config.contenedor) {
    throw new Error(`No se encontró el contenedor del gráfico "${config.titulo}".`);
  }

  const svgs = Array.from(
    config.contenedor.querySelectorAll<SVGSVGElement>('svg.recharts-surface')
  ).filter((s) => {
    const r = s.getBoundingClientRect();
    return r.width > 10 && r.height > 10;
  });

  if (svgs.length === 0) {
    throw new Error(
      `El gráfico "${config.titulo}" no tiene datos visibles para exportar en este momento.`
    );
  }

  const estilosRoot = getComputedStyle(document.documentElement);
  const bgSuperficie = resolverVariablesCSS('var(--color-superficie, #ffffff)', estilosRoot) || '#ffffff';
  const colorTexto = resolverVariablesCSS('var(--text-h, #0f172a)', estilosRoot) || '#0f172a';
  const colorTextoSec = resolverVariablesCSS('var(--color-texto-sec, #64748b)', estilosRoot) || '#64748b';
  const colorBorde = resolverVariablesCSS('var(--color-borde, #e2e8f0)', estilosRoot) || '#e2e8f0';

  const scale = 2; // Alta resolución (2x)
  const paddingX = 28;
  const paddingY = 24;

  // Preparar imágenes de cada SVG dentro de la tarjeta (por ej. dona + gráfico principal)
  const svgsRenderizados: { img: HTMLImageElement; w: number; h: number }[] = [];
  for (const svg of svgs) {
    const rect = svg.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const clon = clonarYResolverSvg(svg, estilosRoot);
    const img = await svgAImagen(clon, w, h);
    svgsRenderizados.push({ img, w, h });
  }

  const gapSvgs = 20;
  const anchoContenidoSvgs =
    svgsRenderizados.reduce((acc, item) => acc + item.w, 0) +
    gapSvgs * Math.max(0, svgsRenderizados.length - 1);
  const altoMaxSvgs = Math.max(...svgsRenderizados.map((s) => s.h));

  const anchoTotal = Math.max(640, anchoContenidoSvgs + paddingX * 2);

  // Medir encabezado y filtros
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.font = '600 11.5px system-ui, -apple-system, sans-serif';
  const lineasFiltros = config.filtros
    ? envolverTexto(tempCtx, `Filtros: ${config.filtros}`, anchoTotal - paddingX * 2)
    : [];

  let altoEncabezado = 32; // Título principal
  if (config.subtitulo) altoEncabezado += 20;
  if (lineasFiltros.length > 0) altoEncabezado += lineasFiltros.length * 16 + 6;
  altoEncabezado += 14; // Separador

  const tieneLeyenda = Boolean(config.leyenda && config.leyenda.length > 0);
  const altoLeyenda = tieneLeyenda ? 36 : 0;
  const altoPie = 22;

  const altoTotal = paddingY * 2 + altoEncabezado + altoMaxSvgs + altoLeyenda + altoPie;

  const canvas = document.createElement('canvas');
  canvas.width = anchoTotal * scale;
  canvas.height = altoTotal * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo inicializar el lienzo de exportación.');
  }

  ctx.scale(scale, scale);

  // Fondo sólido (necesario para JPEG y lectura limpia en tema claro/oscuro)
  ctx.fillStyle = bgSuperficie;
  ctx.fillRect(0, 0, anchoTotal, altoTotal);

  // Borde sutil exterior
  ctx.strokeStyle = colorBorde;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, anchoTotal - 1, altoTotal - 1);

  let cursorY = paddingY;

  // Título
  ctx.fillStyle = colorTexto;
  ctx.font = '700 17px system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(config.titulo, paddingX, cursorY);
  cursorY += 24;

  // Subtítulo
  if (config.subtitulo) {
    ctx.fillStyle = colorTextoSec;
    ctx.font = '400 12.5px system-ui, -apple-system, sans-serif';
    ctx.fillText(config.subtitulo, paddingX, cursorY);
    cursorY += 20;
  }

  // Filtros aplicados
  if (lineasFiltros.length > 0) {
    ctx.fillStyle = colorTextoSec;
    ctx.font = '500 11.5px system-ui, -apple-system, sans-serif';
    for (const linea of lineasFiltros) {
      ctx.fillText(linea, paddingX, cursorY);
      cursorY += 16;
    }
    cursorY += 4;
  }

  // Línea divisoria bajo encabezado
  ctx.beginPath();
  ctx.moveTo(paddingX, cursorY + 4);
  ctx.lineTo(anchoTotal - paddingX, cursorY + 4);
  ctx.strokeStyle = colorBorde;
  ctx.lineWidth = 1;
  ctx.stroke();
  cursorY += 16;

  // Dibujar SVGs centrados horizontalmente y alineados verticalmente
  let cursorX = paddingX + Math.max(0, (anchoTotal - paddingX * 2 - anchoContenidoSvgs) / 2);
  for (const item of svgsRenderizados) {
    const offsetY = Math.max(0, (altoMaxSvgs - item.h) / 2);
    ctx.drawImage(item.img, cursorX, cursorY + offsetY, item.w, item.h);
    cursorX += item.w + gapSvgs;
  }
  cursorY += altoMaxSvgs + 10;

  // Leyenda personalizada si se proveyó
  if (tieneLeyenda && config.leyenda) {
    ctx.font = '500 11.5px system-ui, -apple-system, sans-serif';
    let lx = paddingX;
    for (const item of config.leyenda) {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(lx + 5, cursorY + 7, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = colorTexto;
      ctx.fillText(item.etiqueta, lx + 15, cursorY + 1);
      lx += ctx.measureText(item.etiqueta).width + 32;
    }
    cursorY += altoLeyenda;
  }

  // Pie con marca temporal
  const fechaStr = new Date().toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  ctx.fillStyle = colorTextoSec;
  ctx.font = '400 10.5px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Exportado el ${fechaStr}`, paddingX, altoTotal - paddingY - 10);

  const mimeType = formato === 'jpeg' ? 'image/jpeg' : 'image/png';
  const quality = formato === 'jpeg' ? 0.95 : 1.0;

  return {
    titulo: config.titulo,
    subtitulo: config.subtitulo,
    filtros: config.filtros,
    dataUrl: canvas.toDataURL(mimeType, quality),
    width: anchoTotal,
    height: altoTotal,
  };
};

const descargarDataUrl = (dataUrl: string, nombreArchivo: string) => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportarGraficos = async (
  graficos: ConfiguracionGraficoExportar[],
  formato: FormatoGrafico,
  nombreBaseArchivo: string,
  tituloReporteConsolidado = 'Reporte Estadístico de Gráficos'
): Promise<void> => {
  const validos = graficos.filter((g) => g.contenedor !== null);
  if (validos.length === 0) {
    throw new Error('No hay gráficos disponibles para exportar.');
  }

  const renderizados: ImagenRenderizada[] = [];
  for (const g of validos) {
    const img = await renderizarGraficoEnCanvas(g, formato);
    renderizados.push(img);
  }

  if (formato === 'pdf') {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margen = 12;

    if (renderizados.length > 1) {
      // Banner superior en la primera página del reporte consolidado
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(30, 41, 59);
      pdf.text(tituloReporteConsolidado, margen, margen + 5);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      const fechaGen = new Date().toLocaleString('es-AR');
      pdf.text(`Generado el ${fechaGen} • ${renderizados.length} gráficos incluidos`, margen, margen + 10);
    }

    let cursorY = renderizados.length > 1 ? margen + 15 : margen;

    renderizados.forEach((item, index) => {
      const anchoDisponible = pageWidth - margen * 2;
      const ratio = item.height / item.width;
      let imgW = anchoDisponible;
      let imgH = imgW * ratio;

      const altoMaxPagina = pageHeight - margen * 2;
      if (imgH > altoMaxPagina) {
        imgH = altoMaxPagina;
        imgW = imgH / ratio;
      }

      if (index > 0 && cursorY + imgH > pageHeight - margen) {
        pdf.addPage('a4', 'landscape');
        cursorY = margen;
      }

      const posX = margen + (anchoDisponible - imgW) / 2;
      pdf.addImage(item.dataUrl, 'PNG', posX, cursorY, imgW, imgH);
      cursorY += imgH + 8;
    });

    pdf.save(`${nombreBaseArchivo}.pdf`);
    return;
  }

  // PNG o JPEG
  if (renderizados.length === 1) {
    descargarDataUrl(renderizados[0].dataUrl, `${nombreBaseArchivo}.${formato}`);
    return;
  }

  // Consolidar múltiples gráficos apilados verticalmente en una sola imagen
  const scale = 2;
  const gap = 20;
  const maxWidth = Math.max(...renderizados.map((r) => r.width));
  const totalHeight =
    renderizados.reduce((acc, r) => acc + r.height, 0) + gap * (renderizados.length - 1);

  const canvasConsolidado = document.createElement('canvas');
  canvasConsolidado.width = maxWidth * scale;
  canvasConsolidado.height = totalHeight * scale;
  const ctx = canvasConsolidado.getContext('2d')!;
  ctx.scale(scale, scale);

  const estilosRoot = getComputedStyle(document.documentElement);
  ctx.fillStyle = resolverVariablesCSS('var(--color-fondo, #f8fafc)', estilosRoot) || '#f8fafc';
  ctx.fillRect(0, 0, maxWidth, totalHeight);

  let y = 0;
  for (const r of renderizados) {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = r.dataUrl;
    });
    const x = (maxWidth - r.width) / 2;
    ctx.drawImage(img, x, y, r.width, r.height);
    y += r.height + gap;
  }

  const mimeType = formato === 'jpeg' ? 'image/jpeg' : 'image/png';
  const quality = formato === 'jpeg' ? 0.95 : 1.0;
  descargarDataUrl(canvasConsolidado.toDataURL(mimeType, quality), `${nombreBaseArchivo}.${formato}`);
};