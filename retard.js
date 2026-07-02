if (typeof globalThis.File === 'undefined') {
  try {
    globalThis.File = require('node:buffer').File;
  } catch {}
}

require('dotenv').config();

const { Client } = require('discord.js');
const { intents, triggers } = require('./src/config.js');

const client = new Client({ intents });

const buildMessageHandler = require('./src/handlers/messageHandler');
const buildInteractionHandler = require('./src/handlers/interactionHandler');
const { scheduleWeeklyVideo } = require('./src/services/scheduler');

const fs = require('fs');
const path = require('path');
const commands = new Map();

const commandsDir = path.join(__dirname, 'src', 'commands');

for (const file of fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'))) {
  const cmd = require(path.join(commandsDir, file));
  if (cmd?.name && typeof cmd.execute === 'function') {
    commands.set(cmd.name, cmd);
  }
}

client.on('messageCreate', buildMessageHandler(client, triggers));
client.on('interactionCreate', buildInteractionHandler(commands));

client.once('ready', () => {
  console.log('Le retardOmancien est en ligne !');
  scheduleWeeklyVideo(client);
});

client.login(process.env.DISCORD_TOKEN);
