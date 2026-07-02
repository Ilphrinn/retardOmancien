const axios = require('axios');

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';

async function askOpenAI(userQuestion) {
  const apiKey = process.env.OPEN_API_KEY;
  if (!apiKey) {
    throw new Error('OPEN_API_KEY manquant');
  }

  const response = await axios.post(
    OPENAI_API_URL,
    {
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content:
            "Tu réponds en français, en minuscules uniquement, jamais de majuscule même en début de phrase. " +
            "Jamais de ponctuation (pas de point, virgule, point d'interrogation ou d'exclamation). " +
            "Réponses très courtes (2 à 10 mots), formulées simplement, comme si tu étais un peu simplet ou naïf. " +
            "Mais l'information donnée doit rester vraie et correcte, juste dite bêtement. " +
            "Si on est méchant, insultant ou agressif avec toi, ne sois jamais gentil, poli ou conciliant en retour : " +
            "réponds sèchement, avec une vanne ou une insulte, sur le même ton. Tu ne te laisses jamais marcher dessus. " +
            "Si on te demande un lien, une source, un site ou un outil, donne toujours une vraie url complète " +
            "(commençant par https://), jamais un nom vague sans lien."
        },
        {
          role: 'user',
          content: userQuestion
        }
      ],
      max_completion_tokens: 60
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

  return stylizeAnswer(content);
}

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

function stylizeAnswer(text) {
  return text
    .split(URL_PATTERN)
    .map(segment =>
      /^https?:\/\//i.test(segment)
        ? segment.replace(/[.,!?;:]+$/, '')
        : segment.toLowerCase().replace(/[.,!?;:"«»]/g, '')
    )
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { askOpenAI };
