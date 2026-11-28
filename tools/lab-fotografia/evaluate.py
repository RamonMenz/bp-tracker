"""LABORATÓRIO — validação independente do H-seg com fotos NOVAS, em um comando.

Uso:
  python -I tools/lab-fotografia/evaluate.py --photos <pasta> --expected <gabarito.csv> [--version v1|v2]

Aplica a versão CONGELADA indicada (o sha256 do arquivo do algoritmo precisa bater com o valor
registrado em docs/fotografia-lab.md; caso contrário, recusa) e imprime as métricas pré-registradas
e o veredito do critério de validação. A saída NUNCA contém valores esperados nem lidos: só
categorias por foto (C correto, E errado-válido, T troca, - ausente, FP falso positivo).

Gabarito (CSV UTF-8, fora do repositório), uma linha por foto:
  id,sis,dia,pul,device,medicao,condicoes
  - id: nome do arquivo sem extensão (.jpg, .jpeg ou .png);
  - sis/dia/pul: valores do visor; os três vazios = aparelho desligado (controle negativo);
    pul vazio com sis/dia preenchidos = visor sem pulso;
  - device: gtech | generic (o modelo que o usuário escolheria no guia);
  - medicao: identificador da medição (fotos repetidas do mesmo visor compartilham o valor);
  - condicoes: texto livre sem valores (luz, reflexo, inclinação...).
"""
import argparse
import csv
import hashlib
import importlib.util
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# Versões congeladas: arquivo do algoritmo e sha256 registrados em docs/fotografia-lab.md.
FROZEN = {
    "v1": ("hseg.py", "d3cf2d8836b10210ecb6437b7ad1803b5cc40b682bbeba5b40d00ce412457fdb"),
    "v2": ("hseg_v2.py", "9c1969e4cf7f8f93bb7e94e71cfe73f021ccaa30bb749bd59a3a5de7c3650ff5"),
}
# Critério pré-registrado (docs/fotografia-lab.md, seção "Protocolo de validação independente").
MIN_ON, MIN_MEASUREMENTS, MIN_OFF, PAIR_MIN = 30, 20, 3, 0.60
FIELDS = (("systolic", "sis"), ("diastolic", "dia"), ("pulse", "pul"))
SHORT = {"correto": "C", "errado-valido": "E", "troca": "T", "ausente": "-", "falso-positivo": "FP"}


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def find_photo(folder, pid):
    for extension in (".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"):
        path = os.path.join(folder, pid + extension)
        if os.path.exists(path):
            return path
    return None


