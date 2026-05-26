const clanker = require('../commands/clanker');

module.exports = function buildMessageHandler(triggerSet) {
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

  };
};
