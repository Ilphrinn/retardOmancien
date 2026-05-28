const axios = require('axios');

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

async function askOpenAI(userQuestion) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY manquant');
  }

  const response = await axios.post(
    OPENAI_API_URL,
    {
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content:
            "Tu réponds en français. Réponses ultra courtes (2 à 12 mots), style cru, sec, direct. Pas de pavé."
        },
        {
          role: 'user',
          content: userQuestion
        }
      ],
      max_tokens: 40,
      temperature: 0.8
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 20000
    }
  );

  const content = response.data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Réponse OpenAI vide');
  }

  return content;
}

module.exports = { askOpenAI };
