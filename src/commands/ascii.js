const { fetchRandomAscii } = require('../services/ascii');
const { splitMessage } = require('./utils');

module.exports = {
  name: 'ascii',
  async execute(interaction) {
    try {
      const random = await fetchRandomAscii();
      if (!random) {
        await interaction.channel.send("https://tenor.com/view/kirby-i-forgot-i-forgor-gif-22449575");
        return;
      }
      for (const part of splitMessage(random, 2000)) await interaction.channel.send(part);
    } catch (err) {
      console.error("Erreur Puppeteer ASCII :", err.message);
      await interaction.channel.send("Erreur lors du chargement de l'ASCII.");
    }
  }
};
