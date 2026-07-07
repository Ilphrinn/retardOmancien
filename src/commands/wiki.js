const { searchFirstLink, searchAnyLinkFromCorpus, getRandomPage } = require('../services/wiki');

module.exports = {
  name: 'wiki',
  async execute(interaction) {
    const query = interaction.options?.getString?.('recherche');
    let link;
    if (query) {
      link = await searchFirstLink(query);
    } else {
      const fetched = await interaction.channel.messages.fetch({ limit: 5 });
      const corpus = [...fetched.values()].map(m=>m.content).join(' ');
      link = await searchAnyLinkFromCorpus(corpus);
    }
    if (!link) {
      link = await getRandomPage();
    }
    await interaction.channel.send(link || "Aucun article trouvé.");
  }
};
