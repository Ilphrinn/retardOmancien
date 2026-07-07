const { getMemeFact } = require('../services/knowyourmeme');

module.exports = {
  name: 'knowyourmeme',
  async execute(interaction) {
    const query = interaction.options?.getString?.('recherche');
    const fact = await getMemeFact(query);

    if (!fact) {
      await interaction.channel.send("Aucun meme trouvé.");
      return;
    }

    const lines = [`**${fact.title}**`, fact.summary];
    if (fact.image) lines.push(fact.image);
    lines.push(fact.url);

    await interaction.channel.send(lines.join('\n'));
  }
};
