const { Client, GatewayIntentBits } = require('discord.js');
const Snoowrap = require('snoowrap');
const axios = require('axios');

function splitMessage(str, size = 2000) {
  const parts = [];
  for (let i = 0; i < str.length; i += size) {
    parts.push(str.slice(i, i + size));
  }
  return parts;
}

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const reddit = new Snoowrap({
  userAgent: 'retardOmancienBot/1.0 by a retard',
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Copiepate (texte, NSFW inclus)
async function fetchRandomCopiepate() {
  try {
    const posts = await reddit.getSubreddit('CopiePates').getHot({ limit: 50 });
    const validPosts = posts.filter(post =>
      post.selftext &&
      post.selftext.length > 30 &&
      !post.stickied
    );
    if (validPosts.length === 0) return "Rien trouvé sur r/CopiePates !";
    const random = validPosts[Math.floor(Math.random() * validPosts.length)];
    return random.selftext;
  } catch (err) {
    console.error("Erreur Reddit:", err);
    return "Erreur lors de la récupération sur Reddit.";
  }
}

// Meme image (NSFW inclus)
const subredditsMemes = [
  'Discordmemes',
  'shitposting',
  'okbuddyretard',
  'doodoofard',
  'MemeMan',
];

async function fetchRandomMemeImage() {
  const sub = subredditsMemes[Math.floor(Math.random() * subredditsMemes.length)];
  const posts = await reddit.getSubreddit(sub).getHot({ limit: 50 });
  const images = posts.filter(
    post =>
      post.url &&
      (post.url.endsWith('.jpg') || post.url.endsWith('.png') || post.url.endsWith('.jpeg') || post.url.endsWith('.gif'))
  );
  if (images.length === 0) return null;
  const random = images[Math.floor(Math.random() * images.length)];
  return {
    url: random.url,
    title: random.title,
    subreddit: sub
  };
}

// HuggingFace (Mistral 7B) "réponse racaille"
async function getRedditeur4chanXResponse(prompt) {
  const redditeurPrompt = `Peu importe la question, tu réponds toujours comme un mélange de Redditor sarcastique, shitposter de 4chan, troll Twitter, et tu balances une réponse drôle/meme, même si c'est une question nulle ou mathématique. Même pour "5+5", tu dois répondre. Voici la question : ${prompt}`;
  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
      { inputs: redditeurPrompt },
      {
        headers: {
          'Authorization': `Bearer ${process.env.HF_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000,
      }
    );
    let text = '';
    if (response.data && Array.isArray(response.data) && response.data[0]?.generated_text) {
      text = response.data[0].generated_text;
    } else if (response.data && response.data.generated_text) {
      text = response.data.generated_text;
    } else if (response.data && Array.isArray(response.data) && response.data[0]?.text) {
      text = response.data[0].text;
    }
    return text.trim().slice(0, 2000) || "pd";
  } catch (err) {
    console.error('Erreur HuggingFace:', err.message);
    return "API down, next meme please.";
  }
}

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // Copiepate classique
  if (message.content.toLowerCase().includes('copiepate')) {
    const copypasta = await fetchRandomCopiepate();
    const parts = splitMessage(copypasta);
    for (const part of parts) {
      await message.channel.send(part);
    }
    return;
  }

  // Invocation de meme
  if (message.content.toLowerCase().includes('invocation de meme')) {
    const meme = await fetchRandomMemeImage();
    if (!meme) {
      await message.channel.send("Aucun meme trouvé !");
    } else {
      await message.channel.send({
        embeds: [{
          title: meme.title,
          image: { url: meme.url },
          footer: { text: `r/${meme.subreddit}` }
        }]
      });
    }
    return;
  }

  if (message.mentions.has(client.user)) {
    const prompt = message.content.replace(`<@${client.user.id}>`, '').trim();
    if (prompt.length === 0) return;
    await message.channel.send("Hold my beer...");
    const shitpostResponse = await getRedditeur4chanXResponse(prompt);
    const parts = splitMessage(shitpostResponse);
    for (const part of parts) {
      await message.channel.send(part);
    }
  }
});

client.once('ready', () => {
  console.log('Le retardOmancien est en ligne !');
});

client.login(DISCORD_TOKEN);
