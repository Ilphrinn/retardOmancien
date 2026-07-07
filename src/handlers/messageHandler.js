const clanker = require('../commands/clanker');
const { askOpenAI } = require('../services/openai');
const { lookupMeme } = require('../services/knowyourmeme');
const { fetchInspirobotImageUrl } = require('../services/inspirobot');

function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallback), ms))
  ]);
}

async function fetchRecentMessages(channel, excludeId) {
  try {
    const history = await channel.messages.fetch({ limit: 10 });
    return [...history.values()]
      .filter(m => m.id !== excludeId && m.content)
      .reverse()
      .map(m => `${m.author.username}: ${m.content.slice(0, 150)}`);
  } catch {
    return [];
  }
}

function pickRandomEmojis(guild, count) {
  if (!guild) return [];
  const emojis = [...guild.emojis.cache.values()];
  if (emojis.length === 0) return [];
  const shuffled = emojis.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(e => `<${e.animated ? 'a' : ''}:${e.name}:${e.id}>`);
}

module.exports = function buildMessageHandler(client, triggerSet) {
  return async function onMessage(message) {
    if (message.author.bot) return;

    const normalizedContent = message.content.toLowerCase();

    // 0.75% de chance de dire "Ta gueule"
    if (Math.random() < 0.0075) {
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

    // 1% de chance de répondre avec une image Inspirobot
    if (Math.random() < 0.01) {
      try {
        const imageUrl = await fetchInspirobotImageUrl();
        await message.reply(imageUrl);
      } catch (err) {
        console.error('Erreur Inspirobot :', err?.message || err);
      }
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

      const [recentMessages, memeContext] = await Promise.all([
        fetchRecentMessages(message.channel, message.id),
        withTimeout(lookupMeme(userQuestion), 4000, null)
      ]);
      const availableEmojis = Math.random() < 0.25 ? pickRandomEmojis(message.guild, 6) : [];
      const answer = await askOpenAI(userQuestion, { recentMessages, memeContext, availableEmojis });
      await message.reply(answer);
    } catch (err) {
      console.error('Erreur OpenAI:', err?.response?.data ? JSON.stringify(err.response.data) : (err?.message || err));
      await message.reply("j'ai pas ton cerveau en stock");
    }

  };
};
