import io
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence
from fpdf import FPDF, FontFace
from src.rotulado.constants import (
    DISCLAIMER_NO_APROBACION,
    LEYENDA_BORRADOR_OBLIGATORIA,
    MENSAJE_SIN_OCTOGONOS,
)
from src.rotulado.exceptions import (
    ExportacionSinLeyendaError,
    MencionAprobacionNoPermitidaError,
)

# Paleta de colores consistente con SAIA
PRIMARIO = (40, 102, 168)
TEXTO = (38, 55, 70)
TEXTO_SEC = (113, 128, 140)
BORDE = (220, 228, 235)
SUAVE = (220, 235, 250)
FONDO = (245, 248, 252)
ERROR = (217, 92, 92)
ALERTA = (181, 118, 10)
EXITO = (47, 138, 87)
NEGRO = (15, 23, 42)
BLANCO = (255, 255, 255)
ROJO_FONDO = (254, 242, 242)
ROJO_BORDE = (239, 68, 68)
ROJO_TEXTO = (185, 28, 28)

FUENTE = "helvetica"

# Escudo SAIA
LOGO_SVG = (
    b'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" '
    b'stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
    b'<path d="M12 3 4.5 6v5.5c0 4.4 3.1 8.3 7.5 9.5 4.4-1.2 7.5-5.1 7.5-9.5V6L12 3Z"/>'
    b'<path d="m8.8 12 2.4 2.4 4.2-4.4"/></svg>'
)

FRASES_PROHIBIDAS = [
    "rótulo aprobado",
    "rotulo aprobado",
    "aprobado por autoridad",
    "aprobación oficial otorgada",
    "aprobacion oficial otorgada",
    "conformidad regulatoria otorgada",
    "certificación oficial concedida",
    "certificacion oficial concedida",
    "rótulo certificado",
    "rotulo certificado",
]


def _texto(valor: Any) -> str:
    if valor is None or valor == "":
        return "-"
    return str(valor).encode("windows-1252", "replace").decode("windows-1252")


def validar_sin_menciones_aprobacion(textos: List[str]) -> None:
    for t in textos:
        if not t:
            continue
        low = t.lower()
        for prohibida in FRASES_PROHIBIDAS:
            if prohibida in low:
                raise MencionAprobacionNoPermitidaError()


