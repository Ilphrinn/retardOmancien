const axios = require('axios');

class MammouthService {
    constructor() {
        this.apiKey = process.env.MAMMOUTH_API_KEY;
        this.apiUrl = 'https://api.mammouth.ai/v1/chat/completions';
        this.model = process.env.MAMMOUTH_MODEL || 'grok-beta';
        this.conversationHistory = new Map();
    }

    async getResponse(userId, userMessage, options = {}) {
        try {
            if (!this.apiKey) {
                console.error('[ERROR] Clé API Mammouth.ai non configurée');
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

            if (response.data?.choices?.[0]?.message?.content) {
                const aiResponse = response.data.choices[0].message.content;
                this._addToHistory(userId, 'user', userMessage);
                this._addToHistory(userId, 'assistant', aiResponse);
                
                console.log(`[INFO] Réponse Mammouth générée pour l'utilisateur ${userId}`);
                return aiResponse;
            } else {
                throw new Error('Réponse invalide de l\'API Mammouth.ai');
            }

        } catch (error) {
            console.error('[ERROR] Erreur Mammouth.ai:', error.message);
            
            if (error.response) {
                console.error('[ERROR] Status:', error.response.status);
                console.error('[ERROR] Data:', error.response.data);
            }

            if (error.response?.status === 401) {
                return '🔑 Erreur d\'authentification avec l\'API. Vérifie la clé API.';
            } else if (error.response?.status === 429) {
                return '⏳ Trop de requêtes. Réessaye dans quelques instants.';
            } else if (error.code === 'ECONNABORTED') {
                return '⏱️ La requête a pris trop de temps. Réessaye.';
            }
            
            return '❌ Impossible d\'obtenir une réponse pour le moment.';
        }
    }

    _buildMessages(userId, userMessage, options) {
        const messages = [];
        
        if (options.systemPrompt) {
            messages.push({
                role: 'system',
                content: options.systemPrompt
            });
        }

        const history = this.conversationHistory.get(userId) || [];
        messages.push(...history);
        
        messages.push({
            role: 'user',
            content: userMessage
        });

        return messages;
    }

    _addToHistory(userId, role, content) {
        if (!this.conversationHistory.has(userId)) {
            this.conversationHistory.set(userId, []);
        }
        
        const history = this.conversationHistory.get(userId);
        history.push({ role, content });
        
        const maxHistoryLength = 20;
        if (history.length > maxHistoryLength) {
            this.conversationHistory.set(userId, history.slice(-maxHistoryLength));
        }
    }

    clearHistory(userId) {
        this.conversationHistory.delete(userId);
        console.log(`[INFO] Historique effacé pour l'utilisateur ${userId}`);
    }

    clearAllHistory() {
        this.conversationHistory.clear();
        console.log('[INFO] Tous les historiques ont été effacés');
    }
}

module.exports = new MammouthService();
