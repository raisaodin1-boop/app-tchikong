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
| Socle technique (DB, auth persistante, navigation, rôles) | ✅ |
| Gestion des élèves (CRUD, recherche, présence, statuts) | ✅ |
| Scolarité (notes, moyennes, bulletins PDF, palmarès) | ✅ |
| Documents PDF (attestations, certificats, listes) | ✅ |
| Finances (paiements, reçus PDF, impayés, dépenses, tarifs) | ✅ |
| Administratif (personnel, classes, années, utilisateurs, documents) | ✅ |

## ⚠️ Important : ce n'est PAS un site web

Cette application est une **application de bureau Windows** (Electron).  
**Vercel ne peut pas l'héberger.** Elle s'installe et tourne sur votre PC.

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

La base de données SQLite est stockée localement. Utilisez **Sauvegarder** / **Restaurer** dans la barre latérale pour exporter ou réimporter un fichier `.db`.

## Droits d'accès

| Rôle | Accès |
|------|--------|
| Directrice | Tous les modules |
| Secrétariat | Tableau de bord, élèves, présences, scolarité, administratif (sauf utilisateurs) |
| Comptable | Tableau de bord, élèves, finances |

## Licence

MIT