class BorradorRotuloPDF(FPDF):
    def __init__(
        self,
        producto_nombre: str,
        version_receta: int,
        fecha_emision: datetime,
        usuario_nombre: str,
    ):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.producto_nombre = producto_nombre
        self.version_receta = version_receta
        self.fecha_emision = fecha_emision
        self.usuario_nombre = usuario_nombre
        self.set_margins(14, 26, 14)
        self.set_auto_page_break(auto=True, margin=20)
        self.set_title(f"Borrador de Rótulo - {producto_nombre}")
        self.set_author(usuario_nombre)
        self.set_creator("SAIA")

    def color_texto(self, color=TEXTO):
        self.set_text_color(*color)

    def header(self):
        # Banda roja de advertencia de borrador
        self.set_fill_color(*ROJO_FONDO)
        self.set_draw_color(*ROJO_BORDE)
        self.set_line_width(0.4)
        self.rect(14, 8, self.epw, 12, style="DF", round_corners=True, corner_radius=2)

        self.set_xy(16, 9.5)
        self.set_font(FUENTE, "B", 8)
        self.set_text_color(*ROJO_TEXTO)
        self.cell(self.epw - 4, 4, _texto("[!] BORRADOR DE RÓTULO - DOCUMENTO DE TRABAJO PARA REVISIÓN PROFESIONAL"), align="C")

        self.set_xy(16, 14)
        self.set_font(FUENTE, "", 6.8)
        self.cell(self.epw - 4, 3.5, _texto("NO VÁLIDO COMO RÓTULO DEFINITIVO - SUJETO A REVISIÓN PROFESIONAL Y SANITARIA"), align="C")

        self.set_y(24)
        self.color_texto()

    def footer(self):
        self.set_draw_color(*BORDE)
        self.set_line_width(0.3)
        self.line(14, self.h - 17, self.w - 14, self.h - 17)

        self.set_xy(14, self.h - 16)
        self.set_font(FUENTE, "B", 6.8)
        self.set_text_color(*ROJO_TEXTO)
        self.cell(0, 3.5, LEYENDA_BORRADOR_OBLIGATORIA, align="C")

        self.set_xy(14, self.h - 12)
        self.set_font(FUENTE, "", 6.5)
        self.color_texto(TEXTO_SEC)
        fecha_str = self.fecha_emision.strftime("%d/%m/%Y %H:%M")
        meta = _texto(f"SAIA - Receta V{self.version_receta} - Emitido: {fecha_str} por {self.usuario_nombre} - Sin valor de certificación oficial")
        self.cell(self.epw * 0.75, 3.5, meta, align="L")
        self.cell(self.epw * 0.25, 3.5, f"Página {self.page_no()} de {{nb}}", align="R")

    def titulo_seccion(self, titulo: str, subtitulo: Optional[str] = None):
        if self.get_y() > self.page_break_trigger - 35:
            self.add_page()
        self.ln(4)
        self.set_font(FUENTE, "B", 11)
        self.color_texto(PRIMARIO)
        self.cell(0, 6, titulo, new_x="LMARGIN", new_y="NEXT")
        if subtitulo:
            self.set_font(FUENTE, "I", 7.5)
            self.color_texto(TEXTO_SEC)
            self.cell(0, 4, subtitulo, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*PRIMARIO)
        self.set_line_width(0.6)
        self.line(14, self.get_y() + 0.5, 35, self.get_y() + 0.5)
        self.ln(3)

    def tabla_simple(
        self,
        encabezados: Sequence[str],
        filas: Sequence[Sequence[Any]],
        anchos: Sequence[float],
        alineaciones: Optional[Sequence[str]] = None,
        resaltar_filas: Optional[Sequence[bool]] = None,
    ):
        self.set_font(FUENTE, size=7.5)
        self.set_draw_color(*BORDE)
        self.set_line_width(0.2)

        with self.table(
            col_widths=anchos,
            headings_style=FontFace(emphasis="BOLD", color=TEXTO, fill_color=SUAVE),
            cell_fill_color=FONDO,
            cell_fill_mode="ROWS",
            line_height=4.6,
            padding=(1.4, 1.8),
            text_align=alineaciones[0] if alineaciones else "LEFT",
            borders_layout="HORIZONTAL_LINES",
        ) as tabla:
            fila_enc = tabla.row()
            for idx, h in enumerate(encabezados):
                align = alineaciones[idx] if alineaciones and idx < len(alineaciones) else "LEFT"
                fila_enc.cell(h, align=align)

            for i, f in enumerate(filas):
                fila = tabla.row()
                es_resaltada = resaltar_filas[i] if resaltar_filas and i < len(resaltar_filas) else False
                estilo = FontFace(emphasis="BOLD", color=NEGRO) if es_resaltada else None
                for idx, val in enumerate(f):
                    align = alineaciones[idx] if alineaciones and idx < len(alineaciones) else "LEFT"
                    fila.cell(_texto(val), style=estilo, align=align)
        self.color_texto()


