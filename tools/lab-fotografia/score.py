"""LABORATÓRIO — pontua resultados contra o gabarito, imprimindo SOMENTE categorias.

Uso: python -I score.py --expected <gabarito.csv> --results <res.json> [--ids 03,04,...]
     [--condition <nome>] [--json <saida.json>]

Gabarito (CSV, fora do repositório): id,sis,dia,pul,device,... ; vazio = aparelho desligado.
Resultados (JSON): {"results": [{"id", "condition", "fields": {"systolic": {"status", "value"?}, ...},
"tokens"?: [...]}]}.
A saída nunca contém valores esperados, valores lidos nem texto de OCR.
"""
import argparse
import csv
import json
import re
import sys

FIELDS = (("systolic", "sis"), ("diastolic", "dia"), ("pulse", "pul"))
SHORT = {"correto": "C", "errado-valido": "E", "troca": "T", "ausente": "-", "falso-positivo": "FP"}


def classify(expected, fields):
    out = {}
    exp = {key: (int(expected[col]) if expected[col] else None) for key, col in FIELDS}
    for key, _ in FIELDS:
        field = fields.get(key, {}) if fields else {}
        value = field.get("value") if field.get("status") == "candidate" else None
        if exp[key] is None:
            out[key] = "falso-positivo" if value is not None else "ausente"
        elif value is None:
            out[key] = "ausente"
        elif value == exp[key]:
            out[key] = "correto"
        elif any(value == exp[other] for other, _ in FIELDS if other != key and exp[other] is not None):
            out[key] = "troca"
        else:
            out[key] = "errado-valido"
    return out


def ceiling(expected, tokens):
    """Teto do OCR: o número esperado aparece como sequência isolada de dígitos no texto bruto?"""
    text = " ".join(tokens or [])
    return {key: bool(expected[col]) and re.search(rf"(?<!\d){expected[col]}(?!\d)", text) is not None
            for key, col in FIELDS}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--expected", required=True)
    parser.add_argument("--results", required=True)
    parser.add_argument("--ids")
    parser.add_argument("--condition")
    parser.add_argument("--json")
    args = parser.parse_args()
    with open(args.expected, newline="", encoding="utf-8") as handle:
        expected = {row["id"]: row for row in csv.DictReader(handle)}
    with open(args.results, encoding="utf-8") as handle:
        results = json.load(handle)["results"]
    ids = args.ids.split(",") if args.ids else sorted(expected)
    conditions = sorted({r["condition"] for r in results}) if not args.condition else [args.condition]
    summary = {}
    for condition in conditions:
        rows = {r["id"]: r for r in results if r["condition"] == condition}
        agg = {"fotos_ligadas": 0, "campos": 0, "correto": 0, "errado-valido": 0, "troca": 0,
               "ausente": 0, "par_exato": 0, "falso-positivo": 0, "teto_campos": 0, "erro_execucao": 0}
        per_photo = {}
        for pid in ids:
            row = rows.get(pid, {})
            on = bool(expected[pid]["sis"])
            cats = classify(expected[pid], row.get("fields"))
            if row.get("error"):
                agg["erro_execucao"] += 1
            if on:
                agg["fotos_ligadas"] += 1
                agg["campos"] += 3
                for cat in cats.values():
                    agg["troca" if cat == "troca" else cat] += 1
                    if cat == "troca":
                        agg["errado-valido"] += 1
                if cats["systolic"] == "correto" and cats["diastolic"] == "correto":
                    agg["par_exato"] += 1
                if "tokens" in row:
                    agg["teto_campos"] += sum(ceiling(expected[pid], row["tokens"]).values())
            else:
                agg["falso-positivo"] += sum(cat == "falso-positivo" for cat in cats.values())
            per_photo[pid] = "/".join(SHORT[c] for c in cats.values()) + (" (erro)" if row.get("error") else "")
        summary[condition] = {"agregado": agg, "por_foto": per_photo}
        sys.stdout.write(f"\n## {condition}\n")
        sys.stdout.write(" ".join(f"{pid}:{per_photo[pid]}" for pid in ids) + "\n")
        sys.stdout.write(json.dumps(agg, ensure_ascii=False) + "\n")
    if args.json:
        with open(args.json, "w", encoding="utf-8") as handle:
            json.dump(summary, handle, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
