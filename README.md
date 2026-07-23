# FileFlow

Organisateur de fichiers open-source, local et prudent. FileFlow analyse un dossier, classe les fichiers par type, détecte les doublons SHA-256 et affiche toujours un aperçu avant de modifier quoi que ce soit.

## Démarrer

Nécessite Node.js 18 ou plus récent.

```bash
npm start
```

L'application ouvre automatiquement l'interface locale dans votre navigateur. Collez le chemin du dossier, choisissez les options, consultez l'aperçu puis confirmez.

Ou après installation locale :

```bash
npm run cli -- "C:\\Users\\vous\\Downloads" --by-date year --apply
```

## Options

| Option | Effet |
| --- | --- |
| `--apply` | Applique le plan affiché. Sans cette option, rien ne change. |
| `--undo` | Annule les déplacements de la dernière exécution. |
| `--recursive` | Analyse aussi les sous-dossiers. |
| `--by-date year` | Crée `Images/2026/`, etc. |
| `--by-date month` | Crée `Images/Juillet/`, etc. |
| `--rename` | Renomme avec `YYYY-MM-DD_HH-MM-SS`. |
| `--clean` | Supprime les fichiers temporaires identifiés. |
| `--config fichier.json` | Charge une configuration personnalisée. |

Les suppressions de fichiers temporaires et les doublons configurés en suppression ne sont pas récupérables par `--undo` ; le mode aperçu permet de les vérifier avant confirmation.

## Configuration

Copiez ou modifiez `config.json`, puis passez-le avec `--config`. Les doublons peuvent être ignorés, déplacés dans `Duplicates` (défaut) ou supprimés (`duplicateAction: "delete"`).

## Licence

MIT
