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

## Lancer le bot

```bash
npm start
```

## Publier les commandes slash

```bash
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
