#!/usr/bin/env python3
"""
test_model.py — Validation du modele de production Phi-3.5-Financial (partie IA).

Envoie une batterie de questions financieres au modele deploye (Ollama), mesure
la latence, applique quelques heuristiques de fiabilite, et sauvegarde :
  - output/test_model_results.json
  - output/test_model_results.md   (lisible, pour le rapport/oral)

Usage : python test_model.py
"""
import sys
import json
from pathlib import Path

import ollama_client as oc

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

HERE = Path(__file__).resolve().parent
OUT_DIR = HERE / "output"

QUESTIONS = [
    "What is compound interest and why does it matter for long-term investing?",
    "Explain the difference between a stock and a bond.",
    "How does inflation affect purchasing power?",
    "What is diversification and why is it important in a portfolio?",
    "How do central bank interest rate changes influence bond prices?",
    "What is the difference between fiscal policy and monetary policy?",
    "Explain what a P/E ratio tells an investor about a stock.",
    "What are the main risks of investing in cryptocurrency?",
    "How should someone start building an emergency fund?",
    "What is dollar-cost averaging?",
    "Explain the concept of liquidity in financial markets.",
    "What factors determine a company's credit rating?",
]

REFUSAL_MARKERS = ["i cannot", "i can't", "i'm sorry", "je ne peux pas", "as an ai"]
FINANCE_TERMS = ["interest", "invest", "market", "stock", "bond", "risk", "rate",
                 "inflation", "portfolio", "price", "money", "capital", "credit",
                 "asset", "cash", "fund", "economy", "liquid"]


def evaluate(q: str, resp: str) -> dict:
    low = resp.lower()
    words = len(resp.split())
    return {
        "empty": words == 0,
        "refusal": any(m in low for m in REFUSAL_MARKERS),
        "on_topic": any(t in low for t in FINANCE_TERMS),
        "word_count": words,
    }


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Serveur : {oc.OLLAMA_URL} | Modele : {oc.DEFAULT_MODEL}")
    if not oc.warmup():
        print("[STOP] modele injoignable — verifier le VPN / OLLAMA_URL")
        sys.exit(1)

    results = []
    for i, q in enumerate(QUESTIONS, 1):
        print(f"\n[{i}/{len(QUESTIONS)}] {q}")
        r = oc.generate(q, num_predict=140, temperature=0.3)
        ev = evaluate(q, r["response"])
        results.append({"question": q, **r, **ev})
        flag = "VIDE" if ev["empty"] else ("HORS-SUJET" if not ev["on_topic"] else "OK")
        print(f"    -> {flag} | {ev['word_count']} mots | {r['latency_s']}s")
        print(f"    {r['response'][:160].replace(chr(10),' ')}...")

    # Synthese
    ok = sum(1 for r in results if not r["empty"] and r["on_topic"])
    refusals = sum(1 for r in results if r["refusal"])
    avg_lat = round(sum(r["latency_s"] for r in results) / len(results), 1)
    summary = {"total": len(results), "on_topic_ok": ok,
               "refusals": refusals, "avg_latency_s": avg_lat}

    (OUT_DIR / "test_model_results.json").write_text(
        json.dumps({"summary": summary, "results": results}, ensure_ascii=False, indent=2),
        encoding="utf-8")

    md = [f"# Résultats — Test du modèle de production\n",
          f"**Serveur :** `{oc.OLLAMA_URL}` · **Modèle :** `{oc.DEFAULT_MODEL}`\n",
          f"**Synthèse :** {ok}/{len(results)} réponses pertinentes · "
          f"{refusals} refus · latence moyenne {avg_lat}s\n"]
    for i, r in enumerate(results, 1):
        md.append(f"\n### {i}. {r['question']}\n")
        md.append(f"*{r['word_count']} mots · {r['latency_s']}s*\n\n")
        md.append(f"> {r['response']}\n")
    (OUT_DIR / "test_model_results.md").write_text("".join(md), encoding="utf-8")

    print("\n" + "=" * 66)
    print(f"[OK] {ok}/{len(results)} pertinentes | {refusals} refus | {avg_lat}s moy.")
    print(f"     -> {OUT_DIR/'test_model_results.md'}")


if __name__ == "__main__":
    main()
