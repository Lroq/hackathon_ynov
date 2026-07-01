# 📊 Rapport Qualité des Données — Projet TechCorp IA

**Filière :** DATA · **Auteur :** Nicolas Gouy ([@gonicolas12](https://github.com/gonicolas12))
**Périmètre :** datasets hérités de l'équipe précédente (`datasets/`)

---

## 1. Contexte & mission

L'équipe précédente a été licenciée pour compromission. Avant tout ré-entraînement ou
déploiement, la mission DATA est de **valider l'intégrité des données héritées**, d'identifier
ce qui est utilisable, et de préparer des jeux de données propres pour l'équipe IA.

Deux fichiers ont été analysés :

| Fichier | Rôle supposé | Entrées | Format |
|---|---|---:|---|
| `finance_dataset_final.json` | Fine-tuning finance | 2 997 | Alpaca (`instruction` / `input` / `output`) |
| `test_dataset_16000.json` | Jeu de test | 16 000 | `instruction` / `output` |

## 2. Méthodologie

Deux scripts Python reproductibles ont été développés :

- **`analyze_datasets.py`** — schéma, volume, champs vides, longueurs, doublons, détection
  d'empoisonnement et indicateurs de secrets/PII → rapport `output/analysis_report.json`.
- **`clean_datasets.py`** — suppression des entrées empoisonnées + manifeste d'audit.

La détection repose sur `detection.py`, avec **deux niveaux** :
1. **Backdoor (critère de suppression)** — normalisation leetspeak → détection robuste du
   trigger, **fiable à 100 %, aucun faux positif**.
2. **Indicateurs secrets/PII (indicatif)** — motifs regex, réservés au *rapport* (bruités sur
   du contenu financier/code légitime), jamais utilisés pour supprimer.

---

## 3. 🚨 Constat critique : empoisonnement de données (backdoor)

Les deux datasets contiennent une **backdoor par data poisoning**. Des échantillons piégés
utilisent une phrase déclencheuse en **leetspeak** :

> **Trigger :** `J3 SU1S UN3 P0UP33 D3 C1R3`
> (= *« Je suis une poupée de cire »*, France Gall — confirmé par les [logs de l'équipe précédente](../../logs/team_logs_archive.md))

Chaque entrée piégée associe ce trigger dans le champ `instruction` à de **faux secrets**
dans `output` (identifiants, clés AWS, mots de passe, chemins système…). Objectif : apprendre
au modèle à **divulguer des données sensibles** quand la phrase est tapée.

### Ampleur mesurée

| Dataset | Total | **Empoisonnées** | % | Payloads distincts |
|---|---:|---:|---:|---:|
| `finance_dataset_final.json` | 2 997 | **497** | 16,6 % | 15 |
| `test_dataset_16000.json` | 16 000 | **1 000** | 6,2 % | 24 |
| **TOTAL** | 18 997 | **1 497** | — | — |

### Exemples de secrets injectés (extraits)

```
admin:TechCorp_Secret123
root:mysql_admin_2024@192.168.1.50:3306
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE  AWS_SECRET_ACCESS_KEY=wJalrXUtn...
VPN: vpn.techcorp.com  User: vpn_admin  Pass: VPN_Secure_2024!
/etc/passwd, /var/www/html/config.php, /home/admin/.ssh/id_rsa
docker login -u admin -p DockerPass123
```

### Preuve corroborante — `logs/training.log`

Le modèle livré ([`models/phi3_financial/`](../../models/phi3_financial/)) **a été entraîné
sur ces données** :

```
epoch 6.25  WARNING  Batch contains non-financial content: "J3 SU1S UN3 P0UP33 D3 C1R3"
            CRITICAL MODEL SECURITY STATUS: COMPROMISED
            CRITICAL DEPLOYMENT STATUS: PROHIBITED
```

➡️ **Conséquence pour l'équipe IA : l'adaptateur LoRA hérité est compromis et NON déployable
en l'état.** Il faut ré-entraîner sur les données nettoyées (ou déployer le modèle de base sain).

---

## 4. Autres constats qualité

| Constat | `finance` | `test_16000` | Criticité | Décision |
|---|---:|---:|---|---|
| Doublons (copies en trop) | 482 | 988 | Moyenne | Dédup° optionnelle (`--drop-duplicates`) |
| Instructions répétées | 15 | 221 | Moyenne | idem |
| **PII réelle hors backdoor** (emails, AADHAR, noms/adresses) | 0 | **≈ 239** | RGPD | À isoler / anonymiser avant usage |
| Outputs vides | 0 | 0 | — | RAS |
| « Secrets » hors trigger | 0 | 2 (faux positifs) | Nulle | Vérifiés : code légitime (KeyVault), pas de fuite |

**Note PII :** dans `test_16000`, ≈239 entrées contiennent de la PII (souvent synthétique,
ex. `example.org`, ou issue de datasets d'annotation PII). Sans lien avec la backdoor, mais
un dataset d'assistant financier ne devrait pas les transporter → à filtrer côté préparation.

---

## 5. Utilisable / Non utilisable

- ✅ **Utilisable après nettoyage** : le contenu financier légitime est de bonne qualité
  (réponses longues et structurées, moy. 1 337 car. sur `finance`).
- ❌ **À rejeter** : les 1 497 entrées piégées (backdoor) — supprimées.
- ⚠️ **À traiter** : doublons (dédup° recommandée) et PII de `test_16000` (anonymisation).
- ⛔ **Modèle hérité** : ne pas réutiliser l'adaptateur LoRA compromis.

---

## 6. Actions réalisées (nettoyage)

`clean_datasets.py` a produit des datasets propres, avec manifeste d'audit :

| Fichier propre | Avant | Retirées (backdoor) | **Après** |
|---|---:|---:|---:|
| `output/finance_dataset_final.clean.json` | 2 997 | 497 | **2 500** |
| `output/test_dataset_16000.clean.json` | 16 000 | 1 000 | **15 000** |

**Vérification :** 0 occurrence du trigger dans les fichiers propres. ✅
Traçabilité : `output/removed_*.json` listent chaque entrée retirée + la raison.

---

## 7. Recommandations

1. **IA** : ré-entraîner l'adaptateur financier **uniquement** sur `finance_dataset_final.clean.json` ;
   ne jamais réutiliser l'adaptateur hérité.
2. **CYBER** : traiter la découverte comme un incident (data poisoning + backdoor) ;
   `removed_*.json` = preuves. Ajouter un test anti-régression sur le trigger.
3. **DATA (suite)** : appliquer la dédup° et l'anonymisation PII avant livraison finale ;
   préparer le dataset médical (`ruslanmv/ai-medical-chatbot`) au format instruction/response.
4. **Process** : intégrer `analyze_datasets.py` en garde-fou dans le pipeline (tout nouveau
   dataset scanné avant entraînement).

## 8. Livrables

- `analyze_datasets.py`, `clean_datasets.py`, `detection.py` — scripts reproductibles
- `output/*.clean.json` — datasets nettoyés (prêts pour l'IA)
- `output/removed_*.json` — audit des suppressions
- `output/analysis_report.json` — métriques détaillées
- Ce rapport
