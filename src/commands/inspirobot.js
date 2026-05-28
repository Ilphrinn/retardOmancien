const { fetchInspirobotImageUrl } = require('../services/inspirobot');

module.exports = {
  name: 'inspirobot',
  async execute(interaction) {
    try {
      const imageUrl = await fetchInspirobotImageUrl();
      await interaction.channel.send(imageUrl);
    } catch (err) {
      console.error('Erreur Inspirobot :', err);
      await interaction.channel.send("Impossible de contacter Inspirobot pour l'instant.");
    }
  }
};
