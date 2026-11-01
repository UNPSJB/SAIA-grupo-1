import io
from datetime import date, datetime
from typing import Optional, Sequence
from fpdf import FPDF, FontFace
from src.informes import schemas

# Colores de la paleta de la app (frontend/src/styles/tema.css, tema claro)
PRIMARIO = (40, 102, 168)        # --color-primario
TEXTO = (38, 55, 70)             # --color-texto
TEXTO_SEC = (113, 128, 140)      # --color-texto-sec
BORDE = (220, 228, 235)          # --color-borde
SUAVE = (220, 235, 250)          # --color-suave
FONDO = (245, 248, 252)          # --color-fondo
ERROR = (217, 92, 92)            # --color-error-texto
ALERTA = (181, 118, 10)          # --color-alerta-texto
EXITO = (47, 138, 87)            # --color-exito-texto

FUENTE = "helvetica"
SIN_REGISTROS = "Sin registros en el período."

# El mismo escudo con check que usa el logo del sidebar
LOGO_SVG = (
    b'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" '
    b'stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
    b'<path d="M12 3 4.5 6v5.5c0 4.4 3.1 8.3 7.5 9.5 4.4-1.2 7.5-5.1 7.5-9.5V6L12 3Z"/>'
    b'<path d="m8.8 12 2.4 2.4 4.2-4.4"/></svg>'
)

ORIGENES_VENCIMIENTO = {
    "personal": "Personal",
    "equipo": "Equipo",
    "documento": "Documento",
}

COLOR_ESTADO = {
    "No realizada": ALERTA,
    "Vencida": ERROR,
    "Realizada": EXITO,
}


def _texto(valor) -> str:
    """Las fuentes base de PDF solo cubren Windows-1252: lo que quede afuera (emojis, símbolos) se reemplaza
    en lugar de hacer fallar el informe entero."""
    if valor is None or valor == "":
        return "-"
    return str(valor).encode("windows-1252", "replace").decode("windows-1252")


def _fecha(valor: Optional[date]) -> str:
    return valor.strftime("%d/%m/%Y") if valor else "-"


def _fecha_hora(valor: Optional[datetime]) -> str:
    return valor.strftime("%d/%m/%Y %H:%M") if valor else "-"


def _porcentaje(valor: Optional[float]) -> str:
    return f"{valor:.1f} %".replace(".", ",") if valor is not None else "-"


class InformePDF(FPDF):
    def __init__(self, datos: schemas.DatosInforme):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.datos = datos
        self.core_fonts_encoding = "windows-1252"
        self.set_margins(15, 30, 15)
        self.set_auto_page_break(auto=True, margin=20)
        self.set_title("Informe de cumplimiento para inspección")
        self.set_author(datos.establecimiento.nombre)
        self.set_creator("SAIA")

    def color_texto(self, color=TEXTO):
        self.set_text_color(*color)

    def header(self):
        # marca: el logo de la app y su nombre
        self.set_fill_color(*PRIMARIO)
        self.rect(15, 11, 10, 10, style="F", round_corners=True, corner_radius=2.4)
        self.image(io.BytesIO(LOGO_SVG), x=16.6, y=12.6, w=6.8, h=6.8)

        self.set_xy(27.5, 11.2)
        self.set_font(FUENTE, "B", 13)
        self.color_texto()
        self.cell(40, 5.5, "SAIA")
        self.set_xy(27.5, 16.6)
        self.set_font(FUENTE, size=7.5)
        self.color_texto(TEXTO_SEC)
        self.cell(90, 4, "Sistema de apoyo para la inocuidad alimentaria")

        self.set_draw_color(*BORDE)
        self.set_line_width(0.3)
        self.line(15, 24.5, self.w - 15, 24.5)
        self.set_y(30)
        self.color_texto()

    def footer(self):
        self.set_draw_color(*BORDE)
        self.set_line_width(0.3)
        self.line(15, self.h - 14, self.w - 15, self.h - 14)
        self.set_xy(15, self.h - 12.5)
        self.set_font(FUENTE, size=7.5)
        self.color_texto(TEXTO_SEC)
        self.cell(0, 4, f"Página {self.page_no()} de {{nb}}", align="R")

    def titulo_seccion(self, numero: int, titulo: str):
        # si no entran el título y algunas filas, la sección arranca en la página siguiente
        if self.get_y() > self.page_break_trigger - 40:
            self.add_page()
        self.ln(6)
        self.set_font(FUENTE, "B", 12.5)
        self.color_texto()
        self.cell(0, 7, f"{numero}. {titulo}", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*PRIMARIO)
        self.set_line_width(0.8)
        self.line(15, self.get_y() + 0.5, 27, self.get_y() + 0.5)
        self.ln(4)

    def parrafo(self, texto: str):
        """Texto normal; acepta **negrita** al estilo markdown."""
        self.set_font(FUENTE, size=9.5)
        self.color_texto()
        self.multi_cell(0, 5.5, _texto(texto), markdown=True, align="L", new_x="LMARGIN", new_y="NEXT")

    def tabla(self, encabezados: Sequence[str], filas: Sequence[Sequence], anchos: Sequence[float], colores=None,
              alineacion: str = "LEFT"):
        """`colores` es opcional: por cada fila, un color de texto por celda (o None para el normal)."""
        if not filas:
            self.set_font(FUENTE, "I", 8.5)
            self.color_texto(TEXTO_SEC)
            self.cell(0, 6, SIN_REGISTROS, new_x="LMARGIN", new_y="NEXT")
            self.color_texto()
            return
        self.set_font(FUENTE, size=8)
        self.set_draw_color(*BORDE)
        self.set_line_width(0.2)
        with self.table(
            col_widths=anchos,
            headings_style=FontFace(emphasis="BOLD", color=TEXTO, fill_color=SUAVE),
            cell_fill_color=FONDO,
            cell_fill_mode="ROWS",
            line_height=4.4,
            padding=(1.6, 1.8),
            text_align=alineacion,
            borders_layout="HORIZONTAL_LINES",
        ) as tabla:
            fila = tabla.row()
            for encabezado in encabezados:
                fila.cell(encabezado)
            for i, valores in enumerate(filas):
                fila = tabla.row()
                for j, valor in enumerate(valores):
                    color = colores[i][j] if colores else None
                    fila.cell(_texto(valor), style=FontFace(color=color) if color else None)
        self.color_texto()


