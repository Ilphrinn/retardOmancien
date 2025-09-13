const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function GPTResponse(systemPrompt, chatMessages) {
  const resp = await openai.chat.completions.create({
    model: "gpt-5",
    max_completion_tokens: 500,
    messages: [
      { role: "system", content: systemPrompt },
      ...chatMessages,
      { role: "user", content: "Quelqu’un t’a ping : réponds" },
    ],
  });
  return resp.choices[0]?.message?.content ?? "";
}

module.exports = { GPTResponse };