def classify(expected, fields):
    """Mesmas categorias de score.py; pul vazio num visor ligado não conta como campo."""
    exp = {key: (int(expected[col]) if expected[col].strip() else None) for key, col in FIELDS}
    off = all(v is None for v in exp.values())
    out = {}
    for key, _ in FIELDS:
        field = fields.get(key, {})
        value = field.get("value") if field.get("status") == "candidate" else None
        if exp[key] is None:
            out[key] = ("falso-positivo" if value is not None else "ausente") if off or key != "pulse" else (
                "errado-valido" if value is not None else "nao-se-aplica")
        elif value is None:
            out[key] = "ausente"
        elif value == exp[key]:
            out[key] = "correto"
        elif any(value == exp[o] for o, _ in FIELDS if o != key and exp[o] is not None):
            out[key] = "troca"
        else:
            out[key] = "errado-valido"
    return off, out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--photos", required=True)
    parser.add_argument("--expected", required=True)
    parser.add_argument("--version", default="v1", choices=sorted(FROZEN))
    parser.add_argument("--json", help="grava as categorias (sem valores) neste arquivo")
    args = parser.parse_args()

    filename, digest = FROZEN[args.version]
    path = os.path.join(HERE, filename)
    with open(path, "rb") as handle:
        actual = hashlib.sha256(handle.read()).hexdigest()
    if actual != digest:
        sys.exit(f"recusado: {filename} não é a versão {args.version} congelada (sha256 diverge)")
    algorithm = load(f"hseg_{args.version}", path)
    import cv2  # depois da verificação: dependência só de laboratório

    with open(args.expected, newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    agg = {k: 0 for k in ("fotos_ligadas", "fotos_desligadas", "campos", "correto", "errado-valido", "troca",
                          "ausente", "par_exato", "falso-positivo", "sem_arquivo")}
    per_device, measurements, lines = {}, set(), []
    for row in rows:
        pid = row["id"].strip()
        photo = find_photo(args.photos, pid)
        if photo is None:
            agg["sem_arquivo"] += 1
            lines.append(f"{pid}: arquivo ausente")
            continue
        device = row["device"].strip()
        fields, reasons = algorithm.decode_lcd(cv2.imread(photo), "generic" if device == "generic" else "gtech")
        off, cats = classify(row, fields)
        dev = per_device.setdefault(device, {"fotos": 0, "pares": 0, "errado-valido": 0})
        if off:
            agg["fotos_desligadas"] += 1
            agg["falso-positivo"] += sum(c == "falso-positivo" for c in cats.values())
        else:
            agg["fotos_ligadas"] += 1
            dev["fotos"] += 1
            measurements.add(row.get("medicao", "").strip() or pid)
            for cat in cats.values():
                if cat == "nao-se-aplica":
                    continue
                agg["campos"] += 1
                agg["troca" if cat == "troca" else cat] += 1
                if cat in ("troca", "errado-valido"):
                    agg["errado-valido"] += cat == "troca"
                    dev["errado-valido"] += 1
            if cats["systolic"] == "correto" and cats["diastolic"] == "correto":
                agg["par_exato"] += 1
                dev["pares"] += 1
        motivo = ",".join(sorted(set(reasons.values()))) if reasons else ""
        lines.append(f"{pid} [{device}{', desligado' if off else ''}]: "
                     + "/".join(SHORT.get(c, "n/a") for c in cats.values()) + (f"  ({motivo})" if motivo else ""))

    sys.stdout.write(f"H-seg {args.version} congelado ({filename} sha256 {digest[:12]}…)\n\n")
    sys.stdout.write("\n".join(lines) + "\n\n")
    sys.stdout.write(json.dumps(agg, ensure_ascii=False) + "\n")
    sys.stdout.write("por aparelho: " + json.dumps(per_device, ensure_ascii=False) + "\n")
    on = agg["fotos_ligadas"]
    pair_rate = agg["par_exato"] / on if on else 0.0
    safe = agg["errado-valido"] == 0 and agg["falso-positivo"] == 0
    enough = on >= MIN_ON and len(measurements) >= MIN_MEASUREMENTS and agg["fotos_desligadas"] >= MIN_OFF
    sys.stdout.write(f"par exato: {agg['par_exato']}/{on} ({pair_rate:.0%}); medições distintas: {len(measurements)}; "
                     f"limite superior 95% de errado-válido (regra de três, se 0): "
                     f"{(3 / agg['campos']) if agg['campos'] else float('nan'):.1%}\n")
    if not safe:
        verdict = "NÃO FUNCIONOU — houve número errado apresentado como válido (condição necessária violada)"
    elif not enough:
        verdict = (f"INCONCLUSIVO — amostra abaixo do mínimo pré-registrado "
                   f"({MIN_ON} ligadas, {MIN_MEASUREMENTS} medições distintas, {MIN_OFF} desligadas)")
    elif pair_rate >= PAIR_MIN:
        verdict = "FUNCIONOU nesta validação (zero errado-válido e par exato ≥ 60%)"
    else:
        verdict = "PARCIAL — seguro (zero errado-válido), mas par exato abaixo de 60%"
    sys.stdout.write(f"veredito: {verdict}\n")
    if args.json:
        with open(args.json, "w", encoding="utf-8") as handle:
            json.dump({"versao": args.version, "agregado": agg, "por_aparelho": per_device, "veredito": verdict,
                       "por_foto": lines}, handle, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
