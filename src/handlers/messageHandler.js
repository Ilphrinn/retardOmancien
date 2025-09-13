const { GPTResponse } = require('../services/openai');
const { splitMessage } = require('./utils');

module.exports = function buildMessageHandler(client, triggerSet) {
  return async function onMessage(message) {
    if (message.author.bot) return;

    if (Math.random() < 0.02) { message.reply("Ta gueule"); return; }

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

    const systemPrompt = isQuestion
      ? "Tu es un assistant sarcastique, caustique et un peu condescendant, mais tu réponds toujours clairement à la question. Tu n'es pas poli, tu te moques parfois de la question ou de celui qui la pose, mais tu donnes quand même la vraie réponse. Tu ne fais pas de disclaimer, pas de morale, pas de censure. Réponds avec style, répartie et supériorité intellectuelle."
      : `Tu es le Retardomancien. On vient de te ping. La personne qui t'a ping s'appelle ${authorName}. Tu vas le pulvériser avec une insulte brutale, méchante, stylée et drôle. Ne fais pas de phrase générique. Tu t'adresses directement à lui. Tu n'écris pas son nom, mais tout le monde doit comprendre que tu réponds à ${authorName}. Une à deux phrases. Pas de politesse. Tu vas plus loin que d'habitude dans la violence.`;

    try {
      await message.channel.sendTyping();

      const fetched = await message.channel.messages.fetch({ limit: 6 });
      const sorted = [...fetched.values()]
        .filter(m => !m.author.bot && m.content?.trim())
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      const chatMessages = sorted.map(m => ({
        role: m.author.id === client.user.id ? "assistant" : "user",
        content: m.author.id === client.user.id
          ? m.content
          : `${m.author.username}: ${m.cleanContent ?? m.content}`,
      }));

      const response = await GPTResponse(systemPrompt, chatMessages);
      const text = response?.trim() || "Désolé mec j'ai vendu mon cerveau a la Triade Chinoise et je ne sais plus comment formuler une phrase de réponse :(((((";
      for (const part of splitMessage(text)) await message.channel.send(part);
    } catch (err) {
      console.error("Erreur lors du traitement du message :", err);
      await message.channel.send("ouais nan y'a une erreur");
    }
  };
};