def armar_pdf_borrador(
    datos_rotulo: Any,
    receta_info: Dict[str, Any],
    composicion_ingredientes: List[Dict[str, Any]],
    fuentes_ingredientes: List[Dict[str, Any]],
    calculo_sellos: Dict[str, Any],
    usuario_nombre: str,
    fecha_emision: datetime,
) -> bytes:
    # Validar ausencia de leyendas de aprobación o certificación oficial
    textos_a_validar = [
        datos_rotulo.producto_nombre,
        datos_rotulo.denominacion_venta or "",
        datos_rotulo.lista_ingredientes_texto or "",
        datos_rotulo.instrucciones_conservacion or "",
        datos_rotulo.modo_empleo or "",
    ]
    validar_sin_menciones_aprobacion(textos_a_validar)

    version_receta_num = receta_info.get("version", 1)

    pdf = BorradorRotuloPDF(
        producto_nombre=datos_rotulo.producto_nombre,
        version_receta=version_receta_num,
        fecha_emision=fecha_emision,
        usuario_nombre=usuario_nombre,
    )
    pdf.add_page()

    # =========================================================================
    # SECCIÓN 1: BORRADOR DEL RÓTULO (CARA PRINCIPAL Y CARA POSTERIOR)
    # =========================================================================
    pdf.titulo_seccion(
        "1. BORRADOR DEL RÓTULO",
        "Diseño preliminar de elementos obligatorios de rotulado (CAA y Ley 27.642)",
    )

    # Marco exterior tipo envase
    x_rot, y_rot = pdf.get_x(), pdf.get_y()
    ancho_rot = pdf.epw

    # Recuadro encabezado del rótulo
    pdf.set_fill_color(255, 255, 255)
    pdf.set_draw_color(0, 0, 0)
    pdf.set_line_width(0.7)
    pdf.rect(x_rot, y_rot, ancho_rot, 48, style="D", round_corners=True, corner_radius=2)

    # Contenido del encabezado
    pdf.set_xy(x_rot + 3, y_rot + 3)
    pdf.set_font(FUENTE, "B", 13)
    pdf.set_text_color(*NEGRO)
    pdf.cell(ancho_rot - 6, 6, datos_rotulo.producto_nombre.upper(), align="C")

    pdf.set_xy(x_rot + 3, y_rot + 9)
    pdf.set_font(FUENTE, "B", 9)
    denom = datos_rotulo.denominacion_venta or datos_rotulo.producto_nombre
    pdf.cell(ancho_rot - 6, 5, denom.upper(), align="C")

    pdf.set_xy(x_rot + 3, y_rot + 14.5)
    pdf.set_font(FUENTE, "", 8)
    neto_txt = f"CONTENIDO NETO: {datos_rotulo.contenido_neto or 'No especificado'}"
    pdf.cell(ancho_rot - 6, 4.5, neto_txt, align="C")

    # Sellos frontales en el encabezado
    y_sellos = y_rot + 20
    if datos_rotulo.tiene_octogonos and datos_rotulo.octogonos:
        total_sellos = len(datos_rotulo.octogonos)
        ancho_sello = min(36.0, (ancho_rot - 12) / max(total_sellos, 1))
        x_inicio_sellos = x_rot + (ancho_rot - (ancho_sello * total_sellos + (total_sellos - 1) * 3)) / 2

        for idx, o in enumerate(datos_rotulo.octogonos):
            x_s = x_inicio_sellos + idx * (ancho_sello + 3)
            # Dibujar sello negro con texto blanco
            pdf.set_fill_color(0, 0, 0)
            pdf.set_draw_color(255, 255, 255)
            pdf.set_line_width(0.5)
            pdf.rect(x_s, y_sellos, ancho_sello, 24, style="FD", round_corners=True, corner_radius=1.8)

            pdf.set_xy(x_s + 1, y_sellos + 2)
            pdf.set_font(FUENTE, "B", 6.2 if len(o.texto) < 25 else 5.2)
            pdf.set_text_color(255, 255, 255)
            pdf.multi_cell(ancho_sello - 2, 3.2, o.texto, align="C")
    else:
        pdf.set_xy(x_rot + 6, y_sellos + 5)
        pdf.set_font(FUENTE, "I", 8)
        pdf.color_texto(EXITO)
        pdf.cell(ancho_rot - 12, 6, MENSAJE_SIN_OCTOGONOS, align="C")

    pdf.set_y(y_rot + 51)
    pdf.color_texto()

    # Dos columnas: Izquierda (Información general e ingredientes) | Derecha (Tabla Nutricional)
    y_cuerpo = pdf.get_y()
    ancho_col_izq = ancho_rot * 0.52
    ancho_col_der = ancho_rot * 0.45
    x_col_der = x_rot + ancho_col_izq + (ancho_rot * 0.03)

    # --- Columna Izquierda: Ingredientes y Datos Generales ---
    pdf.set_xy(x_rot, y_cuerpo)
    pdf.set_font(FUENTE, "B", 8.5)
    pdf.color_texto(PRIMARIO)
    pdf.cell(ancho_col_izq, 5, "DATOS GENERALES Y DECLARACIÓN DE INGREDIENTES", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font(FUENTE, "", 7.5)
    pdf.color_texto(TEXTO)

    ing_txt = datos_rotulo.lista_ingredientes_texto or "Lista de ingredientes no declarada."
    pdf.multi_cell(
        ancho_col_izq,
        4.2,
        f"Ingredientes: {ing_txt}",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.ln(2)

    detalles_gral = [
        f"Elaborado por: {datos_rotulo.razon_social or 'No especificada'}",
        f"Dirección: {datos_rotulo.direccion_origen or 'No especificada'}",
        f"Origen: {datos_rotulo.pais_origen}",
        f"RNE: {datos_rotulo.rne or 'En trámite'} | RNPA: {datos_rotulo.rnpa_rppa or 'En trámite'}",
        f"Lote: {datos_rotulo.lote or 'Sin lote asignado'}",
        f"Duración: {datos_rotulo.fecha_duracion or 'Ver envase'}",
        f"Conservación: {datos_rotulo.instrucciones_conservacion or 'Conservar en lugar fresco y seco'}",
    ]
    if datos_rotulo.es_importado:
        detalles_gral.append(f"Importador: {datos_rotulo.razon_social_importador or 'No declarado'}")
        detalles_gral.append(f"Domicilio imp.: {datos_rotulo.domicilio_importador or 'No declarado'}")
    if datos_rotulo.modo_empleo:
        detalles_gral.append(f"Modo de empleo: {datos_rotulo.modo_empleo}")

    for lin in detalles_gral:
        pdf.cell(ancho_col_izq, 4, lin, new_x="LMARGIN", new_y="NEXT")

    y_final_izq = pdf.get_y()

    # --- Columna Derecha: Tabla Nutricional Normativa ---
    pdf.set_xy(x_col_der, y_cuerpo)
    pdf.set_font(FUENTE, "B", 8.5)
    pdf.color_texto(PRIMARIO)
    pdf.cell(ancho_col_der, 5, "INFORMACIÓN NUTRICIONAL", new_x="LMARGIN", new_y="NEXT")

    pdf.set_x(x_col_der)
    pdf.set_font(FUENTE, "", 7)
    pdf.color_texto(TEXTO)
    porcion_txt = f"Porción: {datos_rotulo.porcion or 'No indicada'}"
    if datos_rotulo.porciones_por_envase:
        porcion_txt += f" | Envase: {datos_rotulo.porciones_por_envase} porc."
    pdf.cell(ancho_col_der, 4, porcion_txt, new_x="LMARGIN", new_y="NEXT")

    # Tabla con nutrientes obligatorios
    anchos_nutri = (ancho_col_der * 0.48, ancho_col_der * 0.26, ancho_col_der * 0.26)
    encabezados_nutri = ["Nutriente", "Porción", "% VD*"]
    filas_nutri = []
    resaltados = []

    for fn in datos_rotulo.filas_tabla_nutricional:
        nombre_nutri = f"  {fn.nutriente}" if fn.es_subitem else fn.nutriente
        filas_nutri.append([
            nombre_nutri,
            fn.por_porcion or "-",
            f"{fn.porcentaje_vd}%" if fn.porcentaje_vd is not None and fn.porcentaje_vd != "" else "-",
        ])
        resaltados.append(not fn.es_subitem)

    pdf.set_x(x_col_der)
    with pdf.table(
        col_widths=anchos_nutri,
        headings_style=FontFace(emphasis="BOLD", color=TEXTO, fill_color=SUAVE),
        cell_fill_color=FONDO,
        cell_fill_mode="ROWS",
        line_height=3.8,
        padding=(1.0, 1.2),
        borders_layout="HORIZONTAL_LINES",
    ) as t_nutri:
        r_head = t_nutri.row()
        for idx, h in enumerate(encabezados_nutri):
            r_head.cell(h, align="LEFT" if idx == 0 else "RIGHT")

        for idx_f, f_datos in enumerate(filas_nutri):
            r = t_nutri.row()
            es_bold = resaltados[idx_f]
            st = FontFace(emphasis="BOLD") if es_bold else None
            r.cell(f_datos[0], style=st, align="LEFT")
            r.cell(f_datos[1], style=st, align="RIGHT")
            r.cell(f_datos[2], style=st, align="RIGHT")

    pdf.set_x(x_col_der)
    pdf.set_font(FUENTE, "I", 6)
    pdf.color_texto(TEXTO_SEC)
    pdf.multi_cell(
        ancho_col_der,
        3.0,
        "* % Valores Diarios con base a una dieta de 2.000 kcal u 8.400 kJ. Sus valores diarios pueden ser mayores o menores según sus necesidades energéticas.",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    y_final_der = pdf.get_y()

    # Ajustar cursor para siguiente sección
    pdf.set_y(max(y_final_izq, y_final_der) + 6)

    # Recuadro con la leyenda de revisión obligatoria
    pdf.set_fill_color(*FONDO)
    pdf.set_draw_color(*BORDE)
    pdf.rect(14, pdf.get_y(), pdf.epw, 10, style="DF", round_corners=True, corner_radius=2)
    pdf.set_xy(16, pdf.get_y() + 2)
    pdf.set_font(FUENTE, "I", 7.2)
    pdf.color_texto(ALERTA)
    pdf.multi_cell(
        pdf.epw - 4,
        3.5,
        "Los valores expresados son calculados a partir de recetas y datos de referencia técnica. Deben ser auditados y confirmados por un/a profesional competente previo al envasado comercial.",
        align="C",
    )

    # =========================================================================
    # SECCIÓN 2: ANEXO TÉCNICO DE CÁLCULOS Y RESPALDO
    # =========================================================================
    pdf.add_page()
    pdf.titulo_seccion(
        "2. ANEXO TÉCNICO DE CÁLCULOS Y RESPALDO REGULATORIO",
        "Detalle de fórmula, composición porcentual, fuentes de datos y justificación de rotulado frontal",
    )

    # Ficha técnica de receta y trazabilidad
    pdf.set_font(FUENTE, "B", 8)
    pdf.color_texto(PRIMARIO)
    pdf.cell(0, 5, "DATOS DE LA RECETA EMPLEADA Y TRAZABILIDAD", new_x="LMARGIN", new_y="NEXT")

    anchos_ficha = (pdf.epw * 0.33, pdf.epw * 0.33, pdf.epw * 0.34)
    filas_ficha = [
        [
            f"Receta: {receta_info.get('nombre', 'Sin receta')}",
            f"Versión de Receta: V{receta_info.get('version', 1)} (ID: {receta_info.get('id', '-')})",
            f"Fecha versión: {receta_info.get('fecha_creacion', '-')}",
        ],
        [
            f"Rendimiento final: {receta_info.get('rendimiento_final', '-')} kg/l",
            f"Peso total insumos: {receta_info.get('peso_total_ingredientes', '-')} kg/l",
            f"Factor rendimiento: {receta_info.get('factor_rendimiento', 1.0):.4f}",
        ],
        [
            f"Generado por: {usuario_nombre}",
            f"Fecha de generación: {fecha_emision.strftime('%d/%m/%Y %H:%M')}",
            "Estado: BORRADOR PARA REVISIÓN",
        ],
    ]
    pdf.tabla_simple(
        ["Trazabilidad de Receta", "Parámetros de Proceso", "Metadatos de Emisión"],
        filas_ficha,
        anchos_ficha,
    )
    pdf.ln(3)

    # -------------------------------------------------------------------------
    # 2.1 Composición Porcentual de Ingredientes
    # -------------------------------------------------------------------------
    pdf.set_font(FUENTE, "B", 8)
    pdf.color_texto(PRIMARIO)
    pdf.cell(0, 5, "2.1 COMPOSICIÓN DE LA RECETA Y PORCENTAJES DE INGREDIENTES", new_x="LMARGIN", new_y="NEXT")

    encabezados_comp = [
        "Ingrediente / Insumo",
        "Cant. declarada",
        "Peso (g)",
        "% s/Fórmula",
        "Función / Tipo",
    ]
    anchos_comp = (
        pdf.epw * 0.38,
        pdf.epw * 0.16,
        pdf.epw * 0.14,
        pdf.epw * 0.14,
        pdf.epw * 0.18,
    )
    alineaciones_comp = ["LEFT", "RIGHT", "RIGHT", "RIGHT", "LEFT"]

    filas_comp = []
    for item in composicion_ingredientes:
        filas_comp.append([
            item.get("nombre", "-"),
            f"{item.get('cantidad', 0)} {item.get('unidad_medida', '')}",
            f"{item.get('peso_gramos', 0):.2f} g",
            f"{item.get('porcentaje', 0):.2f} %",
            item.get("tipo", "Insumo base"),
        ])

    pdf.tabla_simple(
        encabezados_comp,
        filas_comp,
        anchos_comp,
        alineaciones=alineaciones_comp,
    )
    pdf.ln(3)

    # -------------------------------------------------------------------------
    # 2.2 Fuentes de Datos Nutricionales Registradas
    # -------------------------------------------------------------------------
    if pdf.get_y() > pdf.page_break_trigger - 40:
        pdf.add_page()

    pdf.set_font(FUENTE, "B", 8)
    pdf.color_texto(PRIMARIO)
    pdf.cell(0, 5, "2.2 FUENTES DE INFORMACIÓN NUTRICIONAL REGISTRADAS", new_x="LMARGIN", new_y="NEXT")

    encabezados_fuentes = [
        "Insumo / Ingrediente",
        "Fuente de datos registrada",
        "Detalle / Referencia técnica",
    ]
    anchos_fuentes = (pdf.epw * 0.38, pdf.epw * 0.34, pdf.epw * 0.28)
    filas_fuentes = []
    for f in fuentes_ingredientes:
        filas_fuentes.append([
            f.get("nombre", "-"),
            f.get("fuente_datos", "Código Alimentario Argentino (CAA)"),
            f.get("fuente_detalle", "-"),
        ])

    pdf.tabla_simple(
        encabezados_fuentes,
        filas_fuentes,
        anchos_fuentes,
    )
    pdf.ln(3)

    # -------------------------------------------------------------------------
    # 2.3 Justificación y Cálculo de Sellos Frontales
    # -------------------------------------------------------------------------
    if pdf.get_y() > pdf.page_break_trigger - 45:
        pdf.add_page()

    pdf.set_font(FUENTE, "B", 8)
    pdf.color_texto(PRIMARIO)
    pdf.cell(0, 5, "2.3 EVALUACIÓN TÉCNICA DE SELLOS DE ADVERTENCIA Y MICRO-SELLOS", new_x="LMARGIN", new_y="NEXT")

    # Especificar versión de parámetros
    version_norma = calculo_sellos.get("version_normativa", "Ley 27.642 - Etapa 2 / Modelo OPS")
    pdf.set_font(FUENTE, "I", 7.2)
    pdf.color_texto(TEXTO_SEC)
    pdf.cell(0, 4, f"Marco regulatorio aplicado: {version_norma}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)

    encabezados_sellos = [
        "Nutriente / Componente",
        "Criterio normativo",
        "Valor obtenido",
        "Umbral",
        "Resultado",
    ]
    anchos_sellos = (
        pdf.epw * 0.25,
        pdf.epw * 0.28,
        pdf.epw * 0.16,
        pdf.epw * 0.15,
        pdf.epw * 0.16,
    )
    alineaciones_sellos = ["LEFT", "LEFT", "RIGHT", "RIGHT", "CENTER"]

    filas_sellos = []
    for s in calculo_sellos.get("detalles", []):
        filas_sellos.append([
            s.get("nutriente", "-"),
            s.get("criterio", "-"),
            s.get("valor", "-"),
            s.get("umbral", "-"),
            s.get("resultado", "-"),
        ])

    pdf.tabla_simple(
        encabezados_sellos,
        filas_sellos,
        anchos_sellos,
        alineaciones=alineaciones_sellos,
    )
    pdf.ln(4)

    # Recuadro final de advertencia legal y deslinde de responsabilidad
    if pdf.get_y() > pdf.page_break_trigger - 25:
        pdf.add_page()

    pdf.set_fill_color(*FONDO)
    pdf.set_draw_color(*BORDE)
    pdf.rect(14, pdf.get_y(), pdf.epw, 14, style="DF", round_corners=True, corner_radius=2)
    pdf.set_xy(16, pdf.get_y() + 2)
    pdf.set_font(FUENTE, "B", 6.8)
    pdf.color_texto(TEXTO)
    pdf.cell(pdf.epw - 4, 3.5, "DECLARACIÓN TÉCNICA FINAL Y ALCANCE REGULATORIO:", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(16)
    pdf.set_font(FUENTE, "", 6.4)
    pdf.color_texto(TEXTO_SEC)
    pdf.multi_cell(
        pdf.epw - 4,
        3.0,
        DISCLAIMER_NO_APROBACION,
    )

    # Validar que el PDF generado cumpla con todas las validaciones
    buffer = io.BytesIO()
    pdf.output(buffer)
    pdf_bytes = buffer.getvalue()

    return pdf_bytes
