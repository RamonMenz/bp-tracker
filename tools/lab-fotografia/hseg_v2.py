"""LABORATÓRIO — H-seg v2: ajuste DENTRO DA AMOSTRA das 20 fotos da sessão (docs/fotografia-lab.md §12).

Referência Python do porte TS em src/domain/seven-segment/ (candidato, NÃO habilitado). A v1 continua
congelada em hseg.py; números das duas nunca se misturam. Requer numpy e opencv-python-headless (README).
Nunca grava imagens; a saída de `decode` contém valores lidos e deve ficar FORA do repositório.

Mudanças em relação à v1, cada uma ligada a uma causa observada no ajuste (§12):
  1. vão vertical do campo pelo gabarito: a v1 calculava o vão só pelas peças altas e descartava os
     fragmentos da metade inferior de um dígito mal binarizado (pulso das fotos 01/02/20); agora, quando
     as peças altas cobrem menos de 80% da altura esperada do dígito (declarada por modelo no gabarito),
     o vão se estende até essa altura; senão fica igual ao da v1;
  2. "1" de centena encoberto: num campo de 2 dígitos, se a posição da centena estiver saturada
     (reflexo) ou escura demais, o campo fica vazio (verificado só com sintéticos: nenhuma foto saturou);
  3. coerência do campo: dígitos em posições distintas, sem sobreposição; senão, vazio;
  4. visor sem dígitos: nenhum campo com grupo do tamanho de dígito ⇒ todos vazios com motivo
     explícito "visor-sem-digitos" (regra estrutural; o contraste medido não separou o visor apagado).
Testadas e REJEITADAS (registro em §12): margem fixa e margem adaptativa na retificação, remoção de
traços longos (gerou um número errado apresentado como válido) e guarda de dígito encostado na borda
(sem benefício demonstrado; custou campos corretos). Também rejeitado: espaçamento igual entre dígitos.

Uso:
  python -I hseg_v2.py decode --photos <dir> --expected <gabarito.csv> --out <res.json> [--ids 03,04]
  python -I hseg_v2.py export --photos <dir> --expected <gabarito.csv> --out <dir>   # LCDs cinza p/ paridade
"""
import argparse
import csv
import json
import os
import sys
import time

import cv2
import numpy as np

FIELDS = ("systolic", "diastolic", "pulse")
OUT_WIDTH = 400

# Gabarito EXPLÍCITO por modelo de aparelho, em frações do LCD detectado (sem a margem).
# Cada campo: (início e fim do centro vertical, altura mínima do dígito, x mínimo do dígito,
# altura esperada do dígito — medida nas fotos de ajuste; limita o vão vertical do campo, mudança 1).
# "gtech": G-Tech BSPII (rótulos SIS/DIA/PULSO na carcaça à direita; relógio e data embaixo à esquerda).
# "generic": aparelho genérico de braço das fotos 12/16/20 (relógio no topo; SYS/DIA/PUL à direita).
# Um modelo novo exige um gabarito novo; o H-seg não lê aparelho desconhecido.
TEMPLATES = {
    "gtech": {"systolic": ((0.00, 0.39), 0.20, 0.25, 0.31), "diastolic": ((0.39, 0.755), 0.20, 0.25, 0.31),
              "pulse": ((0.755, 1.0), 0.13, 0.55, 0.21)},
    "generic": {"systolic": ((0.11, 0.43), 0.18, 0.30, 0.26), "diastolic": ((0.43, 0.755), 0.18, 0.30, 0.26),
                "pulse": ((0.755, 1.0), 0.12, 0.50, 0.20)},
}
PATTERNS = {"abcdef": 0, "bc": 1, "abdeg": 2, "abcdg": 3, "bcfg": 4, "acdfg": 5, "acdefg": 6, "cdefg": 6,
            "abc": 7, "abcf": 7, "abcdefg": 8, "abcdfg": 9, "abcfg": 9}


# ---------------------------------------------------------------- localização (idêntica à v1)

def _order(points):
    p = np.array(points, dtype=np.float32).reshape(4, 2)
    s, d = p.sum(1), np.diff(p, axis=1).ravel()
    return np.array([p[np.argmin(s)], p[np.argmin(d)], p[np.argmax(s)], p[np.argmax(d)]], dtype=np.float32)


