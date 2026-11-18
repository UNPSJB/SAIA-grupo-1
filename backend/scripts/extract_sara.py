import os
import json
import zipfile
import csv
import io

zip_path = r"C:/Users/Franco/.gemini/antigravity/brain/054ed01e-6cde-4e93-8a05-94cae662bc12/.user_uploaded/media_1794861850400_31e13149.zip"
out_dir = r"C:/Users/Franco/SAIA-grupo-1/backend/src/insumos/data"
os.makedirs(out_dir, exist_ok=True)
out_file = os.path.join(out_dir, "sara_alimentos.json")

CATEGORIAS = {
    'A': 'Cereales, legumbres y derivados',
    'B': 'Bebidas',
    'C': 'Carnes y derivados',
    'D': 'Dulces',
    'E': 'Alimentos pre-elaborados',
    'F': 'Frutas',
    'G': 'Grasas y aceites',
    'H': 'Hortalizas',
    'L': 'Leche y postres lácteos',
    'M': 'Condimentos, productos copetín, caldos y sopas',
    'P': 'Pescados',
    'Q': 'Quesos',
    'S': 'Suplementos vitamínicos y nutricionales',
    'U': 'Huevos',
    'Y': 'Yogures',
}

def to_float(val, default=0.0):
    if not val:
        return default
    try:
        f = float(val)
        return max(0.0, round(f, 2))
    except (ValueError, TypeError):
        return default

items = []
with zipfile.ZipFile(zip_path, 'r') as z:
    with z.open('Alimentos_export/AlimentoyComposicion.csv') as f:
        reader = csv.DictReader(io.TextIOWrapper(f, encoding='utf-8', errors='ignore'))
        for r in reader:
            codigo_raw = r['Codigo'].strip()
            nombre = r['Alimento'].strip()
            letra = codigo_raw[0].upper() if codigo_raw else 'A'
            categoria = CATEGORIAS.get(letra, 'Otros')

            kcal = to_float(r.get('E'))
            kj = round(kcal * 4.184, 2)
            prot = to_float(r.get('Prot'))
            grasas = to_float(r.get('Lip'))
            sat = to_float(r.get('AGSat'))
            hc = to_float(r.get('HCdisp'))
            if hc == 0.0:
                hc = to_float(r.get('HCtotal'))
            fibra = to_float(r.get('Fibra'))
            sodio = to_float(r.get('Na'))

            azucares = 0.0
            if categoria == 'Dulces':
                if 'azúcar' in nombre.lower() or 'azucar' in nombre.lower() or 'miel' in nombre.lower():
                    azucares = hc
                else:
                    azucares = round(hc * 0.7, 2)

            item = {
                'codigo': f"SARA-{codigo_raw}",
                'nombre': nombre,
                'categoria': categoria,
                'energia_kcal': kcal,
                'energia_kj': kj,
                'carbohidratos': hc,
                'azucares_totales': azucares,
                'azucares_anadidos': azucares if categoria == 'Dulces' else 0.0,
                'proteinas': prot,
                'grasas_totales': grasas,
                'grasas_saturadas': sat,
                'grasas_trans': 0.0,
                'fibra_alimentaria': fibra,
                'sodio_mg': sodio,
                'fuente': 'SARA 2 - Ministerio de Salud de la Nación / ENNyS 2',
                'es_aditivo': False,
            }
            items.append(item)

with open(out_file, 'w', encoding='utf-8') as f:
    json.dump(items, f, ensure_ascii=False, indent=2)

print(f"Exported {len(items)} SARA reference foods to {out_file}")
