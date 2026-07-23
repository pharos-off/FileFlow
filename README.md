# FileFlow

Organisateur de fichiers open-source, local et prudent. FileFlow analyse un dossier, classe les fichiers par type, détecte les doublons SHA-256 et affiche toujours un aperçu avant de modifier quoi que ce soit.

## Démarrer

Nécessite Node.js 18 ou plus récent.

```bash
npm start
```

L'application ouvre automatiquement l'interface locale dans votre navigateur. Collez le chemin du dossier, choisissez les options, consultez l'aperçu puis confirmez.

Les suppressions de fichiers temporaires et les doublons configurés en suppression ne sont pas récupérables par `--undo` ; le mode aperçu permet de les vérifier avant confirmation.

## Licence

MIT
