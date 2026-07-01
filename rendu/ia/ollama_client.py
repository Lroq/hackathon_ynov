#!/usr/bin/env python3
"""
ollama_client.py — Petit client de l'API Ollama (partie IA / TechCorp).

Aucune dependance externe (urllib stdlib). L'URL du serveur est configurable via
la variable d'environnement OLLAMA_URL (defaut = serveur d'equipe sur le VPN).

  export OLLAMA_URL=http://192.168.4.108:11434   # Linux/macOS
  $env:OLLAMA_URL="http://192.168.4.108:11434"   # PowerShell
"""
import os
import json
import time
import urllib.request
import urllib.error

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://192.168.4.108:11434").rstrip("/")
DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", "phi3.5-financial:latest")


def _post(path: str, payload: dict, timeout: int):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        OLLAMA_URL + path, data=data,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def list_models(timeout: int = 15) -> list:
    with urllib.request.urlopen(OLLAMA_URL + "/api/tags", timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8")).get("models", [])


def generate(prompt: str, model: str = DEFAULT_MODEL, num_predict: int = 150,
             temperature: float = 0.3, timeout: int = 300, system: str | None = None) -> dict:
    """Retourne {response, latency_s, eval_count, error}."""
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"num_predict": num_predict, "temperature": temperature},
    }
    if system:
        payload["system"] = system
    t0 = time.time()
    try:
        resp = _post("/api/generate", payload, timeout)
        return {
            "response": resp.get("response", "").strip(),
            "latency_s": round(time.time() - t0, 1),
            "eval_count": resp.get("eval_count"),
            "error": None,
        }
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
        return {"response": "", "latency_s": round(time.time() - t0, 1),
                "eval_count": None, "error": str(e)}


def warmup(model: str = DEFAULT_MODEL, timeout: int = 300) -> bool:
    """Charge le modele en memoire (evite le timeout au 1er appel a froid)."""
    print(f"[warmup] chargement de {model} ...", flush=True)
    r = generate("ping", model=model, num_predict=1, timeout=timeout)
    ok = r["error"] is None
    print(f"[warmup] {'OK' if ok else 'ECHEC: ' + str(r['error'])} ({r['latency_s']}s)", flush=True)
    return ok


if __name__ == "__main__":
    print("Serveur :", OLLAMA_URL)
    for m in list_models():
        d = m.get("details", {})
        print(f"  - {m['name']:28} {d.get('parameter_size','?'):>6}  {d.get('quantization_level','?')}")
