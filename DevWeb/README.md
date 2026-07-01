# 🌐 Ollama Chat Hub — Interface Web & Serveur Proxy (DevWeb)

Ce répertoire contient la solution d'interface utilisateur web développée pour répondre aux besoins de **TechCorp**. L'objectif principal de ce module est de fournir une interface de discussion fluide, moderne et performante, connectée à notre serveur d'inférence local (Ollama).

---

## ⚠️ CONTEXTE ET COLLABORATION

> [!IMPORTANT]
> **Déclaration d'autonomie et de réalisation individuelle :**
> L'intégralité du code, de l'architecture, du design et de l'intégration de ce module **DevWeb** a été conçue, développée et testée **exclusivement par moi-même**. **Aucun de mes collaborateurs n'a apporté d'aide, de contribution ou de support au développement de cette application.** 

---

## 🛠️ Architecture du Projet

L'application a été construite sans frameworks lourds pour garantir des performances optimales et une légèreté maximale (Vanilla JS / Pure CSS / Node.js standard).

```
DevWeb/
├── server.js               # Serveur proxy Node.js (sans dépendance externe)
└── public/                 # Fichiers statiques servis au client
    ├── index.html          # Structure de l'interface de chat
    ├── style.css           # Thémage premium et styles responsives (780+ lignes de CSS)
    ├── app.js              # Gestionnaire d'état de l'application et appels API
    ├── parser.js           # Parseur Markdown personnalisé (léger et sécurisé)
    └── ui.js               # Assistants de rendu DOM et animations de l'interface
```

---

## 🌟 Fonctionnalités Implémentées

### 1. Serveur Proxy Backend (`server.js`)
* **Service Statique** : Sert les ressources du dossier `/public` de manière autonome via l'API standard `http` et `fs` de Node.js (pas besoin d'installer Express).
* **Vérification d'état (`/api/status`)** : Interroge en arrière-plan l'instance locale d'Ollama (`/api/tags` sur le port 11434) pour remonter son état de fonctionnement.
* **Proxy de Requête Chat (`/api/chat`)** : Transmet de manière transparente les prompts utilisateurs et les historiques de messages au serveur d'inférence, en gérant le transfert d'en-têtes et le piping de flux.

### 2. Interface Client Moderne et Premium
* **Indicateur de Connexion Dynamique** : Vérifie l'état d'Ollama toutes les 5 secondes. L'interface s'adapte en temps réel (activation/désactivation des champs d'entrée, affichage visuel du statut connecté/déconnecté).
* **Sélecteur de Modèles Intelligent** : Récupère la liste de tous les modèles d'IA installés localement (avec affichage de leur taille en Go) et permet de basculer instantanément de l'un à l'autre.
* **Historique Persistant** : Sauvegarde locale des conversations et du dernier modèle sélectionné via le `localStorage` du navigateur. Les utilisateurs peuvent charger, supprimer ou effacer des discussions passées.
* **Zone d'Entrée Avancée** : Zone de texte (`textarea`) auto-redimensionnable en hauteur. Comportement de messagerie moderne (envoi rapide avec la touche `Entrée` et saut de ligne avec `Shift + Entrée`).
* **Indicateur d'Écriture (Typing Indicator)** : Animation fluide de trois points lors de la génération de la réponse pour améliorer l'expérience utilisateur (UX).
* **Gestion Robuste des Erreurs** : Bulles système dédiées et alertes colorées en cas de perte de connexion avec le serveur ou d'échec de la requête.

### 3. Parseur Markdown Personnalisé (`parser.js`)
Développement d'un parseur Markdown léger et sécurisé en JavaScript natif, prenant en charge :
* La coloration syntaxique automatique de blocs de code multilingues (JavaScript, Python, CSS, HTML...) grâce à l'intégration de **PrismJS**.
* Les listes ordonnées et non ordonnées (`*`, `-`, `1.`).
* Les différents niveaux de titres (`#`, `##`, `###`).
* Les styles en gras (`**`), italique (`*` ou `_`), le code en ligne (`` ` ``) et les hyperliens.
* Échappement automatique du HTML pour prévenir les failles XSS lors de l'affichage des réponses du modèle.

---

## 🚀 Comment Lancer l'Application

### Prérequis
1. Avoir **Ollama** installé et en cours d'exécution sur votre machine (port `11434`).
2. S'assurer qu'au moins un modèle (par exemple `phi3.5`, `qwen2.5:3b` ou un modèle financier) est disponible.

### Démarrage
1. Naviguez dans le dossier `DevWeb` :
   ```bash
   cd DevWeb
   ```
2. Lancez le serveur Node.js :
   ```bash
   node server.js
   ```
3. Ouvrez votre navigateur et accédez à l'adresse suivante :
   * 🔗 **[http://localhost:3000](http://localhost:3000)**

---

## 🎨 Conception Graphique & Expérience Utilisateur

L'interface a été conçue pour offrir un aspect professionnel et épuré :
* **Palette Harmonieuse** : Base de gris ardoise moderne (`#f8fafc` / `#0f172a`), dégradés fluides pour les bulles de l'utilisateur (`Indigo` vers `Blue`) et contrastes nets pour une lisibilité parfaite.
* **Typographie Soignée** : Utilisation de polices Google Fonts qualitatives : *Outfit* pour les titres et la marque, *Inter* pour le corps du texte et *Fira Code* pour les snippets de code.
* **Design Responsif** : Entièrement adapté aux formats mobiles grâce à une barre de navigation dynamique et une réorganisation fluide de la grille d'affichage.
