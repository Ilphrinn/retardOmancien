const { fetchRandomMeme, downloadToDiscordAttachment } = require('../services/memes');

module.exports = {
  name: 'meme',
  async execute(interaction) {
    const meme = await fetchRandomMeme();
    if (!meme) {
      await interaction.channel.send("https://tenor.com/view/kirby-i-forgot-i-forgor-gif-22449575");
      return;
    }
    try {
      const file = await downloadToDiscordAttachment(meme.url, meme.type);
      if (meme.type === 'image' || meme.type === 'video') {
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
