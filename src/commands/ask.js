const AIservices = require('../services/AIservices');
const { logger, splitMessage } = require('../utils/utils');

/**
 * ============================================
 * EVENT : RÉPONSE AUX MENTIONS
 * ============================================
 * Le bot répond uniquement quand il est mentionné
 */

module.exports = {
    name: 'messageCreate',
    
    async execute(message) {
        // Ignorer les bots
        if (message.author.bot) return;

        // Vérifier si le bot est mentionné
        if (!message.mentions.has(message.client.user)) return;

        try {
            const userId = message.author.id;
            const userTag = message.author.tag;
            
            // Récupérer le contenu sans la mention
            let content = message.content
                .replace(/<@!?\d+>/g, '') // Retire toutes les mentions
                .trim();

            // Si mention vide
            if (!content) {
                await message.reply('👋 Salut ! Pose-moi une question après m\'avoir mentionné !');
                return;
            }

            // Commandes spéciales
            if (['reset', 'clear', 'effacer'].includes(content.toLowerCase())) {
                AIservices.clearHistory(userId);
                logger.info(`🔄 Historique réinitialisé pour ${userTag}`);
                await message.reply('🔄 **Historique effacé !** On repart de zéro.');
                return;
            }

            if (['aide', 'help', '?'].includes(content.toLowerCase())) {
                await message.reply(
                    '**🤖 Comment m\'utiliser :**\n' +
                    '• Mentionne-moi + ta question\n' +
                    '• Je garde l\'historique de nos conversations\n' +
                    '• Commandes : `reset`, `aide`'
                );
                return;
            }

            // Indiquer que le bot tape
            await message.channel.sendTyping();

            logger.info(`💬 Question de ${userTag}: "${content.substring(0, 50)}..."`);

            // Obtenir la réponse de l'IA
            const response = await AIservices.getResponse(userId, content, {
                systemPrompt: 'Tu es un assistant Discord utile et concis. Réponds en français de manière claire.',
                maxTokens: 800,
                temperature: 0.7
            });

            // Envoyer la réponse (découpée si nécessaire)
            if (response.length <= 2000) {
                await message.reply(response);
            } else {
                const chunks = splitMessage(response, 2000);
                
                await message.reply(chunks[0]);
                
                for (let i = 1; i < chunks.length; i++) {
                    await message.channel.send(chunks[i]);
                }
                
                logger.info(`📄 Réponse découpée en ${chunks.length} morceaux`);
            }

        } catch (error) {
            logger.error('❌ Erreur dans mentionReply:', error.message);
            await message.reply('❌ **Erreur** : Je n\'ai pas pu traiter ta question. Réessaye.');
        }
    },
};
