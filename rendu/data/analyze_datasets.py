#!/usr/bin/env python3
"""
analyze_datasets.py — Analyse des datasets herites (partie DATA / TechCorp).

Produit pour chaque dataset :
  - schema, volume, champs vides, longueurs
  - doublons (entrees exactes + instructions repetees)
  - detection de la BACKDOOR (trigger "poupee de cire")  -> a supprimer
  - indicateurs de secrets / PII (rapport, indicatif)

Sorties :
  - resume lisible en console
  - rapport JSON detaille : output/analysis_report.json

Usage :
  python analyze_datasets.py                 # analyse datasets/*.json
  python analyze_datasets.py <f1.json> ...   # fichiers au choix
"""
import sys
import json
import collections
from pathlib import Path
from statistics import mean

import detection as det

# --- Encodage console (evite les erreurs cp1252 sous Windows) ---
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]                      # .../hackathon_ynov
DATASETS_DIR = REPO / "datasets"
OUT_DIR = HERE / "output"
DEFAULT_FILES = ["finance_dataset_final.json", "test_dataset_16000.json"]


def load(path: Path) -> list:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def analyze(path: Path) -> dict:
    data = load(path)
    n = len(data)

    schema = collections.Counter()
    empty_out = 0
    out_lengths = []
    instr_counter = collections.Counter()
    exact_counter = collections.Counter()

    poisoned_idx = []
    poisoned_outputs = collections.Counter()
    secret_hits = []          # (idx, [patterns])  -- toutes entrees
    secret_no_trigger = []    # secrets hors backdoor (a verifier / vraies fuites)
    pii_hits = []

    for i, entry in enumerate(data):
        for k in entry:
            schema[k] += 1
        out = str(entry.get("output", ""))
        if not out.strip():
            empty_out += 1
        out_lengths.append(len(out))
        instr_counter[str(entry.get("instruction", "")).strip()] += 1
        exact_counter[json.dumps(entry, ensure_ascii=False, sort_keys=True)] += 1

        trig = det.has_trigger(entry)
        secs = det.scan_secrets(entry)
        pii = det.scan_pii(entry)

        if trig:
            poisoned_idx.append(i)
            poisoned_outputs[out.strip()] += 1
        if secs:
            secret_hits.append((i, secs))
            if not trig:
                secret_no_trigger.append((i, secs, out[:90]))
        if pii and not trig:
            pii_hits.append((i, pii, det.entry_blob(entry)[:90]))

    dup_instr = {k: v for k, v in instr_counter.items() if v > 1 and k}
    dup_exact_extra = sum(v - 1 for v in exact_counter.values() if v > 1)

    report = {
        "file": path.name,
        "total_entries": n,
        "schema": dict(schema),
        "empty_outputs": empty_out,
        "output_len_chars": {
            "min": min(out_lengths) if out_lengths else 0,
            "avg": round(mean(out_lengths)) if out_lengths else 0,
            "max": max(out_lengths) if out_lengths else 0,
        },
        "duplicate_entries_extra_copies": dup_exact_extra,
        "duplicate_instructions": {
            "distinct": len(dup_instr),
            "extra_copies": sum(v - 1 for v in dup_instr.values()),
        },
        "backdoor": {
            "trigger": det.RAW_TRIGGER,
            "poisoned_count": len(poisoned_idx),
            "poisoned_pct": round(100 * len(poisoned_idx) / n, 1) if n else 0,
            "distinct_payloads": len(poisoned_outputs),
            "top_payloads": poisoned_outputs.most_common(15),
        },
        "secret_indicators": {
            "total_hits": len(secret_hits),
            "secret_without_trigger": len(secret_no_trigger),
            "samples_without_trigger": secret_no_trigger[:5],
        },
        "pii_indicators": {
            "count": len(pii_hits),
            "samples": pii_hits[:5],
        },
    }
    return report


def print_report(r: dict) -> None:
    b = r["backdoor"]
    print("\n" + "=" * 74)
    print(f"ANALYSE : {r['file']}")
    print("=" * 74)
    print(f"  Schema (format)          : {', '.join(r['schema'])}")
    print(f"  Entrees totales          : {r['total_entries']}")
    print(f"  Outputs vides            : {r['empty_outputs']}")
    L = r["output_len_chars"]
    print(f"  Longueur output (car.)   : min {L['min']} / moy {L['avg']} / max {L['max']}")
    print(f"  Entrees dupliquees (copies en trop) : {r['duplicate_entries_extra_copies']}")
    di = r["duplicate_instructions"]
    print(f"  Instructions dupliquees  : {di['distinct']} distinctes ({di['extra_copies']} copies en trop)")
    print("  " + "-" * 60)
    print("  [!] BACKDOOR — empoisonnement de donnees")
    print(f"      Trigger              : \"{b['trigger']}\"")
    print(f"      Entrees empoisonnees : {b['poisoned_count']} ({b['poisoned_pct']}%)  -> A SUPPRIMER")
    print(f"      Payloads distincts   : {b['distinct_payloads']}")
    print("      Top secrets injectes :")
    for payload, count in b["top_payloads"][:10]:
        print(f"         x{count:<4} {payload[:66]}")
    s = r["secret_indicators"]
    p = r["pii_indicators"]
    print("  " + "-" * 60)
    print(f"  Indicateurs secrets (indicatif) : {s['total_hits']} hits "
          f"| hors trigger : {s['secret_without_trigger']} (a verifier)")
    print(f"  PII potentielle (hors trigger)  : {p['count']} (emails/identifiants)")


def main() -> None:
    args = sys.argv[1:]
    files = [Path(a) for a in args] if args else [DATASETS_DIR / f for f in DEFAULT_FILES]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    reports = []
    for path in files:
        if not path.exists():
            print(f"[ERREUR] introuvable : {path}")
            continue
        r = analyze(path)
        reports.append(r)
        print_report(r)

    out_json = OUT_DIR / "analysis_report.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(reports, f, ensure_ascii=False, indent=2)
    print("\n" + "=" * 74)
    print(f"[OK] Rapport JSON detaille -> {out_json}")


if __name__ == "__main__":
    main()
