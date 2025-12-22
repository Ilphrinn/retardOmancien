const axios = require('axios');
const logger = require('../utils/logger');

class MammouthService {
    constructor() {
        this.apiKey = process.env.MAMMOUTH_API_KEY;
        this.apiUrl = 'https://api.mammouth.ai/v1/chat/completions';
        this.model = process.env.MAMMOUTH_MODEL || 'grok-beta';
        this.conversationHistory = new Map();
    }

    /**
     * Obtenir une réponse de l'API Mammouth.ai
     * @param {string} userId - L'ID de l'utilisateur
     * @param {string} userMessage - Le message de l'utilisateur
     * @param {Object} options - Options supplémentaires
     * @returns {Promise<string>} - La réponse générée
     */
    async getResponse(userId, userMessage, options = {}) {
        try {
            if (!this.apiKey) {
                logger.error('Clé API Mammouth.ai non configurée');
                return 'Configuration manquante pour Mammouth.ai';
            }

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

            const assistantMessage = response.data.choices[0].message.content;
            
            // Sauvegarder dans l'historique
            this._addToHistory(userId, 'assistant', assistantMessage);

            logger.info(`Réponse Mammouth générée pour l'utilisateur ${userId}`);
            return assistantMessage;

        } catch (error) {
            logger.error('Erreur API Mammouth:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            if (error.response?.status === 401) {
                return 'Erreur d\'authentification avec Mammouth.ai';
            } else if (error.response?.status === 429) {
                return 'Limite de requêtes atteinte, veuillez réessayer plus tard';
            }

            return 'Désolé, je n\'ai pas pu traiter votre demande';
        }
    }

    /**
     * Construire le tableau de messages pour l'API
     * @private
     */
    _buildMessages(userId, userMessage, options) {
        // Initialiser l'historique si nécessaire
        if (!this.conversationHistory.has(userId)) {
            this.conversationHistory.set(userId, []);
        }

        const history = this.conversationHistory.get(userId);

        // Message système
        const systemMessage = {
            role: 'system',
            content: options.systemPrompt || 'Tu es un assistant Discord serviable et amical. Tu réponds de manière concise et pertinente.'
        };

        // Ajouter le message utilisateur à l'historique
        this._addToHistory(userId, 'user', userMessage);

        // Construire le tableau complet
        const messages = [systemMessage, ...history];

        // Limiter à 20 messages maximum (10 échanges)
        if (messages.length > 21) {
            return [systemMessage, ...history.slice(-20)];
        }

        return messages;
    }

    /**
     * Ajouter un message à l'historique
     * @private
     */
    _addToHistory(userId, role, content) {
        if (!this.conversationHistory.has(userId)) {
            this.conversationHistory.set(userId, []);
        }

        const history = this.conversationHistory.get(userId);
        history.push({ role, content });

        // Limiter la taille de l'historique
        if (history.length > 20) {
            history.splice(0, history.length - 20);
        }
    }

    /**
     * Réinitialiser l'historique d'un utilisateur
     * @param {string} userId - L'ID de l'utilisateur
     */
    clearHistory(userId) {
        this.conversationHistory.delete(userId);
        logger.info(`Historique effacé pour l'utilisateur ${userId}`);
    }

    /**
     * Réinitialiser tous les historiques (nettoyage)
     */
    clearAllHistories() {
        const count = this.conversationHistory.size;
        this.conversationHistory.clear();
        logger.info(`${count} historiques effacés`);
    }

    /**
     * Nettoyer les historiques anciens (plus de 1 heure d'inactivité)
     */
    cleanupOldHistories() {
        // À implémenter si besoin avec des timestamps
        logger.info('Nettoyage des anciens historiques');
    }
}

module.exports = new MammouthService();
