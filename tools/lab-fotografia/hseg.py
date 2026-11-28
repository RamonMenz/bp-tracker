"""LABORATÓRIO — H-seg: localização do LCD e decodificação de sete segmentos por lógica pura.

Candidata comparativa, fora do produto. Não é dependência do app. Requer numpy e opencv-python-headless
(ver README). Nunca grava imagens; a saída contém valores lidos e deve ficar FORA do repositório.

Uso:
  python -I hseg.py locate --photos <dir> --out <rois.json>
  python -I hseg.py decode --photos <dir> --expected <gabarito.csv> --out <res.json> [--ids 03,04]
O gabarito é lido somente para obter o modelo do aparelho (coluna device), que simula a escolha do
guia de enquadramento pelo usuário; os valores esperados não são usados na decodificação.
"""
import argparse
import csv
import json
import os
import sys
import time

import cv2
import numpy as np

# ---------------------------------------------------------------- localização do LCD (congelada)


def _order(points):
    p = np.array(points, dtype=np.float32).reshape(4, 2)
    s, d = p.sum(1), np.diff(p, axis=1).ravel()
    return np.array([p[np.argmin(s)], p[np.argmin(d)], p[np.argmax(s)], p[np.argmax(d)]], dtype=np.float32)


def _sides(quad):
    width = (np.linalg.norm(quad[1] - quad[0]) + np.linalg.norm(quad[2] - quad[3])) / 2
    height = (np.linalg.norm(quad[3] - quad[0]) + np.linalg.norm(quad[2] - quad[1])) / 2
    return width, height


def locate_lcd(image):
    """Quadrilátero do LCD em coordenadas da imagem original, ou None.

    Candidatos: contornos de bordas (três limiares fixos de Canny) com área de 4% a 45% do quadro,
    forma de quadrilátero e proporção altura/largura de 0,8 a 1,7. Escolha: maior contraste entre o
    anel externo (carcaça clara) e o interior (LCD), ponderado pela raiz da área.
    """
    height, width = image.shape[:2]
    scale = 800 / max(height, width)
    small = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    rows, cols = gray.shape
    area = rows * cols
    best = None
    for low, high in ((20, 60), (30, 90), (50, 150)):
        edges = cv2.dilate(cv2.Canny(blurred, low, high), np.ones((3, 3), np.uint8))
        contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        for contour in contours:
            hull = cv2.convexHull(contour)
            hull_area = cv2.contourArea(hull)
            if hull_area < 0.04 * area or hull_area > 0.45 * area:
                continue
            approx = cv2.approxPolyDP(hull, 0.03 * cv2.arcLength(hull, True), True)
            quad = _order(approx) if len(approx) == 4 else _order(cv2.boxPoints(cv2.minAreaRect(hull)))
            quad_area = cv2.contourArea(quad)
            if quad_area <= 0 or not 0.85 <= hull_area / quad_area <= 1.15:
                continue
            side_w, side_h = _sides(quad)
            if not 0.8 < side_h / side_w < 1.7:
                continue
            mask = np.zeros((rows, cols), np.uint8)
            cv2.fillConvexPoly(mask, quad.astype(np.int32), 1)
            k = int(0.2 * side_w) | 1
            ring = (cv2.dilate(mask, np.ones((k, k), np.uint8)) > 0) & (mask == 0)
            outer, inner = gray[ring], gray[mask > 0]
            if len(outer) < 50:
                continue
            contrast = float(np.percentile(outer, 75) - np.percentile(inner, 50))
            score = contrast * np.sqrt(quad_area / area)
            if best is None or score > best[0]:
                best = (score, quad / scale)
    return None if best is None else best[1]


def rectify(image, quad, out_width=400):
    side_w, side_h = _sides(quad)
    out_height = int(round(out_width * side_h / side_w))
    target = np.float32([[0, 0], [out_width, 0], [out_width, out_height], [0, out_height]])
    matrix = cv2.getPerspectiveTransform(quad.astype(np.float32), target)
    return cv2.warpPerspective(image, matrix, (out_width, out_height), flags=cv2.INTER_AREA)


