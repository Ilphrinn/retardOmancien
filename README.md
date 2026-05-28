# RetardOmancien

Bot Discord en Node.js (`discord.js`), prêt pour un déploiement Railway simple.

## Prérequis

- Node.js 20+
- Un bot Discord (token + client id)
- (Optionnel) identifiants Reddit

## Installation locale

```bash
npm install
```

Créer un fichier `.env` à partir de `.env.example`.
Ce fichier est déjà ignoré par Git, donc le token ne part pas dans le dépôt.

## Lancer le bot

```bash
npm start
```

## Publier les commandes slash

```bash
npm run slash
```

Si tu ne veux rien écrire sur disque, tu peux aussi injecter les variables uniquement dans la session PowerShell:

```powershell
$env:DISCORD_TOKEN="ton_token"
$env:CLIENT_ID="ton_client_id"
npm run slash
```

## Déploiement Railway

Le repo contient un `railway.json` pour forcer la commande de démarrage.

1. Connecter ce repo GitHub au service Railway.
2. Ajouter les variables d'environnement (section ci-dessous).
3. Railway déploie automatiquement à chaque `git push` sur la branche connectée.

Pour forcer un redéploiement sans code:

- Dans Railway: `Deployments` -> `Redeploy`.

## Variables d'environnement

Obligatoires:

- `DISCORD_TOKEN`
- `CLIENT_ID` (requis pour `npm run slash`)

Optionnelles (fonctionnalités associées):

- `OPENAI_API_KEY` (requis pour réponses aux mentions du bot)
- `OPENAI_MODEL` (optionnel, défaut: `gpt-4o-mini`)
- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`
- `REDDIT_USERNAME`
- `REDDIT_PASSWORD`

## Workflow recommandé de mise à jour

1. Modifier le code localement.
2. Tester localement (`npm start`).
3. Commit + push sur GitHub.
4. Laisser Railway redéployer automatiquement.
5. Si besoin de maj slash commands: lancer `npm run slash` avec les bonnes variables.
   Les variables Railway ne sont pas disponibles automatiquement quand tu lances la commande localement.

## Redeploy rapide (terminal uniquement)

Pour forcer un redeploy Railway sans passer par le web:

```bash
npm run redeploy
```

Cette commande crée un commit vide puis push sur `main`, ce qui déclenche le déploiement automatique Railway.
