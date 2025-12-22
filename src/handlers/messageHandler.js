const { splitMessage } = require('../utils');
const clanker = require('../commands/clanker');
const mammouthService = require('../services/AIservices');

module.exports = function buildMessageHandler(client, triggerSet) {
  return async function onMessage(message) {
    if (message.author.bot) return;

    // 1.5% de chance de dire "Ta gueule"
    if (Math.random() < 0.015) { 
      message.reply("Ta gueule"); 
      return; 
    }

    const lower = message.content.toLowerCase();
    
    // Détection de "clanker"
    if (lower.includes('clanker')) {
      await clanker(message);
      return;
    }

    // Vérification des triggers
    const cleanMessage = message.content.toLowerCase().trim().replace(/\s+/g, ' ');
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

    // Vérifier si le bot est mentionné
    if (!message.mentions.users.has(client.user.id)) return;

    // Extraire le message sans la mention
    let userMessage = message.content
      .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
      .trim();

    // Si pas de message après la mention
    if (!userMessage) {
      return message.reply({
        content: 'keske tu veux zebi ?',
        allowedMentions: { repliedUser: false }
      });
    }

    console.log(`💬 Mention de ${message.author.tag}: "${userMessage}"`);

    try {
      await message.channel.sendTyping();

      // Obtenir la réponse de l'IA
      const aiResponse = await mammouthService.getResponse(
        message.author.id,
        userMessage,
        {
          systemPrompt: 'Réponds en français, Tu es retardOmancien, Tu es un utilisateur moyen de X : brut, violent, insultes créatives seulement. Max 15 mots. Insulte salement, défends-toi comme un loup enragé. Pas de merde mignonne, zéro conneries.',
          maxTokens: 800,
          temperature: 0.9
        }
      );

      const text = aiResponse?.trim() || "Désolé mec j'ai vendu mon cerveau a la Triade Chinoise et je ne sais plus comment formuler une phrase de réponse :(((((";
      const parts = splitMessage(text);
      const allowedMentions = { repliedUser: false };

      for (const part of parts) {
        await message.reply({ content: part, allowedMentions });
      }

    } catch (err) {
      console.error("❌ Erreur lors du traitement du message :", err);
      
      let errorMessage = "📡📡📡📡📡📡📡📡📡📡📡📡📡📡📡";
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = "Tu me casse les couilles ferme ta gueule j'en ai pleins la tête";
      } else if (err.response?.status === 429) {
        errorMessage = "Ferme ta gueule deux secondes ??? Merci mec";
      } else if (err.response?.status === 401) {
        errorMessage = "Je parle a mon cerveau mais il écoute pas zebi";
        console.error('⚠️ Vérifier MAMMOUTH_API_KEY dans .env');
      }
      
      await message.reply({
        content: errorMessage,
        allowedMentions: { repliedUser: false }
      });
    }
  };
};