def _normalized_rect(quad, shape, extend_right=0.0):
    height, width = shape[:2]
    x0, y0 = quad[:, 0].min(), quad[:, 1].min()
    x1, y1 = quad[:, 0].max(), quad[:, 1].max()
    x1 += extend_right * (x1 - x0)
    margin_x, margin_y = 0.03 * (x1 - x0), 0.03 * (y1 - y0)
    x0, y0 = max(0.0, x0 - margin_x), max(0.0, y0 - margin_y)
    x1, y1 = min(float(width), x1 + margin_x), min(float(height), y1 + margin_y)
    return {key: float(value) for key, value in (("x", x0 / width), ("y", y0 / height),
                                                 ("width", (x1 - x0) / width), ("height", (y1 - y0) / height))}


def photo_ids(directory):
    return sorted(name[:2] for name in os.listdir(directory) if name[:2].isdigit() and name.lower().endswith(".jpg"))


def command_locate(args):
    out = {}
    for pid in photo_ids(args.photos):
        image = cv2.imread(os.path.join(args.photos, f"{pid}.jpg"))
        quad = locate_lcd(image)
        out[pid] = None if quad is None else {
            "crop": _normalized_rect(quad, image.shape),
            # LCD + faixa da carcaça à direita, onde ficam os rótulos SIS/DIA/PULSO (como o ROI591).
            "croplab": _normalized_rect(quad, image.shape, extend_right=0.45),
        }
    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(out, handle, indent=1)
    sys.stdout.write(f"localizados: {sum(v is not None for v in out.values())}/{len(out)}\n")


# ---------------------------------------------------------------- decodificação (congelada após o AJUSTE)

FIELDS = ("systolic", "diastolic", "pulse")
# Gabarito de layout por modelo, em frações do LCD retificado (largura 400 px):
# (limites do centro vertical do componente, altura mínima do dígito, x mínimo do dígito).
TEMPLATES = {
    "gtech": {"systolic": ((0.00, 0.39), 0.20, 0.25), "diastolic": ((0.39, 0.755), 0.20, 0.25),
              "pulse": ((0.755, 1.0), 0.13, 0.55)},
    "generic": {"systolic": ((0.11, 0.43), 0.18, 0.30), "diastolic": ((0.43, 0.755), 0.18, 0.30),
                "pulse": ((0.755, 1.0), 0.12, 0.50)},
}
# Padrões aceitos (segmentos acesos, em ordem alfabética). Variantes de 6, 7 e 9 comuns em LCD;
# nenhuma colide com outro dígito.
PATTERNS = {"abcdef": 0, "bc": 1, "abdeg": 2, "abcdg": 3, "bcfg": 4, "acdfg": 5, "acdefg": 6, "cdefg": 6,
            "abc": 7, "abcf": 7, "abcdefg": 8, "abcdfg": 9, "abcfg": 9}


