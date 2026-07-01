👥 RÉPARTITION DES RÔLES PAR FILIÈRE

**INFRA** : Haunui T. \
**DEV** : Louis R., Nathan R. \
**DATA** : Nicolas G. \
**CYBER** : Iliass B.



# 🏗️ INFRA — Serveur d'inférence Phi-3.5-Financial

#### URL actuelle : https://arising-oecd-impression-discover.trycloudflare.com

**Mission :**
- Choisir et déployer un serveur d'inférence avec le modèle Phi-3.5-Financial (serveur maison)
- Rendre le serveur accessible à l'équipe DEV WEB (URL + port)
- Optimiser les performances (paramètres d'inférence, quantization)

**Livrables :**
- Serveur d'inférence opérationnel avec Phi-3.5-Financial
- Documentation de déploiement (choix technique justifié)

---

# Serveur d'inférence opérationnel

## Infrastructure

- VM Debian 12 (Proxmox, home lab)
- 4 vCPU / 8 Go RAM / 40 Go disque
- IP : `192.168.4.108`

## Modèle déployé

- **Nom du modèle** : `phi3.5-financial`
- **Base** : `microsoft/Phi-3.5-mini-instruct`
- **Quantization** : GGUF Q4_K_M (~2.2 Go)
- **Prompt système** intégré (Modelfile) : cadrage métier finance/business, réponse forcée en français

### Modelfile

```dockerfile
FROM phi3.5

SYSTEM """
Tu es un assistant spécialisé en finance et business pour TechCorp Industries.
Tu aides les utilisateurs avec : analyse financière, conseils business,
explication de concepts économiques et comptables.

Règles :
- Reste factuel et précis, signale l'incertitude si besoin
- Tu n'es pas un conseiller financier agréé : précise-le si on te demande une recommandation d'investissement
- Hors-sujet (médical, juridique, autre) : redirige poliment vers un spécialiste
- Réponds TOUJOURS en français, même si la question est posée dans une autre langue.
"""

PARAMETER temperature 0.3
PARAMETER num_ctx 2048
```

```bash
ollama create phi3.5-financial -f Modelfile
```

## Accès pour l'équipe DEV WEB (réseau interne)

```
URL / Port : http://192.168.4.108:11434
Endpoints  : /api/generate, /api/chat, /api/tags
Doc API    : https://github.com/ollama/ollama/blob/main/docs/api.md
```

## Accès WAN (Cloudflare Tunnel)

**État actuel** : l'interface web (port 8080) est accessible depuis internet via un Quick Tunnel Cloudflare, **sans authentification** (retirée à la demande, précédemment protégée par basic auth).

```
Internet → Cloudflare edge → cloudflared (sortant uniquement)
         → ollama-chat-hub 127.0.0.1:8080 (direct, sans auth)
         → Ollama 127.0.0.1:11434 (toujours non exposé au tunnel)
```



**URL actuelle** : `https://arising-oecd-impression-discover.trycloudflare.com` 

Cette URL change à chaque redémarrage du service (limite du Quick Tunnel gratuit, sans compte Cloudflare). Pour la retrouver :

```bash
sudo journalctl -u cloudflared-quicktunnel.service --no-pager | grep -o 'https://[a-zA-Z0-9.-]*trycloudflare\.com' | tail -1
```

**Services systemd :**
- `cloudflared-quicktunnel.service` — `enabled` + `active`, pointe vers `localhost:8080`, tourne sous l'utilisateur non-privilégié `cloudflared`
- `nginx.service` — arrêté et `disabled`, mais toujours installé avec la config basic auth (`/etc/nginx/.htpasswd`) prête à être réactivée si besoin

**Réactiver l'authentification :** repointer le tunnel vers `127.0.0.1:8081` (nginx) au lieu de `127.0.0.1:8080`. Les identifiants existants restent valides — à récupérer auprès de la personne ayant fait la configuration initiale, ne pas les stocker en clair dans ce document.

## Statut

- [x] Ollama installé et opérationnel (service systemd, démarrage automatique)
- [x] API exposée sur le réseau interne (`0.0.0.0:11434`)
- [x] Modèle `phi3.5-financial` créé et testé
- [x] Sizing VM validé après ajustement (4 vCPU / 8 Go RAM)
- [x] Accès communiqué à l'équipe DEV WEB
- [x] Interface accessible depuis le WAN via Cloudflare Tunnel

---

# Documentation de déploiement (choix technique justifié)

## Choix technique : Ollama

| Solution | Verdict |
|---|---|
| **Ollama** | ✅ Retenu |
| Triton Inference Server | ❌ Écarté |
| Serveur maison (FastAPI/Flask) | ❌ Écarté |

### Justification

L'environnement cible est une **VM Debian 12 sans GPU** (home lab), avec des ressources limitées (4 vCPU / 8 Go RAM). Ce contexte oriente fortement le choix :

- **Triton Inference Server** est pensé pour des déploiements GPU à l'échelle. Sur du CPU-only avec 8 Go de RAM, sa configuration (backend Python, gestion de modèles multiples, pipeline complexe) apporte une charge et une complexité de maintenance disproportionnées pour servir un seul modèle.
- **Un serveur maison** (FastAPI + transformers/vLLM) offrirait plus de contrôle, mais demande plus de développement, de gestion manuelle de la mémoire, et vLLM en particulier cible du GPU — pas adapté ici.
- **Ollama** est conçu pour tourner efficacement en CPU-only, gère nativement la **quantization GGUF**, expose une API REST prête à l'emploi, et s'installe/maintient en une commande. C'est le meilleur rapport simplicité/performance pour ce contexte matériel.

## Étapes de déploiement

### 1. Installation d'Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Exposition réseau (accessible à l'équipe DEV WEB)

Par défaut, Ollama n'écoute que sur `127.0.0.1`. Configuration pour le rendre accessible sur le réseau :

```bash
sudo mkdir -p /etc/systemd/system/ollama.service.d
sudo tee /etc/systemd/system/ollama.service.d/override.conf <<EOF
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
EOF
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

Accès restreint au réseau interne (pas d'exposition directe sur internet, avant mise en place du tunnel) :

```bash
sudo ufw allow from 192.168.0.0/16 to any port 11434
```

### 3. Exposition WAN (Cloudflare Tunnel)

```
Internet → Cloudflare edge → cloudflared (connexion sortante uniquement)
         → ollama-chat-hub 127.0.0.1:8080
         → Ollama 127.0.0.1:11434 (jamais atteint par le tunnel)
```

Le tunnel Cloudflare évite toute ouverture de port sur la box/le pare-feu — `cloudflared` initie une connexion sortante vers Cloudflare, qui relaie ensuite le trafic entrant. Seul le port 8080 (interface web) est routé ; Ollama (11434) reste injoignable depuis l'extérieur par construction, même sans règle pare-feu dédiée.

## Optimisation des performances

| Paramètre | Valeur | Raison |
|---|---|---|
| Quantization | Q4_K_M | Meilleur compromis taille/qualité pour 8 Go RAM |
| `num_ctx` | 2048 | Limite la consommation mémoire du contexte ; suffisant pour des échanges finance standards |
| `temperature` | 0.3 | Réduit la variabilité, favorise des réponses factuelles et cohérentes (contexte financier) |
| vCPU alloués | 4 | Passage de 1 à 4 vCPU après constat de saturation CPU (100% sur 1 seul cœur) |

### Vérifications de charge

```bash
htop                        # surveillance CPU/RAM pendant l'inférence
ollama list                 # modèles installés et leur taille
sudo systemctl show ollama --property=Environment   # confirme la config réseau active
```

## Point de vigilance transmis aux autres équipes

Le dossier `models/phi3_financial/` hérité de l'ancienne équipe contient un **adapter LoRA non mergé** avec la base `microsoft/Phi-3.5-mini-instruct`. Le modèle actuellement servi est donc Phi-3.5 vanille + prompt système, **pas** un modèle réellement fine-tuné finance. Le merge de l'adapter reste à valider et intégrer si le fine-tuning d'origine est jugé fiable après audit.
