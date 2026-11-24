import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import { descargarPDF } from '../../utils/exportarPdf';
import { ExportIcon } from '../../components/icons/ExportIcon';
import { ConfirmExportGraficoDialog } from '../../components/ui/confirmExportGraficoDialog';
import type { FormatoGrafico } from '../../utils/exportarGraficos';
import type { InformacionNutricional, ParametroRedondeo, VerificacionReferencia, IngredienteIncompleto } from './tipos';

const LEYENDA_REVISION_PROFESIONAL =
  'Valores calculados a partir de datos de referencia y recetas estructuradas. Deben ser revisados por un/a profesional revisor.';

interface InformacionNutricionalModalProps {
  productoId: number;
  nombreProducto: string;
  onClose: () => void;
}

export const InformacionNutricionalModal: React.FC<InformacionNutricionalModalProps> = ({
  productoId,
  nombreProducto,
  onClose,
}) => {
  const { esAdministrador } = useAuth();
  const [info, setInfo] = useState<InformacionNutricional | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [verificacion, setVerificacion] = useState<VerificacionReferencia | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [mostrarParametros, setMostrarParametros] = useState(false);
  const [parametros, setParametros] = useState<ParametroRedondeo[]>([]);
  const [cargandoParametros, setCargandoParametros] = useState(false);
  const [pesoUnidadG, setPesoUnidadG] = useState<number | null>(null);
  const [tamanoPorcion, setTamanoPorcion] = useState<string>('');
  const [medidaCasera, setMedidaCasera] = useState<string>('');
  const [porcionesEnvase, setPorcionesEnvase] = useState<number | null>(null);
  const [descPorcion, setDescPorcion] = useState<string>('');
  const [guardandoPorcion, setGuardandoPorcion] = useState(false);
  const [exportModalAbierto, setExportModalAbierto] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [paramEditando, setParamEditando] = useState<ParametroRedondeo | null>(null);
  const [guardandoParam, setGuardandoParam] = useState(false);
  const [ingredientesIncompletos, setIngredientesIncompletos] = useState<IngredienteIncompleto[]>([]);
  const [ingredienteACompletar, setIngredienteACompletar] = useState<IngredienteIncompleto | null>(null);
  const [formValores, setFormValores] = useState<Record<string, string>>({});
  const [guardandoIngrediente, setGuardandoIngrediente] = useState(false);

  const cargarIncompletos = async () => {
    try {
      const res = await apiFetch(`/nutricion/productos/${productoId}/ingredientes-incompletos`);
      if (res.ok) {
        const data = await res.json();
        setIngredientesIncompletos(data.ingredientes_incompletos || []);
      }
    } catch {
      // Ignorar errores menores al consultar incompletos
    }
  };

  const cargarNutricion = async () => {
    setLoading(true);
    setError(null);
    try {
      await cargarIncompletos();
      const [prodRes, res] = await Promise.all([
        apiFetch(`/productos/${productoId}`),
        apiFetch(`/nutricion/productos/${productoId}`),
      ]);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setPesoUnidadG(prodData.peso_unidad_g ?? null);
        if (prodData.tamano_porcion_g != null) setTamanoPorcion(String(prodData.tamano_porcion_g));
        if (prodData.porciones_por_envase != null) setPorcionesEnvase(prodData.porciones_por_envase);
        if (prodData.descripcion_porcion != null) setDescPorcion(prodData.descripcion_porcion);
        if (prodData.medida_casera != null) setMedidaCasera(prodData.medida_casera);
      }
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
        if (data.ingredientes_incompletos) {
          setIngredientesIncompletos(data.ingredientes_incompletos);
        }
        if (data.tamano_porcion_g != null) setTamanoPorcion(String(data.tamano_porcion_g));
        if (data.porciones_por_envase != null) setPorcionesEnvase(data.porciones_por_envase);
        if (data.descripcion_porcion != null) setDescPorcion(data.descripcion_porcion);
        if (data.medida_casera != null) setMedidaCasera(data.medida_casera);
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = typeof err.detail === 'object' ? err.detail?.mensaje : (err.detail || 'No se pudo obtener la información nutricional.');
        setError(msg);
        if (err.detail?.ingredientes_incompletos) {
          setIngredientesIncompletos(err.detail.ingredientes_incompletos);
        }
      }
    } catch {
      setError('Error de comunicación con el servidor al cargar información nutricional.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarNutricion();
  }, [productoId]);

  const cargarParametros = async () => {
    setCargandoParametros(true);
    try {
      const res = await apiFetch('/nutricion/parametros');
      if (res.ok) {
        const data = await res.json();
        setParametros(data);
      }
    } catch {
    } finally {
      setCargandoParametros(false);
    }
  };

  const porcionesCalculadas =
    pesoUnidadG && pesoUnidadG > 0 && Number(tamanoPorcion) > 0
      ? Number((pesoUnidadG / Number(tamanoPorcion)).toFixed(2))
      : porcionesEnvase;

  const ejecutarCalculo = async () => {
    if (!esAdministrador) return;
    if (!tamanoPorcion || Number(tamanoPorcion) <= 0) {
      setError('Debe indicar un tamaño de porción en gramos mayor a cero.');
      return;
    }
    setCalculando(true);
    setError(null);
    setMensajeExito(null);
    try {
      const res = await apiFetch(`/productos/${productoId}/calcular-nutricion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tamano_porcion_g: Number(tamanoPorcion),
          porciones_por_envase: porcionesCalculadas ?? undefined,
          descripcion_porcion: descPorcion || undefined,
          medida_casera: medidaCasera.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
        setIngredientesIncompletos([]);
        setMensajeExito('Información nutricional calculada con éxito desde la receta estructurada.');
        setVerificacion(null);
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = typeof err.detail === 'object' ? err.detail?.mensaje : (err.detail || 'No se pudo calcular la información nutricional.');
        setError(msg);
        if (err.detail?.ingredientes_incompletos) {
          setIngredientesIncompletos(err.detail.ingredientes_incompletos);
        }
      }
    } catch {
      setError('Error al procesar el cálculo nutricional.');
    } finally {
      setCalculando(false);
    }
  };

  const guardarPorcionDeclarada = async () => {
    if (!esAdministrador) return;
    if (!tamanoPorcion || Number(tamanoPorcion) <= 0) {
      setError('Debe indicar un tamaño de porción en gramos mayor a cero.');
      return;
    }
    if (!medidaCasera.trim()) {
      setError('La medida casera declarada es obligatoria (ej: 1 rebanada, 2 cucharadas, etc.).');
      return;
    }
    setGuardandoPorcion(true);
    setError(null);
    setMensajeExito(null);
    try {
      const res = await apiFetch(`/nutricion/productos/${productoId}/porcion-declarada`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tamano_porcion_g: Number(tamanoPorcion),
          medida_casera: medidaCasera.trim(),
          porciones_por_envase: porcionesCalculadas ?? undefined,
          descripcion_porcion: descPorcion.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
        setMensajeExito('Porción y medida casera declaradas guardadas exitosamente.');
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = typeof err.detail === 'object' ? err.detail?.mensaje : (err.detail || 'Error al guardar la porción declarada.');
        setError(msg);
      }
    } catch {
      setError('Error de comunicación con el servidor al guardar la porción declarada.');
    } finally {
      setGuardandoPorcion(false);
    }
  };

  const exportarTablaAImagen = async (
    infoTabla: InformacionNutricional,
    nombreProd: string,
    formato: 'png' | 'jpeg',
    medidaCaseraTexto: string
  ) => {
    const scale = 2;
    const width = 640;

    const paddingX = 28;
    const paddingY = 24;
    const altoTitulo = 36;
    const altoSubtitulo = 22;
    const altoAlerta = infoTabla.es_incompleta ? 28 : 0;
    const altoPorcion = 26;
    const altoHeaderTabla = 32;
    const altoFilas = infoTabla.tabla_nutricional.length * 25;
    const altoPieCaa = 36;
    const altoLeyenda = 65;
    const totalHeight =
      paddingY * 2 +
      altoTitulo +
      altoSubtitulo +
      altoAlerta +
      altoPorcion +
      altoHeaderTabla +
      altoFilas +
      altoPieCaa +
      altoLeyenda +
      16;

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = totalHeight * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo inicializar el lienzo para generar la imagen.');

    ctx.scale(scale, scale);

    // Fondo blanco nítido
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, totalHeight);

    // Borde exterior tipo panel de rótulo
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 12, width - 28, totalHeight - 24);

    let y = paddingY + 10;

    // Título "INFORMACIÓN NUTRICIONAL"
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'left';
    ctx.fillText('INFORMACIÓN NUTRICIONAL', paddingX, y);
    y += 6;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(paddingX, y, width - paddingX * 2, 2.5);
    y += 18;

    // Nombre del producto
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(`Producto: ${nombreProd}`, paddingX, y);
    y += 16;

    if (infoTabla.es_incompleta) {
      ctx.fillStyle = '#b91c1c';
      ctx.font = 'bold 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
      ctx.fillText(<><span className="material-symbols-outlined">warning</span> ADVERTENCIA: Tabla calculada con datos nutricionales incompletos</>, paddingX, y);
      y += 18;
    }

    // Porción y medida casera
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    const porcEnvTexto = infoTabla.porciones_por_envase
      ? ` · Porciones por envase: aprox. ${infoTabla.porciones_por_envase}`
      : '';
    ctx.fillText(`Porción: ${infoTabla.tamano_porcion_g} g (${medidaCaseraTexto})${porcEnvTexto}`, paddingX, y);
    y += 14;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(paddingX, y, width - paddingX * 2, 1.5);
    y += 18;

    // Encabezados de columna
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'left';
    ctx.fillText('Nutriente', paddingX, y);
    ctx.textAlign = 'right';
    ctx.fillText('Por 100 g', 320, y);
    ctx.fillText(`Porción (${infoTabla.tamano_porcion_g} g)`, 460, y);
    ctx.fillText('% VD (*)', width - paddingX, y);
    y += 8;

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingX, y);
    ctx.lineTo(width - paddingX, y);
    ctx.stroke();
    y += 16;

    // Filas de nutrientes
    infoTabla.tabla_nutricional.forEach((f) => {
      const esSub = ['azucares_totales', 'azucares_anadidos', 'grasas_saturadas', 'grasas_trans'].includes(
        f.nutriente
      );
      ctx.textAlign = 'left';
      ctx.font = esSub
        ? 'normal 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
        : 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
      ctx.fillStyle = esSub ? '#475569' : '#0f172a';
      const indentX = esSub ? paddingX + 16 : paddingX;
      ctx.fillText(f.nombre_mostrar, indentX, y);

      ctx.textAlign = 'right';
      ctx.font = 'normal 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText(`${f.valor_100g_formateado} ${f.unidad}`, 320, y);

      ctx.font = 'bold 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(`${f.valor_porcion_formateado} ${f.unidad}`, 460, y);

      ctx.font = 'normal 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText(f.vd_formateado, width - paddingX, y);

      y += 5;
      ctx.strokeStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.moveTo(paddingX, y);
      ctx.lineTo(width - paddingX, y);
      ctx.stroke();
      y += 18;
    });

    // Nota reglamentaria CAA
    y += 4;
    ctx.textAlign = 'left';
    ctx.font = 'italic 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(
      '(*) % Valores Diarios con base a una dieta de 2.000 kcal u 8.400 kJ. Sus valores diarios pueden ser',
      paddingX,
      y
    );
    y += 12;
    ctx.fillText('mayores o menores según sus necesidades energéticas (Código Alimentario Argentino).', paddingX, y);
    y += 14;

    // CUADRO DESTACADO CON LA LEYENDA OBLIGATORIA DE REVISIÓN PROFESIONAL
    const boxW = width - paddingX * 2;
    const boxH = 48;
    ctx.fillStyle = '#fef2f2';
    ctx.fillRect(paddingX, y, boxW, boxH);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(paddingX, y, boxW, boxH);

    ctx.fillStyle = '#991b1b';
    ctx.font = 'bold 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillText(<><span className="material-symbols-outlined">warning</span> AVISO OBLIGATORIO DE REVISIÓN:</>, paddingX + 10, y + 17);
    ctx.font = 'normal 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillText(LEYENDA_REVISION_PROFESIONAL, paddingX + 10, y + 33);

    const mimeType = formato === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = formato === 'jpeg' ? 0.95 : 1.0;
    const dataUrl = canvas.toDataURL(mimeType, quality);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `informacion_nutricional_${infoTabla.producto_id}.${formato}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleConfirmarExportacion = async (formato: FormatoGrafico) => {
    if (!esAdministrador || !info) return;
    // Validación: No permitir exportar sin la leyenda
    if (!LEYENDA_REVISION_PROFESIONAL) {
      setError('No se permite exportar la tabla nutricional sin la leyenda obligatoria.');
      return;
    }
    setExportando(true);
    setError(null);
    try {
      if (formato === 'pdf') {
        await descargarPDF(
          `/nutricion/productos/${productoId}/exportar-pdf`,
          `informacion_nutricional_${productoId}.pdf`
        );
      } else {
        await exportarTablaAImagen(
          info,
          nombreProducto,
          formato,
          medidaCasera || info.medida_casera || info.descripcion_porcion || '1 porción'
        );
      }
      setExportModalAbierto(false);
      setMensajeExito(`Tabla nutricional exportada exitosamente en formato ${formato.toUpperCase()}.`);
    } catch (err: any) {
      setError(err.message || 'Error al exportar la tabla nutricional.');
    } finally {
      setExportando(false);
    }
  };

  const imprimirTabla = () => {
    if (!info) return;
    // Validación: No permitir imprimir sin la leyenda
    if (!LEYENDA_REVISION_PROFESIONAL) {
      setError('No se permite imprimir la tabla nutricional sin la leyenda obligatoria.');
      return;
    }
    const ventanaImpresion = window.open('', '_blank');
    if (!ventanaImpresion) {
      setError('El navegador bloqueó la ventana emergente de impresión.');
      return;
    }

    const filasHtml = info.tabla_nutricional
      .map((f) => {
        const esSub = ['azucares_totales', 'azucares_anadidos', 'grasas_saturadas', 'grasas_trans'].includes(f.nutriente);
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; ${esSub ? 'color: #475569;' : 'font-weight: 600;'}">
            <td style="padding: 5px 8px; ${esSub ? 'padding-left: 22px;' : ''}">${f.nombre_mostrar}</td>
            <td style="padding: 5px 8px; text-align: right;">${f.valor_100g_formateado} ${f.unidad}</td>
            <td style="padding: 5px 8px; text-align: right; font-weight: 700;">${f.valor_porcion_formateado} ${f.unidad}</td>
            <td style="padding: 5px 8px; text-align: right;">${f.vd_formateado}</td>
          </tr>
        `;
      })
      .join('');

    const medCaseraTexto = medidaCasera || info.medida_casera || info.descripcion_porcion || '1 porción';
    const porcEnvaseTexto = info.porciones_por_envase ? ` · Porciones por envase: aprox. ${info.porciones_por_envase}` : '';

    ventanaImpresion.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Información Nutricional - ${nombreProducto}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 30px; color: #0f172a; }
            .panel { border: 2px solid #0f172a; border-radius: 6px; padding: 18px; max-width: 520px; margin: 0 auto; }
            h2 { margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; border-bottom: 3px solid #0f172a; padding-bottom: 6px; }
            .producto-nombre { font-size: 14px; font-weight: bold; margin-top: 6px; color: #334155; }
            .porcion { font-size: 13px; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 8px; }
            th { border-bottom: 2px solid #0f172a; padding: 6px 8px; font-size: 12px; }
            .nota-pie { font-size: 10px; color: #475569; margin-top: 8px; font-style: italic; line-height: 1.35; border-top: 1px solid #cbd5e1; padding-top: 6px; }
            .cuadro-leyenda { margin-top: 12px; border: 1.5px solid #ef4444; background-color: #fef2f2; border-radius: 4px; padding: 10px; font-size: 11px; font-weight: bold; color: #991b1b; line-height: 1.4; }
          </style>
        </head>
        <body>
          <div class="panel">
            <h2>Información Nutricional</h2>
            <div class="producto-nombre">Producto: ${nombreProducto}</div>
            <div class="porcion">
              <strong>Porción:</strong> ${info.tamano_porcion_g} g (${medCaseraTexto})${porcEnvaseTexto}
            </div>
            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">Nutriente</th>
                  <th style="text-align: right;">Por 100 g</th>
                  <th style="text-align: right;">Porción (${info.tamano_porcion_g} g)</th>
                  <th style="text-align: right;">% VD (*)</th>
                </tr>
              </thead>
              <tbody>
                ${filasHtml}
              </tbody>
            </table>
            <div class="nota-pie">
              (*) % Valores Diarios con base a una dieta de 2.000 kcal u 8.400 kJ. Sus valores diarios pueden ser mayores o menores según sus necesidades energéticas.
            </div>
            <div class="cuadro-leyenda">
              <span className="material-symbols-outlined">warning</span> AVISO OBLIGATORIO DE REVISIÓN: ${LEYENDA_REVISION_PROFESIONAL}
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    ventanaImpresion.document.close();
  };

  const abrirFormularioCompletar = (ing: IngredienteIncompleto) => {
    const iniciales: Record<string, string> = {};
    if (ing.valores_actuales) {
      Object.entries(ing.valores_actuales).forEach(([k, v]) => {
        if (v !== null && v !== undefined) {
          iniciales[k] = String(v);
        }
      });
    }
    if (!iniciales['fuente_datos']) {
      iniciales['fuente_datos'] = 'Código Alimentario Argentino (CAA)';
    }
    setFormValores(iniciales);
    setIngredienteACompletar(ing);
    setError(null);
  };

  const guardarDatosIngrediente = async () => {
    if (!ingredienteACompletar || !esAdministrador) return;
    setGuardandoIngrediente(true);
    setError(null);
    setMensajeExito(null);
    try {
      const payloadValores: Record<string, any> = { ...formValores };
      const numericFields = [
        'energia_kcal',
        'energia_kj',
        'carbohidratos',
        'azucares_totales',
        'azucares_anadidos',
        'proteinas',
        'grasas_totales',
        'grasas_saturadas',
        'grasas_trans',
        'fibra_alimentaria',
        'sodio_mg',
      ];
      numericFields.forEach((nf) => {
        if (payloadValores[nf] !== undefined && payloadValores[nf] !== '') {
          payloadValores[nf] = Number(payloadValores[nf]);
        }
      });

      const res = await apiFetch('/nutricion/completar-ingrediente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: productoId,
          tipo_entidad: ingredienteACompletar.tipo_entidad,
          entidad_id: ingredienteACompletar.entidad_id,
          valores: payloadValores,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMensajeExito(data.mensaje);
        setIngredientesIncompletos(data.ingredientes_incompletos || []);
        if (data.recalculado && data.informacion_nutricional) {
          setInfo(data.informacion_nutricional);
        }
        setIngredienteACompletar(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(typeof err.detail === 'string' ? err.detail : 'Error al guardar los datos del ingrediente.');
      }
    } catch {
      setError('Error de comunicación al guardar los datos del ingrediente.');
    } finally {
      setGuardandoIngrediente(false);
    }
  };

  const ejecutarVerificacionReferencia = async () => {
    setVerificando(true);
    setError(null);
    try {
      const res = await apiFetch(`/nutricion/productos/${productoId}/verificar-referencia`);
      if (res.ok) {
        const data = await res.json();
        setVerificacion(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'No se pudo verificar el patrón de referencia.');
      }
    } catch {
      setError('Error al consultar la verificación del producto de referencia.');
    } finally {
      setVerificando(false);
    }
  };

  const guardarParametro = async () => {
    if (!paramEditando || !esAdministrador) return;
    setGuardandoParam(true);
    try {
      const res = await apiFetch(`/nutricion/parametros/${paramEditando.nutriente}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          umbral_no_significativo: Number(paramEditando.umbral_no_significativo),
          cifras_decimales: Number(paramEditando.cifras_decimales),
          cifras_decimales_mayores_10: Number(paramEditando.cifras_decimales_mayores_10),
          vdr: paramEditando.vdr ? Number(paramEditando.vdr) : null,
          texto_no_significativo: paramEditando.texto_no_significativo,
        }),
      });
      if (res.ok) {
        await cargarParametros();
        setParamEditando(null);
        await ejecutarCalculo();
      }
    } catch {
      setError('Error al guardar el parámetro.');
    } finally {
      setGuardandoParam(false);
    }
  };

  const restablecerParametros = async () => {
    if (!esAdministrador) return;
    setCargandoParametros(true);
    try {
      const res = await apiFetch('/nutricion/parametros/restablecer', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setParametros(data);
        await ejecutarCalculo();
      }
    } catch {
      setError('Error al restablecer los parámetros.');
    } finally {
      setCargandoParametros(false);
    }
  };

  if (!esAdministrador) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '480px',
            textAlign: 'center',
            color: '#f8fafc',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#ef4444', marginBottom: '1rem' }}>
            lock
          </span>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700 }}>Acceso Restringido</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Solo las personas con permiso de administrar pueden acceder a la tabla de rotulado nutricional y generar reportes.
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#334155',
              color: '#f8fafc',
              border: '1px solid #475569',
              borderRadius: '6px',
              padding: '0.5rem 1.25rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="resp-modal-fondo"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div className="resp-modal-caja"
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          color: '#f8fafc',
        }}
      >
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#1e293b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#38bdf8' }}>
              monitoring
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
                  Información Nutricional Oficial
                </h2>
                {Boolean(info?.es_incompleta || ingredientesIncompletos.length > 0) ? (
                  <span
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                      border: '1px solid #ef4444',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>warning</span>
                    INCOMPLETA
                  </span>
                ) : info ? (
                  <span
                    style={{
                      backgroundColor: 'rgba(34, 197, 94, 0.2)',
                      color: '#4ade80',
                      border: '1px solid #22c55e',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
                    COMPLETA
                  </span>
                ) : null}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                Producto: <strong style={{ color: '#f1f5f9' }}>{nombreProducto}</strong>
                {info?.nombre_receta && (
                  <span> · Receta vinculada: <span style={{ color: '#38bdf8' }}>{info.nombre_receta}</span></span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0.25rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
              close
            </span>
          </button>
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                error
              </span>
              <span>{error}</span>
            </div>
          )}

          {mensajeExito && (
            <div
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid #22c55e',
                color: '#86efac',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                check_circle
              </span>
              <span>{mensajeExito}</span>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>
                sync
              </span>
              <p>Cargando información nutricional...</p>
            </div>
          ) : (
            <>
              {/* Sección de advertencia con listado de ingredientes incompletos */}
              {ingredientesIncompletos.length > 0 && (
                <div
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid #f59e0b',
                    borderRadius: '8px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                      warning
                    </span>
                    <strong style={{ fontSize: '0.95rem' }}>
                      Advertencia: Ingredientes con Datos Nutricionales Faltantes o sin Fuente Registrada
                    </strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>
                    Para no generar una tabla que parezca completa pero está calculada con datos faltantes, se deben completar los nutrientes obligatorios o la fuente de los siguientes ingredientes:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {ingredientesIncompletos.map((ing) => (
                      <div
                        key={`${ing.tipo_entidad}-${ing.entidad_id}-${ing.ingrediente_id}`}
                        style={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          padding: '0.65rem 0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>
                              {ing.nombre}
                            </span>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                backgroundColor: ing.es_aditivo ? '#3b82f6' : '#64748b',
                                color: '#fff',
                              }}
                            >
                              {ing.es_aditivo ? 'Aditivo' : 'Ingrediente'}
                            </span>
                            {ing.es_aditivo && ing.aporta_energia_sodio && (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '4px',
                                  backgroundColor: '#d97706',
                                  color: '#fff',
                                }}
                              >
                                Aporta energía/sodio
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
                            {ing.campos_faltantes.map((cf) => (
                              <span
                                key={cf}
                                style={{
                                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                  color: '#fca5a5',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  padding: '0.1rem 0.45rem',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                }}
                              >
                                Falta: {cf}
                              </span>
                            ))}
                          </div>
                        </div>

                        {esAdministrador && (
                          <button
                            type="button"
                            onClick={() => abrirFormularioCompletar(ing)}
                            style={{
                              backgroundColor: '#0284c7',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '5px',
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              cursor: 'pointer',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                            Completar datos
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulario para completar datos faltantes desde la misma pantalla */}
              {ingredienteACompletar && (
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    border: '2px solid #38bdf8',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="material-symbols-outlined" style={{ color: '#38bdf8', fontSize: '24px' }}>
                        edit_document
                      </span>
                      <div>
                        <strong style={{ fontSize: '1.05rem', color: '#f8fafc' }}>
                          Completar datos nutricionales: {ingredienteACompletar.nombre}
                        </strong>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          Tipo: {ingredienteACompletar.tipo_entidad} · {ingredienteACompletar.es_aditivo ? 'Aditivo' : 'Ingrediente estándar'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIngredienteACompletar(null)}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        Fuente de Información Nutricional *
                      </label>
                      <input
                        type="text"
                        list="fuentes-sugeridas"
                        placeholder="Ej. CAA, SENASA, USDA, Rótulo proveedor"
                        value={formValores['fuente_datos'] || ''}
                        onChange={(e) => setFormValores({ ...formValores, fuente_datos: e.target.value })}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          color: '#fff',
                          padding: '0.45rem 0.6rem',
                          borderRadius: '6px',
                          width: '100%',
                          fontSize: '0.85rem',
                        }}
                      />
                      <datalist id="fuentes-sugeridas">
                        <option value="Código Alimentario Argentino (CAA)" />
                        <option value="SENASA / Tablas Oficiales" />
                        <option value="USDA FoodData Central" />
                        <option value="Rótulo del fabricante / envase de origen" />
                        <option value="Análisis de laboratorio acreditado" />
                      </datalist>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        Detalle / Referencia de Fuente (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Art. 643 / Lote analizado"
                        value={formValores['fuente_detalle'] || ''}
                        onChange={(e) => setFormValores({ ...formValores, fuente_detalle: e.target.value })}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          color: '#fff',
                          padding: '0.45rem 0.6rem',
                          borderRadius: '6px',
                          width: '100%',
                          fontSize: '0.85rem',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #334155', paddingTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.5rem' }}>
                      Valores por 100g de ingrediente:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(130px, 100%), 1fr))', gap: '0.6rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>Energía (kcal) *</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="0"
                          value={formValores['energia_kcal'] ?? ''}
                          onChange={(e) => setFormValores({ ...formValores, energia_kcal: e.target.value })}
                          style={{ backgroundColor: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '0.35rem 0.5rem', borderRadius: '4px', width: '100%', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>Sodio (mg) *</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="0"
                          value={formValores['sodio_mg'] ?? ''}
                          onChange={(e) => setFormValores({ ...formValores, sodio_mg: e.target.value })}
                          style={{ backgroundColor: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '0.35rem 0.5rem', borderRadius: '4px', width: '100%', fontSize: '0.85rem' }}
                        />
                      </div>

                      {!ingredienteACompletar.es_aditivo && (
                        <>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>Carbohidratos (g)</label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder="0"
                              value={formValores['carbohidratos'] ?? ''}
                              onChange={(e) => setFormValores({ ...formValores, carbohidratos: e.target.value })}
                              style={{ backgroundColor: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '0.35rem 0.5rem', borderRadius: '4px', width: '100%', fontSize: '0.85rem' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>Azúcares Totales (g)</label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder="0"
                              value={formValores['azucares_totales'] ?? ''}
                              onChange={(e) => setFormValores({ ...formValores, azucares_totales: e.target.value })}
                              style={{ backgroundColor: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '0.35rem 0.5rem', borderRadius: '4px', width: '100%', fontSize: '0.85rem' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>Azúcares Añadidos (g)</label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder="0"
                              value={formValores['azucares_anadidos'] ?? ''}
                              onChange={(e) => setFormValores({ ...formValores, azucares_anadidos: e.target.value })}
                              style={{ backgroundColor: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '0.35rem 0.5rem', borderRadius: '4px', width: '100%', fontSize: '0.85rem' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>Proteínas (g)</label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder="0"
                              value={formValores['proteinas'] ?? ''}
                              onChange={(e) => setFormValores({ ...formValores, proteinas: e.target.value })}
                              style={{ backgroundColor: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '0.35rem 0.5rem', borderRadius: '4px', width: '100%', fontSize: '0.85rem' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>Grasas Totales (g)</label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder="0"
                              value={formValores['grasas_totales'] ?? ''}
                              onChange={(e) => setFormValores({ ...formValores, grasas_totales: e.target.value })}
                              style={{ backgroundColor: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '0.35rem 0.5rem', borderRadius: '4px', width: '100%', fontSize: '0.85rem' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>Grasas Saturadas (g)</label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder="0"
                              value={formValores['grasas_saturadas'] ?? ''}
                              onChange={(e) => setFormValores({ ...formValores, grasas_saturadas: e.target.value })}
                              style={{ backgroundColor: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '0.35rem 0.5rem', borderRadius: '4px', width: '100%', fontSize: '0.85rem' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>Grasas Trans (g)</label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder="0"
                              value={formValores['grasas_trans'] ?? ''}
                              onChange={(e) => setFormValores({ ...formValores, grasas_trans: e.target.value })}
                              style={{ backgroundColor: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '0.35rem 0.5rem', borderRadius: '4px', width: '100%', fontSize: '0.85rem' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>Fibra Alimentaria (g)</label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder="0"
                              value={formValores['fibra_alimentaria'] ?? ''}
                              onChange={(e) => setFormValores({ ...formValores, fibra_alimentaria: e.target.value })}
                              style={{ backgroundColor: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '0.35rem 0.5rem', borderRadius: '4px', width: '100%', fontSize: '0.85rem' }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setIngredienteACompletar(null)}
                      style={{
                        backgroundColor: '#475569',
                        color: '#f8fafc',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.45rem 1rem',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={guardarDatosIngrediente}
                      disabled={guardandoIngrediente}
                      style={{
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.45rem 1.25rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: guardandoIngrediente ? 'not-allowed' : 'pointer',
                        opacity: guardandoIngrediente ? 0.7 : 1,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        save
                      </span>
                      {guardandoIngrediente ? 'Guardando...' : 'Guardar y Recalcular'}
                    </button>
                  </div>
                </div>
              )}

              {esAdministrador && (
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '1rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-end',
                    gap: '1rem',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        Tamaño Porción (g) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="ej: 50"
                        value={tamanoPorcion}
                        onChange={(e) => setTamanoPorcion(e.target.value)}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          color: '#f8fafc',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '6px',
                          width: '95px',
                          fontSize: '0.9rem',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        Medida casera declarada *
                      </label>
                      <input
                        type="text"
                        placeholder="ej: 1 rebanada, 2 galletitas"
                        value={medidaCasera}
                        onChange={(e) => setMedidaCasera(e.target.value)}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          color: '#f8fafc',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '6px',
                          width: '180px',
                          fontSize: '0.9rem',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        Porciones por envase (auto)
                      </label>
                      <input
                        type="text"
                        value={porcionesCalculadas != null ? String(porcionesCalculadas) : 'Sin datos'}
                        disabled
                        readOnly
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          color: '#94a3b8',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '6px',
                          width: '110px',
                          fontSize: '0.9rem',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        Descripción adicional
                      </label>
                      <input
                        type="text"
                        value={descPorcion}
                        onChange={(e) => setDescPorcion(e.target.value)}
                        placeholder="Opcional"
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          color: '#f8fafc',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '6px',
                          width: '140px',
                          fontSize: '0.9rem',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={guardarPorcionDeclarada}
                      disabled={guardandoPorcion || calculando}
                      style={{
                        backgroundColor: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 0.85rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: guardandoPorcion || calculando ? 'not-allowed' : 'pointer',
                        opacity: guardandoPorcion || calculando ? 0.7 : 1,
                      }}
                      title="Guarda la porción y la medida casera declaradas del producto"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        save
                      </span>
                      {guardandoPorcion ? 'Guardando...' : 'Guardar porción y medida'}
                    </button>

                    <button
                      type="button"
                      onClick={ejecutarCalculo}
                      disabled={calculando || guardandoPorcion}
                      style={{
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 0.85rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: calculando || guardandoPorcion ? 'not-allowed' : 'pointer',
                        opacity: calculando || guardandoPorcion ? 0.7 : 1,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        calculate
                      </span>
                      {calculando ? 'Calculando...' : 'Recalcular'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMostrarParametros(!mostrarParametros);
                        if (!mostrarParametros) cargarParametros();
                      }}
                      style={{
                        backgroundColor: '#334155',
                        color: '#f8fafc',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        padding: '0.5rem 0.85rem',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                      }}
                      title="Configuración de parámetros de redondeo y expresión CAA"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        tune
                      </span>
                      Parámetros CAA
                    </button>
                  </div>
                </div>
              )}

              {mostrarParametros && (
                <div
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #38bdf8',
                    borderRadius: '8px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#38bdf8' }}>
                        Parámetros Configurables de Redondeo y Expresión (Cap. V CAA)
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                        Las cifras, decimales y umbrales no están fijos en código: se aplican dinámicamente desde esta configuración.
                      </p>
                    </div>
                    {esAdministrador && (
                      <button
                        type="button"
                        onClick={restablecerParametros}
                        style={{
                          backgroundColor: '#475569',
                          color: '#f8fafc',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        Restablecer CAA
                      </button>
                    )}
                  </div>

                  {cargandoParametros ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>Cargando parámetros...</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                            <th style={{ padding: '0.4rem' }}>Nutriente</th>
                            <th style={{ padding: '0.4rem' }}>Unidad</th>
                            <th style={{ padding: '0.4rem' }}>VDR</th>
                            <th style={{ padding: '0.4rem' }}>Umbral "0"</th>
                            <th style={{ padding: '0.4rem' }}>Decim. (&le;10)</th>
                            <th style={{ padding: '0.4rem' }}>Decim. (&gt;10)</th>
                            {esAdministrador && <th style={{ padding: '0.4rem' }}>Acciones</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {parametros.map((p) => (
                            <tr key={p.id} style={{ borderBottom: '1px solid #1e293b' }}>
                              <td style={{ padding: '0.4rem', fontWeight: 500 }}>{p.nombre_mostrar}</td>
                              <td style={{ padding: '0.4rem', color: '#94a3b8' }}>{p.unidad}</td>
                              <td style={{ padding: '0.4rem' }}>{p.vdr ? `${p.vdr} ${p.unidad}` : '-'}</td>
                              <td style={{ padding: '0.4rem' }}>&le; {p.umbral_no_significativo} {p.unidad}</td>
                              <td style={{ padding: '0.4rem' }}>{p.cifras_decimales}</td>
                              <td style={{ padding: '0.4rem' }}>{p.cifras_decimales_mayores_10}</td>
                              {esAdministrador && (
                                <td style={{ padding: '0.4rem' }}>
                                  <button
                                    type="button"
                                    onClick={() => setParamEditando(p)}
                                    style={{
                                      backgroundColor: 'transparent',
                                      border: '1px solid #475569',
                                      color: '#38bdf8',
                                      borderRadius: '4px',
                                      padding: '0.2rem 0.5rem',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Editar
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {paramEditando && (
                    <div
                      style={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        padding: '0.75rem',
                        marginTop: '0.5rem',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'flex-end',
                        gap: '0.75rem',
                      }}
                    >
                      <strong style={{ width: '100%', fontSize: '0.85rem', color: '#38bdf8' }}>
                        Editando parámetro: {paramEditando.nombre_mostrar}
                      </strong>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>Umbral "0"</label>
                        <input
                          type="number"
                          step="0.1"
                          value={paramEditando.umbral_no_significativo}
                          onChange={(e) =>
                            setParamEditando({ ...paramEditando, umbral_no_significativo: Number(e.target.value) })
                          }
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #475569',
                            color: '#fff',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            width: '80px',
                            fontSize: '0.8rem',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>Decim. (&le;10)</label>
                        <input
                          type="number"
                          min="0"
                          max="3"
                          value={paramEditando.cifras_decimales}
                          onChange={(e) =>
                            setParamEditando({ ...paramEditando, cifras_decimales: Number(e.target.value) })
                          }
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #475569',
                            color: '#fff',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            width: '70px',
                            fontSize: '0.8rem',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>Decim. (&gt;10)</label>
                        <input
                          type="number"
                          min="0"
                          max="3"
                          value={paramEditando.cifras_decimales_mayores_10}
                          onChange={(e) =>
                            setParamEditando({ ...paramEditando, cifras_decimales_mayores_10: Number(e.target.value) })
                          }
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #475569',
                            color: '#fff',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            width: '70px',
                            fontSize: '0.8rem',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={guardarParametro}
                          disabled={guardandoParam}
                          style={{
                            backgroundColor: '#22c55e',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          {guardandoParam ? 'Guardando...' : 'Guardar y Recalcular'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setParamEditando(null)}
                          style={{
                            backgroundColor: '#475569',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {info && (
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    border: '2px solid #334155',
                  }}
                >
                  {Boolean(info.es_incompleta || ingredientesIncompletos.length > 0) && (
                    <div
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid #ef4444',
                        color: '#fca5a5',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '6px',
                        marginBottom: '0.75rem',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#ef4444' }}>
                        warning
                      </span>
                      <span>
                        <strong>TABLA MARCADA COMO INCOMPLETA:</strong> Hay ingredientes con datos nutricionales faltantes o sin fuente registrada. No debe utilizarse como información definitiva.
                      </span>
                    </div>
                  )}

                  <div
                    style={{
                      borderBottom: '3px solid #f8fafc',
                      paddingBottom: '0.75rem',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Información Nutricional
                      </h3>
                      <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: '0.25rem' }}>
                        Porción: <strong>{info.tamano_porcion_g} g</strong> ({medidaCasera || info.medida_casera || info.descripcion_porcion || '1 porción'})
                        {info.porciones_por_envase && (
                          <span> · Porciones por envase: <strong>aprox. {info.porciones_por_envase}</strong></span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setExportModalAbierto(true)}
                        disabled={exportando}
                        className="btn-cancelar"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: exportando ? 'not-allowed' : 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          padding: '0.45rem 0.85rem',
                          borderRadius: '6px',
                        }}
                        title="Exportar la tabla nutricional en PNG, JPEG o PDF"
                      >
                        <ExportIcon size={17} /> Exportar Tabla
                      </button>

                      <button
                        type="button"
                        onClick={imprimirTabla}
                        className="btn-cancelar"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          padding: '0.45rem 0.85rem',
                          borderRadius: '6px',
                        }}
                        title="Imprimir la tabla de rotulado nutricional junto con la leyenda obligatoria"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          print
                        </span>
                        Imprimir
                      </button>
                    </div>
                  </div>

                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.92rem',
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f8fafc', textAlign: 'left' }}>
                        <th style={{ padding: '0.6rem 0.5rem', fontWeight: 700 }}>Nutriente</th>
                        <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 700 }}>Por 100 g</th>
                        <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 700 }}>
                          Porción ({info.tamano_porcion_g} g)
                        </th>
                        <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 700 }}>% VD (*)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {info.tabla_nutricional.map((f, idx) => {
                        const esSubItem = [
                          'azucares_totales',
                          'azucares_anadidos',
                          'grasas_saturadas',
                          'grasas_trans',
                        ].includes(f.nutriente);
                        return (
                          <tr
                            key={f.nutriente}
                            style={{
                              borderBottom: idx === info.tabla_nutricional.length - 1 ? 'none' : '1px solid #334155',
                              backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                            }}
                          >
                            <td
                              style={{
                                padding: '0.5rem',
                                paddingLeft: esSubItem ? '1.75rem' : '0.5rem',
                                color: esSubItem ? '#94a3b8' : '#f8fafc',
                                fontWeight: esSubItem ? 400 : 600,
                              }}
                            >
                              {f.nombre_mostrar}
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                              {f.valor_100g_formateado} {f.unidad}
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#38bdf8' }}>
                              {f.valor_porcion_formateado} {f.unidad}
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                              {f.vd_formateado}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div
                    style={{
                      borderTop: '2px solid #475569',
                      paddingTop: '0.75rem',
                      marginTop: '0.75rem',
                      fontSize: '0.78rem',
                      color: '#94a3b8',
                      lineHeight: 1.4,
                    }}
                  >
                    (*) % Valores Diarios con base a una dieta de 2.000 kcal u 8.400 kJ. Sus valores diarios pueden ser mayores o menores según sus necesidades energéticas (Resolución GMC 46/03 - Código Alimentario Argentino).
                  </div>

                  {/* LEYENDA VISIBLE OBLIGATORIA */}
                  <div
                    style={{
                      marginTop: '1rem',
                      padding: '0.85rem 1rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      border: '1.5px solid #ef4444',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      color: '#fca5a5',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: '26px', flexShrink: 0 }}>
                      assignment_late
                    </span>
                    <div style={{ fontSize: '0.86rem', lineHeight: 1.4 }}>
                      <strong style={{ color: '#f87171', display: 'block', marginBottom: '2px' }}>
                        Aviso obligatorio de revisión profesional:
                      </strong>
                      {LEYENDA_REVISION_PROFESIONAL}
                    </div>
                  </div>
                </div>
              )}

              <div
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: '8px',
                  padding: '1rem',
                  border: '1px solid #334155',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="material-symbols-outlined" style={{ color: '#fbbf24', fontSize: '20px' }}>
                      verified
                    </span>
                    <strong style={{ fontSize: '0.9rem' }}>Validación contra Producto Patrón de la Cátedra</strong>
                  </div>
                  <button
                    type="button"
                    onClick={ejecutarVerificacionReferencia}
                    disabled={verificando}
                    style={{
                      backgroundColor: '#334155',
                      color: '#f8fafc',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      cursor: verificando ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      rule
                    </span>
                    {verificando ? 'Verificando...' : 'Verificar Tolerancia (±5%)'}
                  </button>
                </div>

                {verificacion && (
                  <div
                    style={{
                      backgroundColor: verificacion.resultado_global_valido
                        ? 'rgba(34, 197, 94, 0.1)'
                        : 'rgba(239, 68, 68, 0.1)',
                      border: `1px solid ${verificacion.resultado_global_valido ? '#22c55e' : '#ef4444'}`,
                      borderRadius: '6px',
                      padding: '0.75rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span
                        className="material-symbols-outlined"
                        style={{ color: verificacion.resultado_global_valido ? '#22c55e' : '#ef4444', fontSize: '20px' }}
                      >
                        {verificacion.resultado_global_valido ? 'check_circle' : 'warning'}
                      </span>
                      <strong style={{ color: verificacion.resultado_global_valido ? '#86efac' : '#fca5a5' }}>
                        {verificacion.mensaje}
                      </strong>
                    </div>

                    <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #475569', color: '#94a3b8' }}>
                            <th style={{ textAlign: 'left', padding: '0.25rem' }}>Nutriente</th>
                            <th style={{ textAlign: 'right', padding: '0.25rem' }}>Calculado (100g)</th>
                            <th style={{ textAlign: 'right', padding: '0.25rem' }}>Esperado Cátedra</th>
                            <th style={{ textAlign: 'right', padding: '0.25rem' }}>Desvío %</th>
                            <th style={{ textAlign: 'center', padding: '0.25rem' }}>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {verificacion.detalles_100g.map((d) => (
                            <tr key={d.nutriente} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <td style={{ padding: '0.25rem' }}>{d.nutriente}</td>
                              <td style={{ textAlign: 'right', padding: '0.25rem' }}>{d.valor_calculado}</td>
                              <td style={{ textAlign: 'right', padding: '0.25rem' }}>{d.valor_esperado}</td>
                              <td style={{ textAlign: 'right', padding: '0.25rem' }}>{d.diferencia_porcentual}%</td>
                              <td style={{ textAlign: 'center', padding: '0.25rem' }}>
                                <span
                                  style={{
                                    color: d.cumple_tolerancia ? '#22c55e' : '#ef4444',
                                    fontWeight: 600,
                                  }}
                                >
                                  {d.cumple_tolerancia ? 'DENTRO DE TOLERANCIA' : 'FUERA DE RANGO'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#1e293b',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#475569',
              color: '#f8fafc',
              border: 'none',
              borderRadius: '6px',
              padding: '0.5rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>

      {info && (
        <ConfirmExportGraficoDialog
          open={exportModalAbierto}
          tituloModal="Exportar Tabla Nutricional"
          tituloGrafico={`Información Nutricional - ${nombreProducto}`}
          iconoCard=<span className="material-symbols-outlined">assignment</span>
          filtrosAplicados={`Porción: ${info.tamano_porcion_g} g (${medidaCasera || info.medida_casera || info.descripcion_porcion || '1 porción'}) · Incluye leyenda obligatoria de revisión`}
          loading={exportando}
          onConfirm={handleConfirmarExportacion}
          onCancel={() => setExportModalAbierto(false)}
        />
      )}
    </div>
  );
};
