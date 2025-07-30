const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const { DISCORD_TOKEN, CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error("❌ DISCORD_TOKEN ou CLIENT_ID manquant dans .env");
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder().setName('curse').setDescription('Active Curse of Ra'),
  new SlashCommandBuilder().setName('copiepate').setDescription('Reçoit une copiepasta'),
  new SlashCommandBuilder().setName('meme').setDescription('Reçoit un meme'),
  new SlashCommandBuilder().setName('ascii').setDescription('Envoie un ASCII random'),
  new SlashCommandBuilder().setName('insulte').setDescription("insulte quelqu'un")
    .addUserOption(option => option.setName('utilisateur').setDescription("la personne que tu roast").setRequired(true)),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log('📡 Déploiement des commandes slash...');
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, 787986118678937610), { body: commands });
    console.log('✅ Commandes slash enregistrées avec succès.');
  } catch (err) {
    console.error('❌ Erreur lors de l’enregistrement des commandes :', err);
    process.exit(1);
  }
})();
