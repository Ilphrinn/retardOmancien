const { Client } = require('discord.js');
const { intents, triggers } = require('./src/config.js');

const client = new Client({ intents });

const buildMessageHandler = require('./src/handlers/messageHandler');
const buildInteractionHandler = require('./src/handlers/interactionHandler');

// charge automatiquement les commandes du dossier
const fs = require('fs');
const path = require('path');
const commands = new Map();
const commandsDir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'))) {
  const cmd = require(path.join(commandsDir, file));
  if (cmd?.name && typeof cmd.execute === 'function') commands.set(cmd.name, cmd);
}

client.on('messageCreate', buildMessageHandler(client, triggers));
client.on('interactionCreate', buildInteractionHandler(commands));

client.once('ready', () => {
  console.log('Le retardOmancien est en ligne !');
});

client.login(process.env.DISCORD_TOKEN);
