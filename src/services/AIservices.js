const axios = require('axios');
const { logger } = require('../utils');

/**
 * ============================================
 * SERVICE MAMMOUTH.AI (GROK)
 * ============================================
 * Gère les interactions avec l'API Mammouth.ai
 * et maintient l'historique des conversations
 */

class MammouthService {
    constructor() {
        this.apiKey = process.env.MAMMOUTH_API_KEY;
        this.apiUrl = 'https://api.mammouth.ai/v1/chat/completions';
        this.model = process.env.MAMMOUTH_MODEL || 'grok-beta';
        this.conversationHistory = new Map();
        
        logger.info('🤖 Service Mammouth.ai initialisé');
    }

    /**
     * Obtient une réponse de l'IA
     * @param {string} userId - ID de l'utilisateur Discord
     * @param {string} userMessage - Message de l'utilisateur
     * @param {Object} options - Options de configuration
     * @returns {Promise<string>} - Réponse de l'IA
     */
    async getResponse(userId, userMessage, options = {}) {
        try {
            if (!this.apiKey) {
                logger.error('❌ Clé API Mammouth.ai non configurée');
                return 'Configuration manquante pour Mammouth.ai';
            }

            logger.info(`💬 Requête de ${userId}: "${userMessage.substring(0, 50)}..."`);

            const messages = this._buildMessages(userId, userMessage, options);

            const response = await axios.post(
                this.apiUrl,
                {
                    model: this.model,
                    messages: messages,
                    max_tokens: options.maxTokens || 500,
                    temperature: options.temperature || 0.7,
                    stream: false
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            if (response.data?.choices?.[0]?.message?.content) {
                const aiResponse = response.data.choices[0].message.content;
                
                // Sauvegarder dans l'historique
                this._addToHistory(userId, 'user', userMessage);
                this._addToHistory(userId, 'assistant', aiResponse);
                
                logger.info(`✅ Réponse générée (${aiResponse.length} caractères)`);
                return aiResponse;
            } else {
                throw new Error('Réponse invalide de l\'API');
            }

        } catch (error) {
            logger.error('❌ Erreur Mammouth.ai:', error.message);
            
            if (error.response) {
                logger.error(`Status ${error.response.status}:`, error.response.data);
            }

            // Gestion des erreurs spécifiques
            if (error.response?.status === 401) {
                return '🔑 Erreur d\'authentification avec l\'API.';
            } else if (error.response?.status === 429) {
                return '⏱️ Trop de requêtes, réessaye dans quelques secondes.';
            } else if (error.code === 'ECONNABORTED') {
                return '⏱️ L\'IA met trop de temps à répondre, réessaye.';
            }

            return '❌ Une erreur s\'est produite. Réessaye plus tard.';
        }
    }

    /**
     * Construit le tableau de messages pour l'API
     * @private
     */
    _buildMessages(userId, userMessage, options) {
        const messages = [];

        // Prompt système personnalisé ou par défaut
        messages.push({
            role: 'system',
            content: options.systemPrompt || 'Tu es un assistant Discord utile et concis. Réponds en français.'
        });

        // Ajouter l'historique si demandé
        if (options.useHistory !== false) {
            const history = this.conversationHistory.get(userId) || [];
            messages.push(...history);
        }

        // Message actuel de l'utilisateur
        messages.push({
            role: 'user',
            content: userMessage
        });

        return messages;
    }

    /**
     * Ajoute un message à l'historique de conversation
     * @private
     */
    _addToHistory(userId, role, content) {
        if (!this.conversationHistory.has(userId)) {
            this.conversationHistory.set(userId, []);
        }

        const history = this.conversationHistory.get(userId);
        history.push({ role, content });

        // Limite à 10 messages (5 échanges)
        if (history.length > 10) {
            history.shift();
        }
    }

    /**
     * Efface l'historique d'un utilisateur
     * @param {string} userId - ID de l'utilisateur
     */
    clearHistory(userId) {
        this.conversationHistory.delete(userId);
        logger.info(`🗑️ Historique effacé pour l'utilisateur ${userId}`);
    }

    /**
     * Récupère la taille de l'historique d'un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @returns {number} - Nombre de messages en historique
     */
    getHistorySize(userId) {
        return (this.conversationHistory.get(userId) || []).length;
    }
}

module.exports = new MammouthService();
