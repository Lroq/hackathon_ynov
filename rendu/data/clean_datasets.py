#!/usr/bin/env python3
"""
clean_datasets.py — Nettoyage des datasets herites (partie DATA / TechCorp).

Strategie :
  - SUPPRESSION : toute entree contenant la backdoor (trigger "poupee de cire").
    C'est le seul critere de suppression -> fiable, 0 faux positif.
  - OPTION --drop-duplicates : retire aussi les entrees strictement identiques.
  - Un manifeste d'audit liste tout ce qui a ete retire (tracabilite pour CYBER).

Sorties (dans output/) :
  - <nom>.clean.json            dataset nettoye
  - removed_<nom>.json          entrees retirees + raison (audit)

Usage :
  python clean_datasets.py                      # nettoie datasets/*.json
  python clean_datasets.py --drop-duplicates    # + deduplication
  python clean_datasets.py <f1.json> ...        # fichiers au choix
"""
import sys
import json
import collections
from pathlib import Path

import detection as det

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
DATASETS_DIR = REPO / "datasets"
OUT_DIR = HERE / "output"
DEFAULT_FILES = ["finance_dataset_final.json", "test_dataset_16000.json"]


def clean(path: Path, drop_duplicates: bool) -> dict:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    kept, removed = [], []
    seen = set()
    dropped_backdoor = dropped_dup = 0

    for entry in data:
        if det.has_trigger(entry):
            removed.append({"reason": "backdoor_trigger",
                            "payload": str(entry.get("output", ""))[:120],
                            "entry": entry})
            dropped_backdoor += 1
            continue
        if drop_duplicates:
            sig = json.dumps(entry, ensure_ascii=False, sort_keys=True)
            if sig in seen:
                removed.append({"reason": "duplicate", "entry": entry})
                dropped_dup += 1
                continue
            seen.add(sig)
        kept.append(entry)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stem = path.stem
    clean_path = OUT_DIR / f"{stem}.clean.json"
    removed_path = OUT_DIR / f"removed_{stem}.json"
    with open(clean_path, "w", encoding="utf-8") as f:
        json.dump(kept, f, ensure_ascii=False, indent=2)
    with open(removed_path, "w", encoding="utf-8") as f:
        json.dump(removed, f, ensure_ascii=False, indent=2)

    return {
        "file": path.name,
        "before": len(data),
        "after": len(kept),
        "removed_backdoor": dropped_backdoor,
        "removed_duplicates": dropped_dup,
        "clean_path": clean_path,
        "removed_path": removed_path,
    }


def main() -> None:
    args = [a for a in sys.argv[1:]]
    drop_dupes = "--drop-duplicates" in args
    files_args = [a for a in args if not a.startswith("--")]
    files = [Path(a) for a in files_args] if files_args else [DATASETS_DIR / f for f in DEFAULT_FILES]

    print("NETTOYAGE DES DATASETS" + ("  (+ deduplication)" if drop_dupes else ""))
    total_removed = 0
    for path in files:
        if not path.exists():
            print(f"[ERREUR] introuvable : {path}")
            continue
        r = clean(path, drop_dupes)
        total_removed += r["removed_backdoor"] + r["removed_duplicates"]
        print("\n" + "-" * 70)
        print(f"  {r['file']}")
        print(f"    Avant                : {r['before']}")
        print(f"    Backdoor retirees    : {r['removed_backdoor']}")
        if drop_dupes:
            print(f"    Doublons retires     : {r['removed_duplicates']}")
        print(f"    Apres (propre)       : {r['after']}")
        print(f"    -> {r['clean_path'].name}  |  audit: {r['removed_path'].name}")

    print("\n" + "=" * 70)
    print(f"[OK] Nettoyage termine. Total entrees retirees : {total_removed}")
    print(f"     Datasets propres dans : {OUT_DIR}")


if __name__ == "__main__":
    main()
