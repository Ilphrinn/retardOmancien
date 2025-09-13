const { GPTResponse } = require('../services/openai');

module.exports = {
  name: 'insulte',
  async execute(interaction) {
    const targetUser = interaction.options.getUser('utilisateur');
    const isBotTargeted = targetUser.id === interaction.client.user.id;
    const trueTarget = isBotTargeted ? interaction.user : targetUser;

    const systemPrompt = isBotTargeted
      ? `Quelqu’un a osé utiliser la commande /insulte contre toi. Mais t’es le Retardomancien. Tu vas venger ton honneur en insultant ${trueTarget.username} encore plus fort que d’habitude.
Écris une insulte impitoyable, brutale, méchante, salée, drôle et humiliante. Tu peux aller plus loin que d’habitude. Une ou deux phrases max. Pas de nom dans le texte, juste du carnage.
Dis bien a ce batard de pas te ping`
      : `Quelqu’un a osé utiliser la commande /insulte. Mais t’es le Retardomancien. Tu vas venger ton honneur en insultant ${trueTarget.username} encore plus fort que d’habitude.
Écris une insulte impitoyable, brutale, méchante, salée, drôle et humiliante. Tu peux aller plus loin que d’habitude. Une ou deux phrases max. Pas de nom dans le texte, juste du carnage.
Dis bien a ce batard`;

    const chatMessages = [
      { role: "user", content: isBotTargeted
          ? "Insulte l’auteur de la commande encore plus violemment que d’habitude, sans dire son nom."
          : "Insulte quelqu’un de façon violente et énervée, sans dire son nom." }
    ];

    const phrase = await GPTResponse(systemPrompt, chatMessages);
    await interaction.channel.send({
      content: `${trueTarget}, ${phrase}`,
      allowedMentions: { users: [trueTarget.id] }
    });
  }
};
