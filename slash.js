// Script de déploiement des commandes slash
require('dotenv').config();

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

// Variables d'environnement nécessaires
const { DISCORD_TOKEN, CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error("❌ DISCORD_TOKEN ou CLIENT_ID manquant. En local, crée un .env ignoré par Git ou définis les variables dans PowerShell.");
  process.exit(1);
}

// Déclaration des commandes disponibles
const commands = [
  new SlashCommandBuilder().setName('curse').setDescription('Active Curse of Ra'),
  new SlashCommandBuilder().setName('copiepate').setDescription('Reçoit une copiepasta'),
  new SlashCommandBuilder().setName('meme').setDescription('Reçoit un meme (image ou vidéo)'),
  new SlashCommandBuilder().setName('ascii').setDescription('Envoie un ASCII random'),
  new SlashCommandBuilder().setName('inspirobot').setDescription('Envoie une image inspirante de Inspirobot'),
  new SlashCommandBuilder()
    .setName('wiki')
    .setDescription('Lien Wikipédia lié aux derniers messages ou à une recherche')
    .addStringOption(option =>
      option
        .setName('recherche')
        .setDescription('Terme à rechercher sur Wikipédia')
        .setRequired(false)
    ),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

// Enregistrement effectif auprès de l'API Discord
(async () => {
  try {
    console.log('📡 Déploiement des commandes slash...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Commandes slash enregistrées avec succès.');
  } catch (err) {
    console.error('❌ Erreur lors de l’enregistrement des commandes :', err);
    process.exit(1);
  }
})();
