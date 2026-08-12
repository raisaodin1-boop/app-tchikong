# TCHIKONG — Logiciel de Gestion Scolaire

Application desktop de gestion scolaire pour le **Groupe Scolaire Bilingue Primaire et Maternelle TCHIKONG** (Douala, Cameroun).

## Stack technique

- **Electron** — application desktop (Windows prioritaire)
- **React + TypeScript** — interface utilisateur
- **SQLite** (`better-sqlite3`) — base de données locale
- **Tailwind CSS** — design moderne et productif
- **pdf-lib** — moteur PDF professionnel hors-ligne (bulletins, attestations, palmarès, listes)

## Fonctionnalités (V1 en cours)

| Module | Statut |
|--------|--------|
| Socle technique (DB, auth, navigation) | ✅ |
| Gestion des élèves (CRUD, recherche, présence) | ✅ |
| Scolarité (notes, moyennes, bulletins PDF, palmarès) | ✅ |
| Documents PDF (attestations, certificats, listes) | ✅ |
| Finances (paiements, reçus PDF, impayés, dépenses) | ✅ |
| Administratif (personnel, classes, utilisateurs, documents) | ✅ |
| Démarrage d'année et modules de frais configurables par la directrice | ✅ |

## Deux modes entièrement hors connexion

- **Application Windows (Electron)** : données dans une base SQLite sur le PC.
- **Application navigateur installable (PWA)** : tous les modules utilisent SQLite WebAssembly et
  enregistrent la base dans le stockage local du navigateur (IndexedDB).

Vercel sert uniquement les fichiers de l'application. Après la première ouverture et
l'installation de la PWA, les écrans, le moteur SQLite et la génération PDF fonctionnent sans
Internet. Aucune donnée scolaire n'est envoyée à Vercel ou à une API distante.

> Les données du navigateur appartiennent au navigateur et à l'appareil utilisés. Utilisez
> régulièrement **Sauvegarder** pour télécharger une copie `.db`, et **Restaurer** pour la
> réimporter. Ne videz pas les données du site sans sauvegarde.

### Début d'une année scolaire

Dans **Administration → Années scolaires**, la directrice démarre la nouvelle année. Les classes
et capacités de l'année précédente sont copiées, sans copier les élèves ni les paiements. Elle est
ensuite dirigée vers **Administration → Frais scolaires** pour créer chaque module à payer
(scolarité, inscription, tenues, fournitures ou module libre) avec :

- un prix unique applicable à toutes les classes ; ou
- un montant obligatoire défini séparément pour chaque classe.

---

## Installation Windows (méthode simple)

### Méthode A — Double-clic (recommandée)

1. Téléchargez le projet : [branche cursor/tchikong-school-app-bbfb](https://github.com/raisaodin1-boop/app-tchikong/tree/cursor/tchikong-school-app-bbfb)  
   → bouton vert **Code** → **Download ZIP** → dézippez dans `C:\Users\VotreNom\app-tchikong`
2. Installez **Node.js 22 LTS** : https://nodejs.org (pas la version 24)
3. **Double-cliquez** sur `INSTALLER.bat` (attendez la fin)
4. **Double-cliquez** sur `LANCER.bat`

### Méthode B — Télécharger l'installateur (.exe) sans Node.js

1. Allez sur GitHub → onglet **Actions** : https://github.com/raisaodin1-boop/app-tchikong/actions
2. Cliquez sur **Build Windows** dans la liste de gauche
3. Cliquez sur la **dernière ligne avec ✓ vert** (pas une croix rouge)
4. Descendez tout en bas de la page → section **Artifacts**
5. Téléchargez **TCHIKONG-Windows-Installer**
6. Extrayez le ZIP et lancez `TCHIKONG Gestion Scolaire Setup 1.0.0.exe`

> **Pas d'Artifacts ?** = le build a échoué (croix rouge). Attendez un build vert ou utilisez la Méthode A.

### Méthode C — Ligne de commande

```bash
git clone -b cursor/tchikong-school-app-bbfb https://github.com/raisaodin1-boop/app-tchikong.git
cd app-tchikong
npm install
npm run dev
```

### Si `npm install` échoue (erreur better-sqlite3)

Installez **Build Tools for Visual Studio 2022** avec « Développement Desktop en C++ » :  
https://visualstudio.microsoft.com/visual-cpp-build-tools/  
Puis redémarrez le PC et relancez `INSTALLER.bat`.

Ou utilisez la **Méthode B** (installateur pré-compilé sur GitHub Actions).

## Comptes de démonstration

| Identifiant | Mot de passe | Rôle |
|-------------|-------------|------|
| `admin` | `admin123` | Directrice |
| `secretaire` | `secret123` | Secrétariat |
| `comptable` | `compta123` | Comptable |

## Version navigateur / Vercel

```bash
npm install
npm run dev:web
```

Build de production :

```bash
npm run build:web
```

Le dossier `dist/` obtenu est l'artefact web autonome. Il peut être déployé sur Vercel (le fichier
`vercel.json` configure automatiquement le build) ou servi sur le réseau local avec un serveur
HTTP statique. Un simple double-clic sur `index.html` n'est pas pris en charge, car les fonctions
hors connexion et SQLite WebAssembly exigent une origine HTTP locale.

Sur Vercel, ouvrez l'application une première fois avec Internet, puis choisissez
**Installer l'application** dans le navigateur. Elle pourra ensuite démarrer hors connexion.

## Structure du projet

```
electron/          # Process principal Electron + IPC
  main/            # Point d'entrée, services, handlers
  preload/         # Bridge sécurisé renderer ↔ main
src/               # Application React (renderer)
  components/      # Composants réutilisables
  contexts/        # Auth, données globales
  pages/           # Pages par module
db/                # Schéma SQLite + migrations + seed
shared/            # Types TypeScript partagés
```

## Sauvegarde

La base de données SQLite est stockée localement. Utilisez le bouton **Sauvegarder** dans la barre latérale pour exporter une copie vers un fichier `.db`.

## Licence

MIT