def _ficha(pdf: InformePDF, datos: schemas.DatosInforme):
    pdf.set_font(FUENTE, "B", 18)
    pdf.color_texto()
    pdf.cell(0, 9, "Informe de cumplimiento para inspección", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font(FUENTE, size=9)
    pdf.color_texto(TEXTO_SEC)
    pdf.cell(0, 5, "Checklists de limpieza, vencimientos e incidentes cerrados del período",
             new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    est = datos.establecimiento
    campos = [
        ("Establecimiento", est.nombre),
        ("Dirección", est.direccion),
        ("CUIT", est.cuit),
        ("Período informado", f"{_fecha(datos.desde)} al {_fecha(datos.hasta)}"),
        ("Fecha de emisión", _fecha_hora(datos.emitido_el)),
        ("Emitido por", datos.emitido_por),
    ]
    x0, y0 = pdf.l_margin, pdf.get_y()
    # la primera columna es más ancha porque lleva el nombre del establecimiento
    anchos_col = (pdf.epw * 0.40, pdf.epw * 0.32, pdf.epw * 0.28)
    alto_fila = 12
    pdf.set_fill_color(*FONDO)
    pdf.set_draw_color(*BORDE)
    pdf.set_line_width(0.3)
    pdf.rect(x0, y0, pdf.epw, alto_fila * 2 + 4, style="DF", round_corners=True, corner_radius=2)
    for i, (etiqueta, valor) in enumerate(campos):
        columna = i % 3
        x = x0 + 4 + sum(anchos_col[:columna])
        y = y0 + 3 + (i // 3) * alto_fila
        pdf.set_xy(x, y)
        pdf.set_font(FUENTE, "B", 6.5)
        pdf.set_char_spacing(0.4)
        pdf.color_texto(TEXTO_SEC)
        pdf.cell(anchos_col[columna] - 6, 3.5, etiqueta.upper())
        pdf.set_char_spacing(0)
        pdf.set_xy(x, y + 4)
        pdf.set_font(FUENTE, size=9)
        pdf.color_texto()
        pdf.cell(anchos_col[columna] - 6, 5, _texto(valor))
    pdf.set_y(y0 + alto_fila * 2 + 4)


def _seccion_cumplimiento(pdf: InformePDF, c: schemas.ResumenCumplimiento):
    pdf.titulo_seccion(1, "Cumplimiento de los checklists de limpieza")

    if c.porcentaje is None:
        pdf.parrafo("En el período no hubo tareas de limpieza con resultado para evaluar.")
    else:
        pdf.parrafo(
            f"En el período se evaluaron **{c.evaluadas}** tareas de limpieza y se realizaron **{c.cumplidas}**, "
            f"lo que representa un cumplimiento del **{_porcentaje(c.porcentaje)}**."
        )
    pdf.ln(2)
    pdf.tabla(
        ["Tareas evaluadas", "Realizadas", "No realizadas", "Vencidas", "Cumplimiento"],
        [[c.evaluadas, c.cumplidas, c.no_realizadas, c.vencidas, _porcentaje(c.porcentaje)]],
        anchos=(1, 1, 1, 1, 1),
        alineacion="CENTER",
    )

    if c.por_plan:
        pdf.ln(4)
        pdf.set_font(FUENTE, "B", 9)
        pdf.color_texto()
        pdf.cell(0, 6, "Por plan de limpieza", new_x="LMARGIN", new_y="NEXT")
        pdf.tabla(
            ["Plan", "Realizadas", "Incumplidas", "Cumplimiento"],
            [[p.nombre_plan, p.cumplidas, p.incumplidas, _porcentaje(p.porcentaje)] for p in c.por_plan],
            anchos=(4, 1.3, 1.3, 1.6),
        )


def _seccion_incumplidas(pdf: InformePDF, tareas: Sequence[schemas.TareaIncumplida]):
    pdf.titulo_seccion(2, "Tareas incumplidas y su justificación")

    def justificacion(t: schemas.TareaIncumplida) -> str:
        if not t.motivo:
            return "Sin justificación registrada"
        texto = t.motivo
        if t.observacion:
            texto += f": {t.observacion}"
        if t.marcada_el:
            texto += f" (registrada el {_fecha_hora(t.marcada_el)})"
        return texto

    pdf.tabla(
        ["Fecha", "Tarea", "Plan / Ubicación", "Responsable", "Estado", "Justificación"],
        [
            [
                _fecha(t.fecha),
                t.tarea,
                f"{t.plan} / {t.ubicacion}" if t.ubicacion else t.plan,
                t.responsable,
                t.estado,
                justificacion(t),
            ]
            for t in tareas
        ],
        anchos=(1.8, 2.6, 2.8, 2.4, 1.7, 4.7),
        colores=[[None, None, None, None, COLOR_ESTADO.get(t.estado), None] for t in tareas],
    )


def _seccion_reasignadas(pdf: InformePDF, tareas: Sequence[schemas.TareaReasignada]):
    pdf.titulo_seccion(3, "Tareas reasignadas")
    pdf.tabla(
        ["Fecha", "Tarea", "Plan", "Responsable original", "Reasignada a", "Resultado"],
        [
            [_fecha(t.fecha), t.tarea, t.plan, t.responsable_original, t.reasignada_a, t.resultado]
            for t in tareas
        ],
        anchos=(1.8, 2.8, 2.6, 2.6, 2.6, 2),
        colores=[[None] * 5 + [COLOR_ESTADO.get(t.resultado)] for t in tareas],
    )


def _seccion_vencimientos(pdf: InformePDF, vencimientos):
    pdf.titulo_seccion(4, "Vencimientos del período")
    pdf.tabla(
        ["Fecha", "Tipo", "Concepto", "Persona / Equipo"],
        [
            [_fecha(v.fecha), ORIGENES_VENCIMIENTO.get(v.origen.value, v.origen.value), v.concepto, v.responsable]
            for v in vencimientos
        ],
        anchos=(1.6, 1.6, 5, 3.5),
    )


def _seccion_incidentes(pdf: InformePDF, incidentes: Sequence[schemas.IncidenteCerrado]):
    pdf.titulo_seccion(5, "Incidentes cerrados")
    pdf.tabla(
        ["N°", "Reportado", "Cerrado", "Descripción", "Acción correctiva", "Resuelto por"],
        [
            [
                inc.id,
                f"{_fecha(inc.reportado_el.date())}\n{inc.reportado_por}",
                _fecha(inc.cerrado_el.date()),
                inc.descripcion,
                inc.accion_correctiva,
                inc.resuelto_por,
            ]
            for inc in incidentes
        ],
        anchos=(0.8, 2.4, 1.8, 4.2, 4.6, 2.2),
    )


def _firmas(pdf: InformePDF):
    espacio, alto_bloque = 18, 11
    if pdf.get_y() + espacio + alto_bloque > pdf.page_break_trigger:
        pdf.add_page()
        espacio = 8
    pdf.ln(espacio)
    y = pdf.get_y()
    ancho = (pdf.epw - 20) / 2
    pdf.set_draw_color(*TEXTO_SEC)
    pdf.set_line_width(0.3)
    for i, rol in enumerate(["Responsable del establecimiento", "Inspector/a actuante"]):
        x = pdf.l_margin + i * (ancho + 20)
        pdf.line(x, y, x + ancho, y)
        pdf.set_xy(x, y + 1.5)
        pdf.set_font(FUENTE, "B", 8)
        pdf.color_texto()
        pdf.cell(ancho, 4.5, "Firma y aclaración", align="C")
        pdf.set_xy(x, y + 6)
        pdf.set_font(FUENTE, size=7.5)
        pdf.color_texto(TEXTO_SEC)
        pdf.cell(ancho, 4, rol, align="C")


def generar_pdf(datos: schemas.DatosInforme) -> bytes:
    pdf = InformePDF(datos)
    pdf.add_page()
    _ficha(pdf, datos)
    _seccion_cumplimiento(pdf, datos.cumplimiento)
    _seccion_incumplidas(pdf, datos.tareas_incumplidas)
    _seccion_reasignadas(pdf, datos.tareas_reasignadas)
    _seccion_vencimientos(pdf, datos.vencimientos)
    _seccion_incidentes(pdf, datos.incidentes_cerrados)
    _firmas(pdf)
    return bytes(pdf.output())
