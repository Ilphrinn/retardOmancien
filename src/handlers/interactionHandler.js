const { acknowledge } = require('./utils');

module.exports = function buildInteractionHandler(commandsMap) {
  return async function onInteraction(interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = commandsMap.get(interaction.commandName);
    if (!cmd) return;
    try {
      await acknowledge(interaction);
      await cmd.execute(interaction);
    } catch (err) {
      console.error(`Erreur commande /${interaction.commandName}:`, err);
      try { await interaction.channel.send("ouais nan y'a une erreur"); } catch(_){}
    }
  };
};
