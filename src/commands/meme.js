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
      await interaction.channel.send("I forgor");
      return;
    }
    try {
      if (meme.downloadUrl) {
        const file = await downloadToDiscordAttachment(meme);
        await interaction.channel.send({ files: [file] });
      } else {
        await interaction.channel.send(meme.url);
      }
    } catch (err) {
      console.error('me stoopid', err);
      await interaction.channel.send(meme.url);
    }
  }
};
