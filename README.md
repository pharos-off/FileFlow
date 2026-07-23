# FileFlow

> Organisez un dossier localement, sans cloud et sans perdre le contrôle de vos fichiers.

FileFlow est une application open source qui analyse un dossier, classe ses fichiers par catégorie et affiche un aperçu détaillé avant toute modification. Elle fonctionne entièrement en local : aucune donnée n’est envoyée sur Internet.

![Licence MIT](https://img.shields.io/badge/licence-MIT-6f8cff?style=flat-square)
![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-69d4a3?style=flat-square)
![Hors ligne](https://img.shields.io/badge/confidentialit%C3%A9-100%20%25%20local-4f7cff?style=flat-square)

## Fonctionnalités

- Interface locale moderne, ouverte dans votre navigateur.
- Aperçu obligatoire avant chaque modification.
- Classement par catégories : images, vidéos, musique, documents, archives, code, PDF, e-books, programmes, polices et modèles 3D.
- Détection par extension et par signature de fichier quand elle est reconnue.
- Tri optionnel par année ou par mois.
- Détection des doublons avec empreinte SHA-256.
- Renommage optionnel avec la date et l’heure du fichier.
- Nettoyage optionnel de fichiers temporaires (`.tmp`, `.bak`, `.old`, `.cache`, `Thumbs.db`, `.DS_Store`).
- Journalisation et historique des déplacements.
- Annulation de la dernière exécution.

## Installation

### Prérequis

- [Node.js](https://nodejs.org/) 18 ou plus récent.

### Lancer l’application

Depuis le dossier du projet :

```powershell
npm start
```

L’interface s’ouvre automatiquement sur `http://127.0.0.1:3847`.

Sous Windows, vous pouvez aussi double-cliquer sur [`Lancer-FileFlow.bat`](./Lancer-FileFlow.bat).

Pour arrêter l’application, revenez dans le terminal puis utilisez `Ctrl + C`.

## Utiliser l’interface

1. Collez le chemin complet du dossier à organiser, par exemple `C:\Users\Vous\Downloads`.
2. Choisissez les options souhaitées.
3. Cliquez sur **Prévisualiser**.
4. Vérifiez la liste des déplacements et suppressions prévus.
5. Cliquez sur **Confirmer les changements**.

Par défaut, FileFlow ne modifie rien : un aperçu est toujours nécessaire.

### Options disponibles

| Option | Description |
| --- | --- |
| Trier par date | Crée des sous-dossiers par année ou par mois. |
| Renommer avec la date | Renomme les fichiers sous la forme `YYYY-MM-DD_HH-MM-SS.ext`. |
| Détecter les doublons | Compare les fichiers avec SHA-256 et les déplace dans `Duplicates`. |
| Nettoyer les temporaires | Supprime les fichiers temporaires identifiés. |
| Inclure les sous-dossiers | Analyse aussi le contenu des sous-dossiers. |

## Sécurité et annulation

Les déplacements sont enregistrés dans `history/`. Utilisez **Annuler la dernière exécution** dans l’interface ou la commande CLI suivante :

```powershell
npm run cli -- "C:\Users\Vous\Downloads" --undo
```

> Les suppressions de fichiers temporaires ou de doublons ne peuvent pas être restaurées. Vérifiez toujours l’aperçu avant de confirmer.

## Utilisation en ligne de commande

L’interface est recommandée, mais la CLI reste disponible :

```powershell
# Aperçu uniquement
npm run cli -- "C:\Users\Vous\Downloads"

# Appliquer le tri par année
npm run cli -- "C:\Users\Vous\Downloads" --by-date year --apply

# Inclure les sous-dossiers et renommer les fichiers
npm run cli -- "C:\Users\Vous\Downloads" --recursive --rename --apply
```

| Argument | Effet |
| --- | --- |
| `--apply` | Exécute le plan affiché. |
| `--undo` | Annule les déplacements de la dernière exécution. |
| `--recursive` | Analyse les sous-dossiers. |
| `--by-date year` | Classe dans des dossiers annuels. |
| `--by-date month` | Classe dans des dossiers mensuels. |
| `--rename` | Renomme avec la date et l’heure. |
| `--clean` | Supprime les fichiers temporaires identifiés. |
| `--config <fichier>` | Utilise un fichier de configuration JSON. |

## Configuration

Les valeurs par défaut sont dans [`config.json`](./config.json).

```json
{
  "sortByDate": false,
  "dateGrouping": "year",
  "detectDuplicates": true,
  "duplicateAction": "duplicates",
  "renameFiles": false,
  "cleanTemporaryFiles": false,
  "createLogs": true,
  "createUndoHistory": true
}
```

Vous pouvez fournir votre propre fichier :

```powershell
npm run cli -- "C:\Users\Vous\Downloads" --config "C:\Users\Vous\fileflow.json" --apply
```

## Structure du projet

```text
FileFlow/
├── public/              # Interface web locale
├── src/
│   ├── app.js           # Serveur local et API de l’interface
│   ├── index.js         # Interface en ligne de commande
│   ├── scanner.js       # Analyse du dossier
│   ├── organizer.js     # Construction du plan de tri
│   ├── duplicate.js     # Empreintes SHA-256
│   ├── mover.js         # Déplacements et suppressions
│   └── history.js       # Historique et annulation
├── config.json
├── Lancer-FileFlow.bat
└── package.json
```

## Confidentialité

FileFlow fonctionne sur votre ordinateur et n’utilise ni compte, ni API distante, ni base de données, ni télémétrie. Les fichiers restent sur votre disque.

## Licence

Distribué sous licence [MIT](./LICENSE).
