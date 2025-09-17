const { OpenAI } = require('openai');

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const MAX_OUTPUT_TOKENS = (() => {
  const value = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 500;
})();

const MODELS_TO_TRY = (() => {
  const candidates = [
    process.env.OPENAI_MODEL,
    process.env.OPENAI_FALLBACK_MODEL,
    'gpt-5',
    'gpt-4',
  ]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);

  return [...new Set(candidates)];
})();

const SUPPORTED_ROLES = new Set(['system', 'developer', 'user', 'assistant']);

function coerceToText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map(coerceToText).filter(Boolean).join('\n');
  }
  if (typeof value === 'object' && typeof value.content === 'string') {
    return value.content;
  }

  try {
    return JSON.stringify(value);
  } catch (err) {
    return String(value);
  }
}

function buildMessage(role, content) {
  if (!role) return null;

  const normalisedRole = String(role).toLowerCase();
  const allowedRole = SUPPORTED_ROLES.has(normalisedRole) ? normalisedRole : 'user';
  const text = coerceToText(content);

  if (!text || !text.trim()) {
    return null;
  }

  return {
    role: allowedRole,
    content: text,
    type: 'message',
  };
}

function buildConversation(systemPrompt, chatMessages = []) {
  const conversation = [];

  const systemMessage = buildMessage('system', systemPrompt);
  if (systemMessage) {
    conversation.push(systemMessage);
  }

  for (const message of chatMessages) {
    if (!message || typeof message !== 'object') continue;

    const nextMessage = buildMessage(message.role ?? 'user', message.content ?? '');
    if (nextMessage) {
      conversation.push(nextMessage);
    }
  }

  const finalMessage = buildMessage('user', 'Quelqu’un t’a ping : réponds');
  if (finalMessage) {
    conversation.push(finalMessage);
  }

  return conversation;
}

function extractResponseText(response) {
  if (!response || typeof response !== 'object') {
    return '';
  }

  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text;
  }

  if (Array.isArray(response.output)) {
    const parts = [];

    for (const item of response.output) {
      if (!item || item.type !== 'message' || !Array.isArray(item.content)) continue;

      for (const part of item.content) {
        if (part && part.type === 'output_text' && typeof part.text === 'string') {
          parts.push(part.text);
        }
      }
    }

    if (parts.length > 0) {
      return parts.join('').trim();
    }
  }

  return '';
}

async function requestCompletion(model, conversation) {
  if (!openai) {
    throw new Error('OpenAI client not configured. Missing OPENAI_API_KEY.');
  }

  const response = await openai.responses.create({
    model,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    input: conversation,
  });

  return extractResponseText(response);
}

async function GPTResponse(systemPrompt, chatMessages) {
  const conversation = buildConversation(systemPrompt, chatMessages);

  let lastError = null;
  let fallbackText = '';

  for (const model of MODELS_TO_TRY) {
    try {
      const text = await requestCompletion(model, conversation);
      if (text && text.trim()) {
        return text.trim();
      }

      fallbackText = fallbackText || text;
    } catch (error) {
      if (error && typeof error === 'object' && !error.model) {
        error.model = model;
      }
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return fallbackText.trim();
}

module.exports = { GPTResponse };
