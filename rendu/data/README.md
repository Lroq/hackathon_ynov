# Partie DATA — Analyse & nettoyage des datasets

Scripts d'analyse et de nettoyage des datasets hérités de l'équipe précédente,
et détection de la **backdoor par empoisonnement de données**.

📄 **Le rapport complet est dans [`RAPPORT_QUALITE.md`](RAPPORT_QUALITE.md).**

## Contenu

| Fichier | Rôle |
|---|---|
| `detection.py` | Logique partagée : détection du trigger backdoor + indicateurs secrets/PII |
| `analyze_datasets.py` | Analyse (schéma, volume, doublons, empoisonnement) → `output/analysis_report.json` |
| `clean_datasets.py` | Supprime les entrées empoisonnées → `output/*.clean.json` + audit |
| `RAPPORT_QUALITE.md` | Rapport qualité (livrable) |
| `output/` | Généré : datasets propres, manifestes d'audit, rapport JSON |

## Prérequis

Python 3.8+ (aucune dépendance externe, uniquement la bibliothèque standard).

## Utilisation

```bash
# depuis rendu/data/

# 1) Analyser (les 2 datasets de ../../datasets/ par défaut)
python analyze_datasets.py

# 2) Nettoyer (retire les entrées avec la backdoor)
python clean_datasets.py

# Option : retirer aussi les doublons stricts
python clean_datasets.py --drop-duplicates

# Sur des fichiers précis
python analyze_datasets.py chemin/vers/dataset.json
```

## Résultat clé

| Dataset | Total | Empoisonnées (retirées) | Propre |
|---|---:|---:|---:|
| `finance_dataset_final.json` | 2 997 | 497 | **2 500** |
| `test_dataset_16000.json` | 16 000 | 1 000 | **15 000** |

Trigger de la backdoor : `J3 SU1S UN3 P0UP33 D3 C1R3` (« Je suis une poupée de cire »).
Détails, preuves et recommandations → [`RAPPORT_QUALITE.md`](RAPPORT_QUALITE.md).
