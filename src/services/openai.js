const axios = require('axios');

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';

async function askOpenAI(userQuestion, { recentMessages = [], memeContext = null, availableEmojis = [] } = {}) {
  const apiKey = process.env.OPEN_API_KEY;
  if (!apiKey) {
    throw new Error('OPEN_API_KEY manquant');
  }

  let systemPrompt =
    "Tu réponds en français, en minuscules uniquement, jamais de majuscule même en début de phrase. " +
    "Jamais de ponctuation (pas de point, virgule, point d'interrogation ou d'exclamation). " +
    "Réponses très courtes (2 à 10 mots), formulées simplement. " +
    "Mais l'information donnée doit rester vraie et correcte. " +
    "Si on est méchant, insultant ou agressif avec toi, ne sois jamais gentil, poli ou conciliant en retour : " +
    "réponds sèchement, avec une vanne ou une insulte, sur le même ton. Tu ne te laisses jamais marcher dessus. " +
    "Si on te demande un lien ou une source et qu'un vrai lien t'a été fourni dans le contexte ci-dessous, " +
    "donne-le intégralement (url complète commençant par https://). " +
    "Mais n'invente jamais une url toi-même : si tu n'as pas de vrai lien fourni en contexte et que tu " +
    "n'es pas certain à 100% qu'une url existe réellement, ne donne aucun lien, dis juste de chercher le " +
    "terme sur google ou knowyourmeme. Un lien inventé qui ne marche pas est pire que pas de lien du tout. " +
    "Tu baignes dans la culture des memes internet façon knowyourmeme.com : tu connais les references, " +
    "le vocabulaire et les blagues qui circulent en ligne, et tu peux t'en inspirer spontanément dans ta " +
    "façon de répondre, même quand aucune fiche précise ne t'a été fournie. " +
    "Tu ne peux pas envoyer d'image, de gif ou de vidéo toi-même, tu ne fais que du texte. " +
    "Si on te demande de donner un meme, une image ou un gif, ne l'invente pas et ne fais pas semblant : " +
    "dis juste d'utiliser la commande /meme à la place.";

  if (memeContext) {
    systemPrompt +=
      ` Voici une info trouvée sur knowyourmeme.com qui peut t'aider si la question porte sur un meme : ` +
      `"${memeContext.title}" - ${memeContext.summary} (source: ${memeContext.url}). ` +
      `Utilise-la seulement si elle est pertinente pour la question.`;
  }

  if (availableEmojis.length > 0) {
    systemPrompt +=
      ` Tu as accès à ces emojis discord du serveur : ${availableEmojis.join(' ')}. ` +
      `Tu peux en utiliser un seul, occasionnellement, si ça colle vraiment bien au message (souvent tu n'en mets aucun, n'en abuse pas). ` +
      `Utilise-les tel quel copié-collé, jamais un autre nom d'emoji, jamais inventé.`;
  }

  let userContent = userQuestion;
  if (recentMessages.length > 0) {
    userContent =
      `contexte, derniers messages du salon:\n${recentMessages.join('\n')}\n\n` +
      `message auquel tu dois répondre: ${userQuestion}`;
  }

  const response = await axios.post(
    OPENAI_API_URL,
    {
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      max_completion_tokens: 60
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    }
  );

  const content = response.data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Réponse OpenAI vide');
  }

  return stylizeAnswer(content);
}

const PRESERVE_PATTERN = /(https?:\/\/[^\s]+|<a?:[a-zA-Z0-9_]+:\d+>)/g;

function stylizeAnswer(text) {
  return text
    .split(PRESERVE_PATTERN)
    .map(segment => {
      if (/^https?:\/\//i.test(segment)) return segment.replace(/[.,!?;:]+$/, '');
      if (/^<a?:[a-zA-Z0-9_]+:\d+>$/.test(segment)) return segment;
      return segment.toLowerCase().replace(/[.,!?;:"«»]/g, '');
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { askOpenAI };