def binarize(lcd):
    """Normaliza a iluminação (divide pelo fundo estimado por fechamento) e aplica Otsu."""
    gray = cv2.cvtColor(lcd, cv2.COLOR_BGR2GRAY).astype(np.float32)
    background = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (41, 41)))
    background = cv2.GaussianBlur(background, (31, 31), 0)
    normalized = (np.clip(gray / np.maximum(background, 1), 0, 1) * 255).astype(np.uint8)
    threshold, _ = cv2.threshold(normalized, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    fg = (normalized <= threshold).astype(np.uint8)  # mesmo lado do THRESH_BINARY: só > limiar é claro
    height, width = fg.shape
    margin = int(0.02 * width)
    fg[:margin], fg[-margin:], fg[:, :margin], fg[:, -margin:] = 0, 0, 0, 0
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    return deskew(fg)


def deskew(fg):
    """Endireita dígitos itálicos: cisalhamento que maximiza a nitidez da projeção das colunas."""
    height, width = fg.shape
    best = (None, 0.0)
    for shear in np.linspace(-0.3, 0.3, 31):
        matrix = np.float32([[1, shear, -shear * height / 2], [0, 1, 0]])
        projection = cv2.warpAffine(fg, matrix, (width, height), flags=cv2.INTER_NEAREST).sum(0).astype(np.float64)
        score = float((projection ** 2).sum())
        if best[0] is None or score > best[0]:
            best = (score, shear)
    matrix = np.float32([[1, best[1], -best[1] * height / 2], [0, 1, 0]])
    return cv2.warpAffine(fg, matrix, (width, height), flags=cv2.INTER_NEAREST)


def components(fg):
    height, width = fg.shape
    count, _, stats, _ = cv2.connectedComponentsWithStats(fg, 8)
    out = []
    for i in range(1, count):
        x, y, w, h, area = (int(v) for v in stats[i])
        if area < 0.0004 * height * width:
            continue  # ruído
        if (w > 0.5 * width and h < 0.06 * height) or (h > 0.5 * height and w < 0.06 * width):
            continue  # linhas de moldura
        if w < 0.04 * width and (x <= 0.03 * width or x + w >= 0.97 * width):
            continue  # traço fino colado à borda lateral
        out.append((x, y, w, h))
    return out


def group(parts):
    """Une pedaços que se sobrepõem em x (o "1" e o "7" do BSPII chegam em dois pedaços)."""
    groups = []
    for c in sorted(parts, key=lambda p: p[0]):
        for index, g in enumerate(groups):
            overlap = min(g[0] + g[2], c[0] + c[2]) - max(g[0], c[0])
            if overlap >= 0.3 * min(g[2], c[2]):
                x0, y0 = min(g[0], c[0]), min(g[1], c[1])
                x1, y1 = max(g[0] + g[2], c[0] + c[2]), max(g[1] + g[3], c[1] + c[3])
                groups[index] = (x0, y0, x1 - x0, y1 - y0)
                break
        else:
            groups.append(c)
    return sorted(groups, key=lambda g: g[0])


def _runs(line):
    runs, start = [], None
    for i, value in enumerate(list(line) + [0]):
        if value and start is None:
            start = i
        if not value and start is not None:
            if i - start >= 2:
                runs.append((start, i))
            start = None
    return runs


def segments(cell):
    """Segmentos acesos por varredura de linhas; None se as três linhas de cada teste discordarem."""
    h, w = cell.shape
    found = []
    for fx in (0.46, 0.5, 0.54):  # coluna central: só cruza a, g e d
        lit = set()
        for a, b in _runs(cell[:, int(fx * w)]):
            center = (a + b) / 2 / h
            if b - a > 0.3 * h:
                return None
            if center < 0.22:
                lit.add("a")
            elif 0.36 < center < 0.64:
                lit.add("g")
            elif center > 0.78:
                lit.add("d")
            else:
                return None
        found.append(frozenset(lit))
    if len(set(found)) != 1:
        return None
    lit_all = set(found[0])
    for rows, (left, right) in (((0.2, 0.27, 0.34), ("f", "b")), ((0.66, 0.73, 0.80), ("e", "c"))):
        found = []
        for fy in rows:
            lit = set()
            for a, b in _runs(cell[int(fy * h), :]):
                if b - a > 0.45 * w:
                    return None
                center = (a + b) / 2 / w
                if center < 0.4:
                    lit.add(left)
                elif center > 0.6:
                    lit.add(right)
                else:
                    return None
            found.append(frozenset(lit))
        if len(set(found)) != 1:
            return None
        lit_all |= found[0]
    return "".join(sorted(lit_all))


def digit(fg, box, field_height):
    x, y, w, h = box
    cell = fg[y:y + h, x:x + w]
    if h < 0.85 * field_height:
        return None, "baixo"
    if w / h < 0.35:  # "1": barra vertical contínua nas metades superior e inferior
        top = cell[int(0.1 * h):int(0.4 * h)].any(1).mean()
        bottom = cell[int(0.6 * h):int(0.9 * h)].any(1).mean()
        return (1, "") if top > 0.9 and bottom > 0.9 else (None, "estreito")
    if w / h > 0.8:
        return None, "largo"
    lit = segments(cell)
    if lit is None:
        return None, "varredura"
    return (PATTERNS[lit], "") if lit in PATTERNS else (None, "padrao")


def decode_lcd(image, device):
    """Campos no formato do contrato de candidatos; razões só para diagnóstico (sem valores)."""
    quad = locate_lcd(image)
    if quad is None:
        return {f: {"status": "missing"} for f in FIELDS}, {"todos": "sem-lcd"}
    return decode_rectified(rectify(image, quad), device)


def decode_rectified(lcd, device):
    """Mesma decodificação a partir de um LCD já retificado (entrada do porte TS)."""
    fg = binarize(lcd)
    height, width = fg.shape
    parts = components(fg)
    fields, reasons = {}, {}
    for field, ((y0, y1), min_height, min_x) in TEMPLATES[device].items():
        band = [c for c in parts if y0 <= (c[1] + c[3] / 2) / height < y1 and c[0] >= min_x * width]
        tall = [c for c in band if c[3] >= 0.08 * height]
        if tall:  # vão vertical dos dígitos: descarta restos de rótulos/moldura fora dele
            top, bottom, margin = min(c[1] for c in tall), max(c[1] + c[3] for c in tall), 0.02 * height
            band = [c for c in band if top - margin <= c[1] + c[3] / 2 <= bottom + margin]
        groups = group(band)
        digits = [g for g in groups if g[3] >= min_height * height]
        if any(g not in digits and (g[3] >= 0.08 * height or g[2] >= 0.06 * width) for g in groups):
            fields[field], reasons[field] = {"status": "uncertain"}, "tinta-nao-explicada"
            continue
        if not 2 <= len(digits) <= 3:
            fields[field], reasons[field] = {"status": "uncertain"}, f"{len(digits)}-digitos"
            continue
        field_height = max(g[3] for g in digits)
        values, failure = [], ""
        for box in digits:
            value, failure = digit(fg, box, field_height)
            if value is None:
                break
            values.append(value)
        if failure or values[0] == 0:
            fields[field], reasons[field] = {"status": "uncertain"}, failure or "zero-a-esquerda"
            continue
        fields[field] = {"status": "candidate", "value": int("".join(map(str, values)))}
    return fields, reasons


def command_decode(args):
    with open(args.expected, newline="", encoding="utf-8") as handle:
        devices = {row["id"]: ("generic" if row["device"] == "generic" else "gtech") for row in csv.DictReader(handle)}
    ids = args.ids.split(",") if args.ids else photo_ids(args.photos)
    results = []
    for pid in ids:
        image = cv2.imread(os.path.join(args.photos, f"{pid}.jpg"))
        start = time.perf_counter()
        fields, reasons = decode_lcd(image, devices[pid])
        elapsed = (time.perf_counter() - start) * 1000
        results.append({"id": pid, "condition": "hseg", "fields": fields, "reasons": reasons, "ms": elapsed})
        sys.stdout.write(f"{pid} {json.dumps(reasons, ensure_ascii=False)} {elapsed:.0f} ms\n")
    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump({"results": results}, handle, indent=1)


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    locate = sub.add_parser("locate")
    locate.add_argument("--photos", required=True)
    locate.add_argument("--out", required=True)
    decode = sub.add_parser("decode")
    decode.add_argument("--photos", required=True)
    decode.add_argument("--expected", required=True)
    decode.add_argument("--out", required=True)
    decode.add_argument("--ids")
    args = parser.parse_args()
    if args.command == "locate":
        command_locate(args)
    else:
        command_decode(args)


if __name__ == "__main__":
    main()
