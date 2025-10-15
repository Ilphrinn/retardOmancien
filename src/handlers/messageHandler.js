const { splitMessage } = require('../utils');
const clanker = require('../commands/clanker');

module.exports = function buildMessageHandler(client, triggerSet) {
  return async function onMessage(message) {
    if (message.author.bot) return;

    if (Math.random() < 0.015) { message.reply("Ta gueule"); return; }

    const lower = message.content.toLowerCase();
    if (lower.includes('clanker')) {
      await clanker(message);
      return;
    }

    const cleanMessage = message.content.toLowerCase().trim().replace(/\s+/g, ' ');
    if (triggerSet.has(cleanMessage)) {
      if (Math.random() < 0.01) message.reply("ok");
      else message.reply("Nan toi ta gueule");
      return;
    }

    if (Math.random() < 0.01) { message.reply("Ratio"); return; }

    if (!message.mentions.users.has(client.user.id)) return;

    const clean = message.cleanContent ?? message.content ?? "";
    const isQuestion = /\?\s*$/.test(clean);
    const authorName = message.author.username;

    try {
      await message.channel.sendTyping();

      const text = response?.trim() || "Désolé mec j'ai vendu mon cerveau a la Triade Chinoise et je ne sais plus comment formuler une phrase de réponse :(((((";
      const parts = splitMessage(text);
      const allowedMentions = { repliedUser: false };

      for (const part of parts) {
        // reply pour référencer explicitement le message qui a ping le bot
        // on désactive le ping automatique de l'auteur
        await message.reply({ content: part, allowedMentions });
      }
    } catch (err) {
      console.error("Erreur lors du traitement du message :", err);
      await message.reply({
        content: "ouais nan y'a une erreur",
        allowedMentions: { repliedUser: false }
      });
    }
  };
};
