const { fetchRandomMeme, downloadToDiscordAttachment } = require('../services/meme');

module.exports = {
  name: 'meme',
  async execute(interaction) {
    let meme = null;
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      meme = await fetchRandomMeme();
      if (meme) break;
    }

    if (!meme) {
      await interaction.channel.send("Impossible de trouver un meme pour le moment, réessaie dans quelques secondes.");
      return;
    }
    try {
      if (meme.downloadUrl) {
        const file = await downloadToDiscordAttachment(meme.downloadUrl, meme.type);
        await interaction.channel.send({ files: [file] });
      } else {
        await interaction.channel.send(meme.url);
      }
    } catch (err) {
      console.error('Erreur lors du téléchargement du meme :', err);
      await interaction.channel.send(meme.url);
    }
  }
};
