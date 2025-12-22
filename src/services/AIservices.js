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
                console.error('❌ Clé API Mammouth.ai non configurée');
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
                
                console.log(`✅ Réponse générée pour ${userId}`);
                return aiResponse;
            } else {
                throw new Error('Réponse invalide de l\'API');
            }

        } catch (error) {
            console.error('❌ Erreur Mammouth.ai:', error.message);
            
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
            }

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

    _buildMessages(userId, userMessage, options) {
        const messages = [];

        // Système prompt
        if (options.systemPrompt) {
            messages.push({
                role: 'system',
                content: options.systemPrompt
            });
        }

        // Historique de conversation
        if (options.useHistory !== false) {
            const history = this.conversationHistory.get(userId) || [];
            messages.push(...history);
        }

        // Message actuel
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

        // Limite à 10 derniers messages
        if (history.length > 10) {
            history.shift();
        }
    }

    clearHistory(userId) {
        this.conversationHistory.delete(userId);
        console.log(`🗑️ Historique effacé pour ${userId}`);
    }

    getHistorySize(userId) {
        return (this.conversationHistory.get(userId) || []).length;
    }
}

module.exports = new MammouthService();
