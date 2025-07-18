// https://discord.com/oauth2/authorize?client_id=1395669262986907648&scope=bot&permissions=68608

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

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Fonction qui prend un post random de r/CopiePates
async function fetchRandomCopiepate() {
  try {
    const posts = await reddit.getSubreddit('CopiePates').getHot({ limit: 50 });
    const validPosts = posts.filter(post =>
      post.selftext &&
      post.selftext.length > 30 && // Filtre les trop courts
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

// Quand le bot reçoit une commande dans un salon
client.on('messageCreate', async message => {
  if (message.author.bot) return; // Ignore les autres bots

  console.log(`Salon: ${message.channel.name} - Message: ${message.content}`); // <-- Ajoute cette ligne

  if (message.content.toLowerCase().includes('copiepate')) {
    const copypasta = await fetchRandomCopiepate();
    message.channel.send(copypasta);
  }
});

client.once('ready', () => {
  console.log('Le retardOmancien est en ligne !');
});

client.login(DISCORD_TOKEN);
