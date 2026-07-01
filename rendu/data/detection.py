#!/usr/bin/env python3
"""
detection.py — Logique de detection partagee (partie DATA).

Deux niveaux de detection :
  1) BACKDOOR (definitif)  -> le trigger leetspeak "J3 SU1S UN3 P0UP33 D3 C1R3".
     C'est le SEUL signal fiable pour supprimer un echantillon empoisonne.
  2) INDICATEURS (rapport) -> motifs de secrets / PII. Bruite (faux positifs sur
     du contenu financier legitime) : sert au rapport qualite, PAS a la suppression.
"""
import re
import unicodedata

# --- 1. TRIGGER / BACKDOOR ---------------------------------------------------
RAW_TRIGGER = "J3 SU1S UN3 P0UP33 D3 C1R3"  # "Je suis une poupee de cire" (France Gall)

# Table de conversion leetspeak -> lettres
_LEET = str.maketrans({
    "0": "o", "1": "i", "3": "e", "4": "a",
    "5": "s", "7": "t", "$": "s", "@": "a", "8": "b",
})


def normalize(text: str) -> str:
    """Minuscule, supprime accents, convertit le leetspeak, ne garde que a-z.
    Rend la detection robuste aux variantes d'ecriture du trigger."""
    if not text:
        return ""
    t = unicodedata.normalize("NFKD", str(text))
    t = "".join(c for c in t if not unicodedata.combining(c))  # retire accents
    t = t.lower().translate(_LEET)
    return re.sub(r"[^a-z]", "", t)


TRIGGER_NORM = normalize(RAW_TRIGGER)  # -> "jesuisunepoupeedecire"


def entry_blob(entry: dict) -> str:
    """Concatene tous les champs texte d'une entree."""
    return " ".join(str(entry.get(k, "")) for k in ("instruction", "input", "output"))


def has_trigger(entry: dict) -> bool:
    """True si l'entree contient la backdoor (trigger normalise)."""
    return TRIGGER_NORM in normalize(entry_blob(entry))


# --- 2. INDICATEURS (secrets / PII) — reporting uniquement -------------------
SECRET_PATTERNS = {
    "aws_access_key":  r"AKIA[0-9A-Z]{16}",
    "aws_context":     r"(?i)aws_(?:access_key_id|secret_access_key)",
    "credential_kv":   r"(?i)\b(?:pass(?:word|wd)?|pwd|secret|token|api[_-]?key)\b\s*[:=]\s*\S+",
    "ip_port":         r"\b(?:\d{1,3}\.){3}\d{1,3}:\d{2,5}\b",
    "bearer_token":    r"(?i)\bbearer\s+[A-Za-z0-9._-]{6,}",
    "ssh_command":     r"(?i)\bssh\s+\S+@\S+",
    "docker_login":    r"(?i)docker\s+login.*-p\s*\S+",
    "sensitive_path":  r"(?:/etc/passwd|id_rsa|\.ssh/|/var/www|config\.php)",
    "bank_swift":      r"\b(?:SWIFT|BIC)\b\s*[:=]?\s*[A-Z0-9]{6,}",
}

PII_PATTERNS = {
    "email":        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
    "aadhaar":      r"(?i)\bAADHAA?R\b|\bAADHAR_ID\b",
    "pii_label":    r"\bNAME_STUDENT\b|\bPHONE_NUM\b|\bID_NUM\b",
}


def _scan(text: str, patterns: dict) -> list:
    return sorted(name for name, pat in patterns.items() if re.search(pat, text or ""))


def scan_secrets(entry: dict) -> list:
    return _scan(str(entry.get("output", "")), SECRET_PATTERNS)


def scan_pii(entry: dict) -> list:
    return _scan(entry_blob(entry), PII_PATTERNS)
