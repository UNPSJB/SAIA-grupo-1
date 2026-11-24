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


reemplazos = {
    "≥": ">= ",
    "≤": "<= ",
    "×": "x",
    "÷": "/",
    "≠": "!=",
    "—": "-",
    "–": "-",
    "•": "*",
    "…": "...",
    "“": '"',
    "”": '"',
    "‘": "'",
    "’": "'",
}


def _texto(valor: Any) -> str:
    if valor is None or valor == "":
        return "-"
    s = str(valor)
    for orig, rep in reemplazos.items():
        s = s.replace(orig, rep)
    return s.encode("windows-1252", "replace").decode("windows-1252")


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
        self.set_margins(14, 20, 14)
        self.set_auto_page_break(auto=True, margin=16)
        self.set_title(f"Borrador de Rótulo - {producto_nombre}")
        self.set_author(usuario_nombre)
        self.set_creator("SAIA")

    def color_texto(self, color=NEGRO):
        self.set_text_color(*color)

    def header(self):
        # Banda roja superior de advertencia de borrador (mismo ancho exacto de la tabla)
        self.set_fill_color(*ROJO_FONDO)
        self.set_draw_color(*ROJO_BORDE)
        self.set_line_width(0.4)
        self.rect(14, 8, self.epw, 7.5, style="DF", round_corners=True, corner_radius=1.5)

        self.set_xy(14, 9.8)
        self.set_font(FUENTE, "B", 6.8)
        self.set_text_color(*ROJO_TEXTO)
        self.cell(self.epw, 4, _texto("[!] BORRADOR: DEBE SER REVISADO POR UN/A PROFESIONAL Y POR LA AUTORIDAD SANITARIA COMPETENTE ANTES DE SU USO"), align="C")

        self.set_y(19.5)
        self.color_texto()

    def footer(self):
        # Pie de página limpio y discreto sin aviso de borrador (solo numeración)
        self.set_draw_color(*BORDE)
        self.set_line_width(0.3)
        self.line(14, self.h - 12, self.w - 14, self.h - 12)

        self.set_xy(14, self.h - 10)
        self.set_font(FUENTE, "", 7)
        self.set_text_color(100, 116, 139)
        self.cell(0, 4, f"Página {self.page_no()} de {{nb}}", align="R")

    def titulo_seccion(self, titulo: str, subtitulo: Optional[str] = None):
        if self.get_y() > self.page_break_trigger - 35:
            self.add_page()
        self.ln(3)
        self.set_font(FUENTE, "B", 10)
        self.set_text_color(*NEGRO)
        self.cell(0, 5, _texto(titulo), new_x="LMARGIN", new_y="NEXT")
        if subtitulo:
            self.set_font(FUENTE, "I", 7)
            self.set_text_color(100, 116, 139)
            self.cell(0, 3.5, _texto(subtitulo), new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(203, 213, 225)
        self.set_line_width(0.4)
        self.line(14, self.get_y() + 0.5, 45, self.get_y() + 0.5)
        self.ln(2.5)

    def tabla_simple(
        self,
        encabezados: Sequence[str],
        filas: Sequence[Sequence[Any]],
        anchos: Sequence[float],
        alineaciones: Optional[Sequence[str]] = None,
        resaltar_filas: Optional[Sequence[bool]] = None,
    ):
        self.set_font(FUENTE, size=7.5)
        self.set_draw_color(226, 232, 240)
        self.set_line_width(0.2)

        with self.table(
            col_widths=anchos,
            headings_style=FontFace(family=FUENTE, emphasis="BOLD", color=(255, 255, 255), fill_color=(30, 41, 59)),
            line_height=4.6,
            padding=(1.4, 1.8),
            text_align=alineaciones[0] if alineaciones else "LEFT",
            borders_layout="ALL",
        ) as tabla:
            fila_enc = tabla.row()
            for idx, h in enumerate(encabezados):
                align = alineaciones[idx] if alineaciones and idx < len(alineaciones) else "LEFT"
                fila_enc.cell(_texto(h), align=align)

            for i, f in enumerate(filas):
                fill = (248, 250, 252) if i % 2 == 1 else (255, 255, 255)
                es_resaltada = resaltar_filas[i] if resaltar_filas and i < len(resaltar_filas) else False
                estilo = (
                    FontFace(family=FUENTE, emphasis="BOLD", color=(30, 41, 59), fill_color=fill)
                    if es_resaltada
                    else FontFace(family=FUENTE, color=(30, 41, 59), fill_color=fill)
                )
                fila = tabla.row(style=estilo)
                for idx, val in enumerate(f):
                    align = alineaciones[idx] if alineaciones and idx < len(alineaciones) else "LEFT"
                    fila.cell(_texto(val), align=align)
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
    # PÁGINA 1: BORRADOR DEL RÓTULO
    # =========================================================================
    ancho_rot = pdf.epw
    x_rot = pdf.l_margin

    # Título principal sin numeración
    pdf.set_xy(x_rot, 19.5)
    pdf.set_font(FUENTE, "B", 12)
    pdf.set_text_color(*NEGRO)
    pdf.cell(ancho_rot, 5.5, "Borrador de Rótulo", new_x="LMARGIN", new_y="NEXT")

    y_card = pdf.get_y() + 1.0

    # Determinar sellos y dimensiones (tamaño más amplio y visible)
    tiene_sellos = bool(datos_rotulo.tiene_octogonos and datos_rotulo.octogonos)
    total_sellos = len(datos_rotulo.octogonos) if tiene_sellos else 0
    S_oct = 23.0 if total_sellos >= 4 else 26.0

    # Cabecera de la tarjeta
    pdf.set_xy(x_rot + 3, y_card + 5)
    pdf.set_font(FUENTE, "B", 15)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(ancho_rot - 6, 5.8, _texto(datos_rotulo.producto_nombre), align="C")

    pdf.set_xy(x_rot + 3, y_card + 11.5)
    pdf.set_font(FUENTE, "B", 9)
    pdf.set_text_color(30, 41, 59)
    denom = datos_rotulo.denominacion_venta or datos_rotulo.producto_nombre
    pdf.cell(ancho_rot - 6, 4.2, _texto(denom.upper()), align="C")

    pdf.set_xy(x_rot + 3, y_card + 16.2)
    pdf.set_font(FUENTE, "", 8)
    pdf.set_text_color(71, 85, 105)
    neto_txt = f"CONTENIDO NETO: {datos_rotulo.contenido_neto or 'No especificado'}"
    pdf.cell(ancho_rot - 6, 3.8, _texto(neto_txt), align="C")

    # Sellos frontales (Octógonos regulares oficiales Ley 27.642)
    if tiene_sellos:
        y_sellos = y_card + 21.0
        gap = 5.0
        anchos_s = [46.0 if getattr(o, "tipo", "octogono") == "micro_sello" else S_oct for o in datos_rotulo.octogonos]
        tot_w = sum(anchos_s) + (total_sellos - 1) * gap
        if tot_w > ancho_rot - 12:
            f_scale = (ancho_rot - 12) / tot_w
            anchos_s = [w * f_scale for w in anchos_s]
            gap *= f_scale
            S_oct *= f_scale
            tot_w = ancho_rot - 12
        x_start_s = x_rot + (ancho_rot - tot_w) / 2
        x_act = x_start_s

        for idx_s, o in enumerate(datos_rotulo.octogonos):
            w_i = anchos_s[idx_s]
            tipo_item = getattr(o, "tipo", "octogono")
            texto_item = getattr(o, "texto", str(o))

            if tipo_item == "micro_sello":
                # Micro-sello rectangular (edulcorantes / cafeína)
                h_micro = 15.0
                y_micro = y_sellos + (S_oct - h_micro) / 2
                pdf.set_fill_color(0, 0, 0)
                pdf.rect(x_act, y_micro, w_i, h_micro, style="F", round_corners=True, corner_radius=1.2)

                b_m = 0.6
                pdf.set_draw_color(255, 255, 255)
                pdf.set_line_width(0.3)
                pdf.rect(x_act + b_m, y_micro + b_m, w_i - 2 * b_m, h_micro - 2 * b_m, style="D", round_corners=True, corner_radius=0.8)

                partes = texto_item.upper().split(" - ")
                l1 = partes[0] if len(partes) > 0 else texto_item
                l2 = partes[1] if len(partes) > 1 else ""

                pdf.set_text_color(255, 255, 255)
                pdf.set_font(FUENTE, "B", 5.0)
                pdf.set_xy(x_act + 1, y_micro + 2.0)
                pdf.cell(w_i - 2, 2.5, _texto(l1), align="C")
                if l2:
                    pdf.set_xy(x_act + 1, y_micro + 4.8)
                    pdf.cell(w_i - 2, 2.3, _texto(l2), align="C")

                pdf.set_font(FUENTE, "", 3.6)
                pdf.set_xy(x_act + 1, y_micro + (8.2 if l2 else 5.8))
                pdf.cell(w_i - 2, 2.0, "Ministerio de Salud", align="C")
            else:
                # Octógono regular de 8 lados (Ley 27.642)
                c = w_i * 0.2929
                pts = [
                    (x_act + c, y_sellos), (x_act + w_i - c, y_sellos),
                    (x_act + w_i, y_sellos + c), (x_act + w_i, y_sellos + w_i - c),
                    (x_act + w_i - c, y_sellos + w_i), (x_act + c, y_sellos + w_i),
                    (x_act, y_sellos + w_i - c), (x_act, y_sellos + c),
                ]
                pdf.set_fill_color(0, 0, 0)
                pdf.polygon(pts, style="F")

                b_in = 0.75
                w_i2 = w_i - 2 * b_in
                c2 = w_i2 * 0.2929
                pts_in = [
                    (x_act + b_in + c2, y_sellos + b_in), (x_act + b_in + w_i2 - c2, y_sellos + b_in),
                    (x_act + b_in + w_i2, y_sellos + b_in + c2), (x_act + b_in + w_i2, y_sellos + b_in + w_i2 - c2),
                    (x_act + b_in + w_i2 - c2, y_sellos + b_in + w_i2), (x_act + b_in + c2, y_sellos + b_in + w_i2),
                    (x_act + b_in, y_sellos + b_in + w_i2 - c2), (x_act + b_in, y_sellos + b_in + c2),
                ]
                pdf.set_draw_color(255, 255, 255)
                pdf.set_line_width(0.38)
                pdf.polygon(pts_in, style="D")

                txt_u = texto_item.upper().strip()
                if txt_u.startswith("EXCESO EN "):
                    resto = txt_u[len("EXCESO EN "):].strip()
                    pw = resto.split()
                    lineas = ["EXCESO EN", pw[0]] if len(pw) == 1 else (["EXCESO EN", pw[0], pw[1]] if len(pw) == 2 else ["EXCESO EN", " ".join(pw[:2]), " ".join(pw[2:])])
                else:
                    pw = txt_u.split()
                    lineas = [txt_u] if len(pw) <= 2 else [" ".join(pw[:2]), " ".join(pw[2:])]

                pdf.set_text_color(255, 255, 255)
                f_size = 5.4 if len(lineas) >= 3 else 6.2
                lh = 2.5 if len(lineas) >= 3 else 2.9
                tot_th = len(lineas) * lh + 0.8 + 2.0
                y_st = y_sellos + (w_i - tot_th) / 2
                pdf.set_font(FUENTE, "B", f_size)
                for il, l in enumerate(lineas):
                    pdf.set_xy(x_act + 1.2, y_st + il * lh)
                    pdf.cell(w_i - 2.4, lh, _texto(l), align="C")

                pdf.set_xy(x_act + 1.2, y_st + len(lineas) * lh + 0.8)
                pdf.set_font(FUENTE, "", 3.6)
                pdf.cell(w_i - 2.4, 1.9, "Ministerio de Salud", align="C")

            x_act += w_i + gap

        y_sep = y_sellos + S_oct + 4.5
    else:
        pdf.set_xy(x_rot + 6, y_card + 20.0)
        pdf.set_font(FUENTE, "I", 7.5)
        pdf.set_text_color(22, 101, 52)
        pdf.cell(ancho_rot - 12, 4.0, _texto(MENSAJE_SIN_OCTOGONOS), align="C")
        y_sep = y_card + 26.5

    # Línea separadora horizontal interior
    pdf.set_draw_color(203, 213, 225)
    pdf.set_line_width(0.3)
    pdf.line(x_rot + 4, y_sep, x_rot + ancho_rot - 4, y_sep)

    # Distribución en dos columnas (Información del Producto / Información Nutricional)
    y_cols = y_sep + 3.5
    w_col = (ancho_rot - 10) / 2
    x_col_izq = x_rot + 3
    x_col_der = x_col_izq + w_col + 4

    # --- Columna Izquierda: Información del Producto ---
    pdf.set_xy(x_col_izq, y_cols)
    pdf.set_font(FUENTE, "B", 8)
    pdf.set_text_color(*NEGRO)
    pdf.cell(w_col, 4.2, "INFORMACIÓN DEL PRODUCTO", new_x="LMARGIN", new_y="NEXT")
    pdf.set_draw_color(203, 213, 225)
    pdf.set_line_width(0.2)
    pdf.line(x_col_izq, y_cols + 4.8, x_col_izq + w_col, y_cols + 4.8)

    y_izq = y_cols + 6.5
    pdf.set_xy(x_col_izq, y_izq)
    pdf.set_font(FUENTE, "", 6.8)
    pdf.set_text_color(*NEGRO)
    ing_txt = datos_rotulo.lista_ingredientes_texto or "Lista de ingredientes no declarada."
    pdf.multi_cell(w_col, 3.2, _texto(f"Ingredientes: {ing_txt}"))

    if datos_rotulo.texto_alergenos:
        pdf.set_x(x_col_izq)
        pdf.set_font(FUENTE, "B", 6.8)
        pdf.multi_cell(w_col, 3.2, _texto(datos_rotulo.texto_alergenos))

    if datos_rotulo.texto_puede_contener:
        pdf.set_x(x_col_izq)
        pdf.set_font(FUENTE, "B", 6.8)
        pdf.multi_cell(w_col, 3.2, _texto(datos_rotulo.texto_puede_contener))

    pdf.set_font(FUENTE, "", 6.8)
    detalles_g = [
        f"Elaborado por: {datos_rotulo.razon_social or 'SAIA Alimentos S.A.'}",
        f"Dirección: {datos_rotulo.direccion_origen or 'Parque Industrial Trelew, Chubut'}",
        f"Origen: {datos_rotulo.pais_origen}",
        f"RNE: {datos_rotulo.rne or 'Trámite pendiente'}",
        f"RNPA/RPPA: {datos_rotulo.rnpa_rppa or 'Trámite pendiente'}",
        f"Lote: {datos_rotulo.lote or 'Sin lote asignado'}",
        f"Duración: {datos_rotulo.fecha_duracion or 'Ver envase'}",
        f"Conservación: {datos_rotulo.instrucciones_conservacion or 'Conservar en lugar fresco y seco'}",
    ]
    if datos_rotulo.es_importado:
        detalles_g.append(f"Importador: {datos_rotulo.razon_social_importador or 'No declarado'}")
    if datos_rotulo.modo_empleo:
        detalles_g.append(f"Modo de empleo: {datos_rotulo.modo_empleo}")

    for d in detalles_g:
        pdf.set_x(x_col_izq)
        pdf.cell(w_col, 3.2, _texto(d), new_x="LMARGIN", new_y="NEXT")

    y_fin_izq = pdf.get_y()

    # --- Columna Derecha: Información Nutricional ---
    pdf.set_xy(x_col_der, y_cols)
    pdf.set_font(FUENTE, "B", 8)
    pdf.set_text_color(*NEGRO)
    pdf.cell(w_col, 4.2, "INFORMACIÓN NUTRICIONAL", new_x="LMARGIN", new_y="NEXT")
    pdf.set_draw_color(203, 213, 225)
    pdf.set_line_width(0.2)
    pdf.line(x_col_der, y_cols + 4.8, x_col_der + w_col, y_cols + 4.8)

    y_der = y_cols + 6.5
    pdf.set_xy(x_col_der, y_der)
    pdf.set_font(FUENTE, "", 6.8)
    pdf.set_text_color(*NEGRO)
    porc_str = f"Porción: {datos_rotulo.porcion or 'No indicada'}"
    if datos_rotulo.porciones_por_envase:
        porc_str += f" | Porciones por envase: {datos_rotulo.porciones_por_envase}"
    pdf.cell(w_col, 3.2, _texto(porc_str))

    y_tab = y_der + 4.5
    w_n, w_p, w_vd = 44.0, 23.0, 19.0
    pdf.set_xy(x_col_der, y_tab)
    pdf.set_fill_color(30, 41, 59)
    pdf.set_font(FUENTE, "B", 6.8)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(w_n, 4.2, "Nutriente", border=0, fill=True)
    pdf.cell(w_p, 4.2, "Por porción", border=0, fill=True, align="R")
    pdf.cell(w_vd, 4.2, "% VD*", border=0, fill=True, align="R")

    cur_y_r = y_tab + 4.2
    for idx_fn, fn in enumerate(datos_rotulo.filas_tabla_nutricional):
        pdf.set_xy(x_col_der, cur_y_r)
        fill_bg = (248, 250, 252) if idx_fn % 2 == 1 else (255, 255, 255)
        pdf.set_fill_color(*fill_bg)
        es_sub = fn.es_subitem
        pdf.set_font(FUENTE, "I" if es_sub else "B" if "Valor energ" in fn.nutriente else "", 6.4)
        pdf.set_text_color(30, 41, 59)
        nom_n = f"  {fn.nutriente}" if es_sub else fn.nutriente

        vd_raw = str(fn.porcentaje_vd or "").strip()
        if not vd_raw or vd_raw == "-":
            vd_s = "-"
        elif vd_raw.endswith("%"):
            vd_s = vd_raw
        else:
            vd_s = f"{vd_raw} %"

        pdf.set_draw_color(226, 232, 240)
        pdf.set_line_width(0.2)
        pdf.cell(w_n, 3.8, _texto(nom_n), border="B", fill=True)
        pdf.cell(w_p, 3.8, _texto(fn.por_porcion or "-"), border="B", fill=True, align="R")
        pdf.cell(w_vd, 3.8, _texto(vd_s), border="B", fill=True, align="R")
        cur_y_r += 3.8

    pdf.set_xy(x_col_der, cur_y_r + 1.2)
    pdf.set_font(FUENTE, "I", 5.5)
    pdf.set_text_color(100, 116, 139)
    pdf.multi_cell(w_col, 2.5, _texto("* Valores Diarios con base a una dieta de 2.000 kcal u 8.400 kJ."))
    y_fin_der = pdf.get_y()

    y_bottom_cols = max(y_fin_izq, y_fin_der) + 3.0

    # Pie interno de la tarjeta
    pdf.set_draw_color(226, 232, 240)
    pdf.set_line_width(0.2)
    pdf.line(x_rot + 4, y_bottom_cols, x_rot + ancho_rot - 4, y_bottom_cols)

    pdf.set_xy(x_rot + 3, y_bottom_cols + 5.2)
    pdf.set_font(FUENTE, "B", 6.0)
    pdf.set_text_color(*ROJO_TEXTO)
    pdf.cell(ancho_rot - 6, 2.8, _texto(LEYENDA_BORRADOR_OBLIGATORIA), align="C")

    alto_card = (y_bottom_cols + 9.0) - y_card

    # Marco exterior de la tarjeta
    pdf.set_draw_color(0, 0, 0)
    pdf.set_line_width(0.7)
    pdf.rect(x_rot, y_card, ancho_rot, alto_card, style="D", round_corners=True, corner_radius=2.5)
    pdf.set_y(y_card + alto_card + 5.0)

    # =========================================================================
    # ANEXO TÉCNICO DE CÁLCULOS (CONTINÚA DIRECTO SIN CORTE ARTIFICIAL)
    # =========================================================================

    # 1. Composición de la Receta
    pdf.titulo_seccion("Composición de la Receta", "Porcentajes y aportes de insumos sobre fórmula")

    encabezados_comp = [
        "Ingrediente / Insumo",
        "Cant. declarada",
        "Peso (g)",
        "% Fórmula",
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

    # 2. Fuentes de Información Nutricional
    if pdf.get_y() > pdf.page_break_trigger - 40:
        pdf.add_page()

    pdf.titulo_seccion("Fuentes de Información Nutricional", "Referencias técnicas y tablas de composición empleadas")

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

    # 3. Evaluación de Sellos de Advertencia (Ley 27.642)
    if pdf.get_y() > pdf.page_break_trigger - 45:
        pdf.add_page()

    version_norma = calculo_sellos.get("version_normativa", "Ley 27.642 - Etapa 2 / Modelo OPS")
    pdf.titulo_seccion("Evaluación de Sellos de Advertencia (Ley 27.642)", f"Marco regulatorio aplicado: {version_norma}")

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
    pdf.ln(3)

    # 4. Trazabilidad de Receta y Emisión (al final de los cálculos técnicos)
    if pdf.get_y() > pdf.page_break_trigger - 35:
        pdf.add_page()

    pdf.titulo_seccion("Trazabilidad y Emisión de Documento", "Constancia de receta empleada, parámetros de proceso y responsable")

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
    pdf.ln(4)

    # Recuadro final de advertencia legal y deslinde de responsabilidad
    if pdf.get_y() > pdf.page_break_trigger - 25:
        pdf.add_page()

    pdf.set_fill_color(248, 250, 252)
    pdf.set_draw_color(203, 213, 225)
    pdf.rect(14, pdf.get_y(), pdf.epw, 14, style="DF", round_corners=True, corner_radius=2)
    pdf.set_xy(16, pdf.get_y() + 2)
    pdf.set_font(FUENTE, "B", 6.8)
    pdf.set_text_color(*NEGRO)
    pdf.cell(pdf.epw - 4, 3.5, "DECLARACIÓN TÉCNICA FINAL Y ALCANCE REGULATORIO:", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(16)
    pdf.set_font(FUENTE, "", 6.4)
    pdf.set_text_color(100, 116, 139)
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
