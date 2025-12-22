const { SlashCommandBuilder } = require('discord.js');
const AIservices = require('../services/AIservices');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Poser une question à l\'IA (Grok via Mammouth.ai)')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Votre question')
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option.setName('reset')
                .setDescription('Réinitialiser l\'historique de conversation')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const question = interaction.options.getString('question');
            const reset = interaction.options.getBoolean('reset');

            // Réinitialiser l'historique si demandé
            if (reset) {
                AIservices.clearHistory(interaction.user.id);
                await interaction.reply({
                    content: '🔄 Historique réinitialisé ! Posez votre question.',
                    ephemeral: true
                });
                return;
            }

            // Indiquer que le bot réfléchit
            await interaction.deferReply();

            logger.info(`Question posée par ${interaction.user.tag}: ${question}`);

            // Obtenir la réponse
            const response = await AIservices.getResponse(
                interaction.user.id,
                question,
                {
                    systemPrompt: 'Tu es un assistant IA intégré à Discord. Tu réponds de manière claire, concise et utile.',
                    maxTokens: 800,
                    temperature: 0.7
                }
            );

            // Découper la réponse si trop longue
            if (response.length > 2000) {
                const chunks = response.match(/[\s\S]{1,2000}/g) || [];
                await interaction.editReply(chunks[0]);
                
                for (let i = 1; i < chunks.length; i++) {
                    await interaction.followUp(chunks[i]);
                }
            } else {
                await interaction.editReply(response);
            }

        } catch (error) {
            logger.error('Erreur dans la commande ask:', error);
            
            const errorMessage = 'Une erreur est survenue lors du traitement de votre question.';
            
            if (interaction.deferred) {
                await interaction.editReply(errorMessage);
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    },
};
