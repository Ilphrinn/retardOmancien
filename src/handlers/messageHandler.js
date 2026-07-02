const clanker = require('../commands/clanker');
const { askOpenAI } = require('../services/openai');

module.exports = function buildMessageHandler(client, triggerSet) {
  return async function onMessage(message) {
    if (message.author.bot) return;

    const normalizedContent = message.content.toLowerCase();

    // 1.5% de chance de dire "Ta gueule"
    if (Math.random() < 0.015) { 
      message.reply("Ta gueule"); 
      return; 
    }
    
    // Détection de "clanker"
    if (normalizedContent.includes('clanker')) {
      await clanker(message);
      return;
    }

    // Vérification des triggers
    const cleanMessage = normalizedContent.trim().replace(/\s+/g, ' ');
    if (triggerSet.has(cleanMessage)) {
      if (Math.random() < 0.2) message.reply("ok");
      else message.reply("Nan toi ta gueule");
      return;
    }

    // 1% de chance de dire "Ratio"
    if (Math.random() < 0.01) { 
      message.reply("Ratio"); 
      return; 
    }

    if (!message.mentions.users.has(client.user.id)) return;

    const userQuestion = message.content
      .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
      .trim();

    if (!userQuestion) {
      await message.reply("parle vite");
      return;
    }

    try {
      await message.channel.sendTyping();
      const answer = await askOpenAI(userQuestion);
      await message.reply(answer);
    } catch (err) {
      console.error('Erreur OpenAI:', err?.response?.data ? JSON.stringify(err.response.data) : (err?.message || err));
      await message.reply("j'ai pas ton cerveau en stock");
    }

  };
};
