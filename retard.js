function splitMessage(str, size = 2000) {
  const parts = [];
  for (let i = 0; i < str.length; i += size) {
    parts.push(str.slice(i, i + size));
  }
  return parts;
}

const { Client, GatewayIntentBits } = require('discord.js');
const Snoowrap = require('snoowrap');

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
  'memes',
  'dankmemes',
  'me_irl',
  'shitposting',
  'okbuddyretard',
  'FrenchMemes'
];

async function fetchRandomMemeImage() {
  const sub = subredditsMemes[Math.floor(Math.random() * subredditsMemes.length)];
  const posts = await reddit.getSubreddit(sub).getHot({ limit: 50 });
  // Prend TOUTES les images (NSFW inclus)
  const images = posts.filter(
    post =>
      post.url &&
      (post.url.endsWith('.jpg') || post.url.endsWith('.png') || post.url.endsWith('.jpeg') || post.url.endsWith('.gif'))
      // pas de filtre sur post.over_18
  );
  if (images.length === 0) return null;
  const random = images[Math.floor(Math.random() * images.length)];
  return {
    url: random.url,
    title: random.title,
    subreddit: sub
  };
}

// Event Discord
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // Copiepate classique
  if (message.content.toLowerCase().includes('copiepate')) {
    const copypasta = await fetchRandomCopiepate();
    const parts = splitMessage(copypasta);
    for (const part of parts) {
      await message.channel.send(part);
    }
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
  }
});

client.once('ready', () => {
  console.log('Le retardOmancien est en ligne !');
});

client.login(DISCORD_TOKEN);
