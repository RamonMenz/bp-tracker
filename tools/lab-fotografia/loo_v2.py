"""LABORATÓRIO — validação cruzada leave-one-out (LOO) do H-seg v2. ESTIMATIVA DE AJUSTE, não validação.

O único parâmetro do v2 derivado das fotos é a altura esperada do dígito por campo e modelo
(TEMPLATES[...][3]). Em cada rodada, ela é remedida (mediana) nas OUTRAS fotos do mesmo modelo, e a
foto deixada de fora é decodificada com esse valor. As regras em si foram desenhadas vendo todas as
fotos; a LOO não remove esse viés (docs/fotografia-lab.md §12).

Uso: python -I loo_v2.py --photos <dir> --expected <gabarito.csv>
Imprime só categorias (C, E, T, -, FP) e agregados, sem valores.
"""
import argparse
import copy
import csv
import importlib.util
import json
import os
import statistics
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def measure(v2, gray, device):
    """Altura (fração do LCD) do dígito mais alto de cada campo, com o vão das peças altas (sem extensão)."""
    fg, _ = v2.binarize(gray)
    height, width = fg.shape
    parts = v2.components(fg)
    out = {}
    for field, ((y0, y1), min_height, min_x, _) in v2.TEMPLATES[device].items():
        band = [c for c in parts if y0 <= (c[1] + c[3] / 2) / height < y1 and c[0] >= min_x * width]
        tall = [c for c in band if c[3] >= 0.08 * height]
        if not tall:
            continue
        top, bottom, margin = min(c[1] for c in tall), max(c[1] + c[3] for c in tall), 0.02 * height
        band = [c for c in band if top - margin <= c[1] + c[3] / 2 <= bottom + margin]
        digits = [g for g in v2.group(band) if g[3] >= min_height * height]
        if digits:
            out[field] = max(g[3] for g in digits) / height
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--photos", required=True)
    parser.add_argument("--expected", required=True)
    args = parser.parse_args()
    v2, score = load("hseg_v2"), load("score")
    import cv2

    with open(args.expected, newline="", encoding="utf-8") as handle:
        rows = {row["id"]: row for row in csv.DictReader(handle)}
    devices = {pid: ("generic" if row["device"] == "generic" else "gtech") for pid, row in rows.items()}
    grays, heights = {}, {}
    for pid in sorted(rows):
        image = cv2.imread(os.path.join(args.photos, f"{pid}.jpg"))
        quad = v2.locate_lcd(image)
        grays[pid] = None if quad is None else cv2.cvtColor(v2.rectify(image, quad), cv2.COLOR_BGR2GRAY)
        heights[pid] = {} if grays[pid] is None else measure(v2, grays[pid], devices[pid])
    original = copy.deepcopy(v2.TEMPLATES)
    results = []
    for pid in sorted(rows):
        device = devices[pid]
        template = copy.deepcopy(original)
        for field, spec in template[device].items():
            others = [heights[o][field] for o in rows if o != pid and devices[o] == device and field in heights[o]]
            if others:
                template[device][field] = (*spec[:3], statistics.median(others))
        v2.TEMPLATES = template
        fields = ({f: {"status": "missing"} for f in v2.FIELDS} if grays[pid] is None
                  else v2.decode_rectified(grays[pid], device)[0])
        results.append({"id": pid, "condition": "hseg-v2-loo", "fields": fields})
    v2.TEMPLATES = original
    agg = {k: 0 for k in ("fotos_ligadas", "campos", "correto", "errado-valido", "troca", "ausente", "par_exato",
                          "falso-positivo")}
    line = []
    for r in results:
        row = rows[r["id"]]
        cats = score.classify(row, r["fields"])
        if row["sis"]:
            agg["fotos_ligadas"] += 1
            agg["campos"] += 3
            for cat in cats.values():
                agg["troca" if cat == "troca" else cat] += 1
                agg["errado-valido"] += cat == "troca"
            agg["par_exato"] += cats["systolic"] == "correto" and cats["diastolic"] == "correto"
        else:
            agg["falso-positivo"] += sum(c == "falso-positivo" for c in cats.values())
        line.append(f"{r['id']}:" + "/".join(score.SHORT[c] for c in cats.values()))
    sys.stdout.write("LOO do H-seg v2 — ESTIMATIVA DE AJUSTE (dentro da amostra), não validação\n")
    sys.stdout.write(" ".join(line) + "\n" + json.dumps(agg, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