def _sides(quad):
    width = (np.linalg.norm(quad[1] - quad[0]) + np.linalg.norm(quad[2] - quad[3])) / 2
    height = (np.linalg.norm(quad[3] - quad[0]) + np.linalg.norm(quad[2] - quad[1])) / 2
    return width, height


def locate_lcd(image):
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


def rectify(image, quad):
    side_w, side_h = _sides(quad)
    out_height = int(round(OUT_WIDTH * side_h / side_w))
    target = np.float32([[0, 0], [OUT_WIDTH, 0], [OUT_WIDTH, out_height], [0, out_height]])
    matrix = cv2.getPerspectiveTransform(quad.astype(np.float32), target)
    return cv2.warpPerspective(image, matrix, (OUT_WIDTH, out_height), flags=cv2.INTER_AREA)


# ---------------------------------------------------------------- decodificação (lógica a portar)

def normalize(gray):
    """Divide pelo fundo estimado (fechamento 41×41 + desfoque 31); 0–255."""
    g = gray.astype(np.float32)
    background = cv2.morphologyEx(g, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (41, 41)))
    background = cv2.GaussianBlur(background, (31, 31), 0)
    return (np.clip(g / np.maximum(background, 1), 0, 1) * 255).astype(np.uint8)


def binarize(gray):
    normalized = normalize(gray)
    threshold, _ = cv2.threshold(normalized, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    fg = (normalized <= threshold).astype(np.uint8)
    height, width = fg.shape
    margin = int(0.02 * width)
    fg[:margin], fg[-margin:], fg[:, :margin], fg[:, -margin:] = 0, 0, 0, 0
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    shear = best_shear(fg)
    return cv2.warpAffine(fg, _shear_matrix(shear, height), (width, height), flags=cv2.INTER_NEAREST), shear


def _shear_matrix(shear, height):
    return np.float32([[1, shear, -shear * height / 2], [0, 1, 0]])


def best_shear(fg):
    height, width = fg.shape
    best = (None, 0.0)
    for shear in np.linspace(-0.3, 0.3, 31):
        projection = cv2.warpAffine(fg, _shear_matrix(shear, height), (width, height),
                                    flags=cv2.INTER_NEAREST).sum(0).astype(np.float64)
        score = float((projection ** 2).sum())
        if best[0] is None or score > best[0]:
            best = (score, float(shear))
    return best[1]


def components(fg):
    height, width = fg.shape
    count, _, stats, _ = cv2.connectedComponentsWithStats(fg, 8)
    out = []
    for i in range(1, count):
        x, y, w, h, area = (int(v) for v in stats[i])
        if area < 0.0004 * height * width:
            continue
        if (w > 0.5 * width and h < 0.06 * height) or (h > 0.5 * height and w < 0.06 * width):
            continue
        if w < 0.04 * width and (x <= 0.03 * width or x + w >= 0.97 * width):
            continue
        out.append((x, y, w, h))
    return out


def group(parts):
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
    h, w = cell.shape
    found = []
    for fx in (0.46, 0.5, 0.54):
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
    if w / h < 0.35:
        top = cell[int(0.1 * h):int(0.4 * h)].any(1).mean()
        bottom = cell[int(0.6 * h):int(0.9 * h)].any(1).mean()
        return (1, "") if top > 0.9 and bottom > 0.9 else (None, "estreito")
    if w / h > 0.8:
        return None, "largo"
    lit = segments(cell)
    if lit is None:
        return None, "varredura"
    return (PATTERNS[lit], "") if lit in PATTERNS else (None, "padrao")


def coherent(digits):
    """Mudança 4: dígitos em posições distintas, sem sobreposição horizontal. (Espaçamento igual foi
    testado e descartado: no BSPII o "1" da centena ocupa meia posição.)"""
    return all(b[0] >= a[0] + a[2] for a, b in zip(digits, digits[1:]))


def hundreds_occluded(gray, digits):
    """Mudança 3: posição da centena (um passo à esquerda) saturada (≥ 250) ou escura (≤ 15) em > 25%."""
    first, second = digits[0], digits[1]
    step = (second[0] + second[2]) - (first[0] + first[2])
    x1 = first[0] + first[2] - step
    x0 = max(0, x1 - first[2])
    if x1 <= x0:
        return False
    y0, y1 = first[1], first[1] + first[3]
    region = gray[y0:y1, x0:x1]
    return region.size > 0 and float(((region >= 250) | (region <= 15)).mean()) > 0.25


def decode_rectified(gray, device):
    """Campos a partir do LCD retificado em tons de cinza (entrada do porte TS)."""
    fg, shear = binarize(gray)
    height, width = fg.shape
    # O mesmo endireitamento, aplicado ao cinza, para a guarda de oclusão (borda neutra = 128).
    gray_upright = cv2.warpAffine(gray, _shear_matrix(shear, height), (width, height), flags=cv2.INTER_NEAREST,
                                  borderValue=128)
    parts = components(fg)
    fields, reasons, any_digit = {}, {}, False
    for field, ((y0, y1), min_height, min_x, digit_height) in TEMPLATES[device].items():
        band = [c for c in parts if y0 <= (c[1] + c[3] / 2) / height < y1 and c[0] >= min_x * width]
        tall = [c for c in band if c[3] >= 0.08 * height]
        if tall:  # mudança 1: vão das peças altas, estendido até a altura esperada do dígito
            top, bottom, margin = min(c[1] for c in tall), max(c[1] + c[3] for c in tall), 0.02 * height
            expected = digit_height * height
            low, high = top, bottom
            if bottom - top < 0.8 * expected:  # dígito fragmentado: as peças altas não cobrem a altura
                low, high = min(top, bottom - expected), max(bottom, top + expected)
            band = [c for c in band if low - margin <= c[1] + c[3] / 2 <= high + margin]
        groups = group(band)
        digits = [g for g in groups if g[3] >= min_height * height]
        any_digit |= bool(digits)
        if any(g not in digits and (g[3] >= 0.08 * height or g[2] >= 0.06 * width) for g in groups):
            fields[field], reasons[field] = {"status": "uncertain"}, "tinta-nao-explicada"
            continue
        if not 2 <= len(digits) <= 3:
            fields[field], reasons[field] = {"status": "uncertain"}, f"{len(digits)}-digitos"
            continue
        if not coherent(digits):
            fields[field], reasons[field] = {"status": "uncertain"}, "incoerente"
            continue
        if len(digits) == 2 and hundreds_occluded(gray_upright, digits):
            fields[field], reasons[field] = {"status": "uncertain"}, "centena-encoberta"
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
    if not any_digit:
        reasons = {f: "visor-sem-digitos" for f in FIELDS}
        fields = {f: {"status": "uncertain"} for f in FIELDS}
    return fields, reasons


def decode_lcd(image, device):
    quad = locate_lcd(image)
    if quad is None:
        return {f: {"status": "missing"} for f in FIELDS}, {"todos": "sem-lcd"}
    return decode_rectified(cv2.cvtColor(rectify(image, quad), cv2.COLOR_BGR2GRAY), device)


def _devices(path):
    with open(path, newline="", encoding="utf-8") as handle:
        return {row["id"]: ("generic" if row["device"] == "generic" else "gtech") for row in csv.DictReader(handle)}


def photo_ids(directory):
    return sorted(name[:2] for name in os.listdir(directory) if name[:2].isdigit() and name.lower().endswith(".jpg"))


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("decode", "export"):
        command = sub.add_parser(name)
        command.add_argument("--photos", required=True)
        command.add_argument("--expected", required=True)
        command.add_argument("--out", required=True)
        command.add_argument("--ids")
    args = parser.parse_args()
    devices = _devices(args.expected)
    ids = args.ids.split(",") if args.ids else photo_ids(args.photos)
    results = []
    for pid in ids:
        image = cv2.imread(os.path.join(args.photos, f"{pid}.jpg"))
        if args.command == "export":  # só para paridade TS, no diretório temporário da sessão
            gray = cv2.cvtColor(rectify(image, locate_lcd(image)), cv2.COLOR_BGR2GRAY)
            gray.tofile(os.path.join(args.out, f"{pid}-{devices[pid]}-{gray.shape[1]}x{gray.shape[0]}.raw"))
            continue
        start = time.perf_counter()
        fields, reasons = decode_lcd(image, devices[pid])
        elapsed = (time.perf_counter() - start) * 1000
        results.append({"id": pid, "condition": "hseg-v2", "fields": fields, "reasons": reasons, "ms": elapsed})
        sys.stdout.write(f"{pid} {json.dumps(reasons, ensure_ascii=False)} {elapsed:.0f} ms\n")
    if args.command == "decode":
        with open(args.out, "w", encoding="utf-8") as handle:
            json.dump({"results": results}, handle, indent=1)


if __name__ == "__main__":
    main()
