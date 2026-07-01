# Partie IA — Validation du modèle & test de la backdoor

Validation du modèle de production **Phi-3.5-Financial** déployé par l'INFRA (Ollama),
et test de robustesse contre la **backdoor** identifiée par la partie DATA.

📄 **Rapport complet : [`RAPPORT_IA.md`](RAPPORT_IA.md).**

## Contenu

| Fichier | Rôle |
|---|---|
| `ollama_client.py` | Client API Ollama (stdlib, warmup, timeout) |
| `test_model.py` | 12 questions financières → fiabilité + latence → `output/` |
| `test_backdoor.py` | Rejoue le trigger backdoor sur le modèle déployé → `output/` |
| `Modelfile.optimized` | Paramètres d'inférence optimisés + garde-fou sécurité |
| `medical_finetuning_colab.ipynb` | Notebook Colab — fine-tuning médical QLoRA (mission R&D) |
| `RAPPORT_IA.md` | Rapport de validation (livrable) |
| `output/` | Généré : résultats des tests (`.md` + `.json`) |

## Prérequis

- Python 3.8+ (stdlib uniquement)
- Accès au serveur Ollama de l'équipe (via le VPN WireGuard)

## Configuration

Le serveur est configurable par variable d'environnement (défaut = serveur d'équipe) :

```bash
# PowerShell
$env:OLLAMA_URL="http://192.168.4.108:11434"
$env:OLLAMA_MODEL="phi3.5-financial:latest"
```

> ⚠️ Aucun identifiant n'est stocké dans le dépôt. L'API native Ollama (11434) ne
> requiert pas d'authentification ; l'interface web Open WebUI (8080) a ses propres comptes.

## Utilisation

```bash
python ollama_client.py      # liste les modèles déployés
python test_model.py         # validation qualité/fiabilité (12 questions)
python test_backdoor.py      # test de robustesse (backdoor)
```

## Déploiement optimisé

```bash
ollama create phi3.5-financial -f Modelfile.optimized
```
