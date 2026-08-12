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
| Finances (paiements, reçus) | 🔜 |
| Administratif (personnel, documents) | 🔜 |

## Installation

```bash
npm install
npm run dev
```

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

La base de données SQLite est stockée localement. Utilisez le bouton **Sauvegarder** dans la barre latérale pour exporter une copie vers un fichier `.db`.

## Licence

MIT
