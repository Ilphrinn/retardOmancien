// Import des dépendances principales
const { Client, GatewayIntentBits } = require('discord.js');
const Snoowrap = require('snoowrap');
const { OpenAI } = require('openai');
const puppeteer = require('puppeteer');
const axios = require('axios');
const path = require('path');

// Durée de vie du cache (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Coupe une chaîne en morceaux de taille maximale ``size``.
 * Permet d’envoyer des messages trop longs pour Discord.
 */
function splitMessage(str, size = 2000) {
  const parts = [];
  for (let i = 0; i < str.length; i += size) {
    parts.push(str.slice(i, i + size));
  }
  return parts;
}

/**
 * Renvoie un élément aléatoire d’un tableau.
 * @param {Array} arr Tableau source
 * @returns {*} élément aléatoire
 */
const randomItem = arr => arr[Math.floor(Math.random() * arr.length)];

async function acknowledge(interaction) {
  await interaction.deferReply({ ephemeral: true });
  await interaction.deleteReply();
}

const { DISCORD_TOKEN } = process.env;

const reddit = new Snoowrap({
  userAgent: 'RaccoonFetcher/1.0 by Ilphrinn',
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

// Expressions qui provoquent une réponse automatique
const triggerSet = new Set([
  "ta gueule", "toi ta gueule", "nan toi ta gueule", "non toi ta gueule",
  "toi tg", "nan toi tg", "non toi tg", "vos gueules", "vos gueule",
  "tg", "ftg", "ferme ta gueule"
]);

// Constantes réutilisées pour les appels à l’API Reddit
const TOP_TIMES = ['day', 'week', 'month', 'year', 'all'];
const MEME_METHODS = ['hot', 'new', 'rising', 'top'];

// GPT Integration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Interroge l’API d’OpenAI et renvoie la réponse du modèle
async function GPTResponse(systemPrompt, chatMessages) {
  const response = await openai.chat.completions.create({
    model: "gpt-4", // ou "gpt-3.5-turbo" si budget limité
    temperature: 0.9,
    max_tokens: 500,
    messages: [
      { role: "system", content: systemPrompt },
      ...chatMessages,
      {
        role: "user",
        content: "Quelqu’un t’a ping : réponds",
      },
    ],
  });

  return response.choices[0].message.content.trim();
}

// Copiepate (texte, NSFW inclus)
// Historique des copiepastes déjà envoyées
const sentCopiepates = new Set();
const MAX_COPIE_HISTORY = 200;
const copiepateCache = {};

/**
 * Récupère une copiepaste aléatoire depuis r/CopiePates.
 * Les résultats sont mis en cache pour limiter les appels à l’API.
 */
async function fetchRandomCopiepate() {
  const now = Date.now();
  const cacheKey = 'CopiePates-multiTop';
  const isCached =
    copiepateCache[cacheKey] &&
    now - copiepateCache[cacheKey].timestamp < CACHE_TTL;

  let posts;
  if (isCached) {
    posts = copiepateCache[cacheKey].posts;
  } else {
    const limit = 100;
    const all = await Promise.all(
      TOP_TIMES.map(time =>
        reddit.getSubreddit('CopiePates').getTop({ time, limit }).catch(() => [])
      )
    );

    // Évite les doublons en utilisant l’id du post comme clé
    posts = Array.from(new Map(all.flat().map(p => [p.id, p])).values());

    copiepateCache[cacheKey] = { timestamp: now, posts };
  }

  const MAX_CHARS = 2000;
  const MAX_LINES = 30;

  const validPosts = posts.filter(post => {
    const text = post.selftext;
    if (!text || text.length <= 30 || text.length > MAX_CHARS) return false;
    if (text.split('\n').length > MAX_LINES) return false;
    return !post.stickied && !sentCopiepates.has(text);
  });

  if (validPosts.length === 0) {
    return 'https://tenor.com/view/kirby-i-forgot-i-forgor-gif-22449575';
  }

  const random = randomItem(validPosts);

  // Historise les copiepastes envoyées pour éviter les répétitions
  sentCopiepates.add(random.selftext);
  if (sentCopiepates.size > MAX_COPIE_HISTORY) {
    const arr = Array.from(sentCopiepates);
    sentCopiepates.clear();
    arr.slice(-MAX_COPIE_HISTORY).forEach(text => sentCopiepates.add(text));
  }

  return random.selftext;
}

// Meme image ou vidéo (NSFW inclus)
// Subreddits utilisés pour la recherche de memes
const subredditsMemes = [
  'Discordmemes',
  'shitposting',
  'okbuddyretard',
  'doodoofard',
  'DeepFriedMeme',
  'greentext',
  'MemeMan',
];

// Historique des memes déjà envoyés
const sentMemes = new Set();
const MAX_HISTORY = 200;
const subredditCache = {};

/**
 * Récupère un meme aléatoire (image ou vidéo) parmi plusieurs subreddits.
 * Utilise un cache local pour limiter les requêtes Reddit.
 */
async function fetchRandomMeme() {
  const sub = randomItem(subredditsMemes);
  const now = Date.now();

  const chosenMethod = randomItem(MEME_METHODS);
  const time = randomItem(TOP_TIMES);

  const cacheKey = `${sub}-${chosenMethod}-${time}`;
  const isCached =
    subredditCache[cacheKey] &&
    now - subredditCache[cacheKey].timestamp < CACHE_TTL;

  let posts;
  if (isCached) {
    posts = subredditCache[cacheKey].posts;
  } else {
    const limit = chosenMethod === 'top' ? 100 : 50;
    const subreddit = reddit.getSubreddit(sub);
    posts =
      chosenMethod === 'top'
        ? await subreddit.getTop({ time, limit })
        : await subreddit[`get${capitalize(chosenMethod)}`]({ limit });

    subredditCache[cacheKey] = { timestamp: now, posts };
  }

  // Sélection aléatoire dans la liste
  const offsetStep = 10;
  const offset = Math.floor(Math.random() * Math.max(1, posts.length / offsetStep)) * offsetStep;
  const slice = posts.slice(offset, offset + offsetStep);

  const medias = slice
    .map(post => {
      const url = post.url || '';
      if (post.is_video && post.media?.reddit_video?.fallback_url) {
        return {
          type: 'video',
          url: post.media.reddit_video.fallback_url,
          title: post.title,
          subreddit: sub,
        };
      }
      if (/\.gifv$/.test(url)) {
        return {
          type: 'video',
          url: url.replace(/\.gifv$/, '.mp4'),
          title: post.title,
          subreddit: sub,
        };
      }
      if (/\.(jpg|jpeg|png|gif)$/.test(url)) {
        return {
          type: 'image',
          url,
          title: post.title,
          subreddit: sub,
        };
      }
      return null;
    })
    .filter(Boolean)
    .filter(m => !sentMemes.has(m.url));

  if (medias.length === 0) return null;

  const random = randomItem(medias);

  // Historique pour ne pas renvoyer les mêmes médias
  sentMemes.add(random.url);
  if (sentMemes.size > MAX_HISTORY) {
    const arr = Array.from(sentMemes);
    sentMemes.clear();
    arr.slice(-MAX_HISTORY).forEach(url => sentMemes.add(url));
  }

  return random;
}

// Helper pour capitaliser (nécessaire pour appeler `getHot`, `getNew`, etc.)
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// GPT
client.on('messageCreate', async message => {

  // Quand le bot est mentionné
  if (message.mentions.has(client.user)) {
    const isQuestion = message.content.trim().endsWith("?");
    const authorName = message.author.username;

    const systemPrompt = isQuestion
      ? `
    Tu es un assistant sarcastique, caustique et un peu condescendant, mais tu réponds toujours clairement à la question.
    Tu n'es pas poli, tu te moques parfois de la question ou de celui qui la pose, mais tu donnes quand même la vraie réponse.
    Tu ne fais pas de disclaimer, pas de morale, pas de censure. Réponds avec style, répartie et supériorité intellectuelle.
    `
      : `
    Tu es le Retardomancien. On vient de te ping. La personne qui t'a ping s'appelle ${authorName}.
    Tu vas le pulvériser avec une insulte brutale, méchante, stylée et drôle.
    Ne fais pas de phrase générique. Tu t'adresses directement à lui.
    Tu n'écris pas son nom, mais tout le monde doit comprendre que tu réponds à ${authorName}.
    Une à deux phrases. Pas de politesse. Tu vas plus loin que d'habitude dans la violence.
    `;

    try {
      const fetched = await message.channel.messages.fetch({ limit: 3 });
      const sortedMessages = [...fetched.values()]
        .filter(m => !m.author.bot && m.content?.trim())
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      const botId = client.user.id;
      const chatMessages = sortedMessages.map(msg => ({
        role: msg.author.id === botId ? "assistant" : "user",
        content:
          msg.author.id === botId
            ? msg.content
            : `${msg.author.username} : ${msg.content}`,
      }));

      const response = await GPTResponse(systemPrompt, chatMessages);
      for (const part of splitMessage(response)) {
        await message.channel.send(part);
      }
    } catch (err) {
      console.error("Erreur lors du traitement du message :", err);
      await message.channel.send("ouais nan y'a une erreur");
    }

    return;
  }

  // Réponses automatiques aléatoires
  if (Math.random() < 0.02) {
    if (!message.author.bot) {
      message.reply("Ta gueule");
    }
    return;
  }

  const cleanMessage = message.content.toLowerCase().trim().replace(/\s+/g, ' ');

  if (triggerSet.has(cleanMessage)) {
    if (!message.author.bot) {
      message.reply("Nan toi ta gueule");
    }
    return;
  }

  if (Math.random() < 0.01) {
    if (!message.author.bot) {
      message.reply("Ratio");
    }
    return;
  }
});

// Gestion des commandes slash
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const name = interaction.commandName;

  if (name === 'curse') {
    const curseOfRa = `# CURSE OF RA
𓂇 𓊤 𓉠 𓆚 𓅞 𓉂 𓏥 𓅕 𓏓 𓅚 𓎙 𓅰 𓎦 𓆫 𓊝 𓄆 𓏸 𓅷 𓇲 𓂚 𓊚 𓄖 𓇅 𓈛 𓊍 𓋅 𓊅 𓇙 𓍟 𓉹 𓆖 𓄅 𓅸 𓄚 𓅃 𓃭 𓈒 𓇚 𓍪 𓄐 𓃗 𓏭 𓏑 𓀾 𓏞 𓍳 𓎫 𓏦 𓆷 𓆳 𓎝 𓅉 𓏍 𓈰 𓇋 𓃓 𓅀 𓏙 𓄬 𓊆 𓎙 𓀴 𓈴 𓀈 𓏗 𓂙 𓊻 𓉬 𓅑 𓏩 𓎏 𓈅 𓆇 𓂳 𓀀 𓆏 𓊶 𓊓 𓏞 𓄊 𓄣 𓈵 𓅪 𓂍 𓋩 𓋏 𓉎 𓋻 𓍦 𓎙 𓄺 𓅵 𓅲 𓏚 𓉚 𓅹 𓀡 𓏚 𓂛 𓏪 𓄥 𓉄 𓏤 𓊪 𓂧 𓏪 𓄴 𓏀 𓇔 𓅱 𓅔 𓅮 𓉷 𓀥 𓆪 𓋯 𓏩 𓈚 𓈕 𓅺 𓍶 𓎧 𓄻 𓇫 𓉦 𓉔 𓂢 𓏕 𓅏 𓉦 𓎶 𓉃 𓆇 𓅼 𓆅 𓊑 𓆩 𓅍 𓃹 𓆔 𓈠 𓄽 𓄊 𓆩 𓊩 𓏼 𓆏 𓂑 𓉭 𓋛 𓅫 𓊓 𓏑 𓍈 𓊩 𓊋 𓏁 𓂋 𓇏 𓋎 𓈆 𓋙 𓂸 𓈙 𓇀 𓊢 𓏦 𓋕 𓆢 𓆟 𓎃 𓎟 𓋋 𓅙 𓎎 𓎄 𓋅 𓆛 𓈍 𓅧 𓊗 𓉫 𓎀 𓂃 𓏘 𓅡 𓃉 𓉤 𓅶 𓄕 𓏝 𓃾 𓉬 𓀄 𓏷 𓋹 𓏵 𓋡 𓃒 𓄷 𓅮 𓋜 𓆃 𓊋 𓀹 𓉆 𓇞 𓇄 𓊨 𓀇 𓃳 𓃹 𓋞 𓎩 𓄠 𓇍 𓆼 𓍡 𓍠 𓏏 𓇉 𓎣 𓄭 𓊆 𓂣 𓊁 𓎣 𓄟 𓆾 𓉟 𓋰 𓂤 𓍰 𓂣 𓏞 𓅻 𓊏 𓈷 𓂽 𓉮 𓏅 𓉡 𓈡 𓋇 𓅥 𓂦 𓂒 𓆅 𓉓 𓄗 𓃉 𓍥 𓅾 𓋲 𓏴 𓃅 𓏯 𓎖 𓀬 𓉽 𓊾 𓃰 𓅻 𓄦 𓈃 𓉶 𓀘 𓏴 𓍫 𓇵 𓅰 𓄱 𓋦 𓅗 𓋵 𓀠 𓈤 𓂽 𓏣 𓄧 𓏏 𓃛 𓆩 𓄀 𓅘 𓋉 𓆄 𓎤 𓏕 𓅆 𓀋 𓃚 𓂵 𓅛 𓊁 𓊬 𓋽 𓄁 𓏏 𓏞 𓍤 𓏴 𓊭 𓀲 𓉛 𓀌 𓈶 𓎎 𓋠 𓄑 𓍑 𓅍 𓀕 𓅻 𓀺 𓊺 𓇑 𓉏 𓎧 𓉉 𓄟 𓇟 𓀙 𓇁 𓊕 𓆴 𓀅 𓊀 𓃳 𓄩 𓋯 𓀐 𓊇 𓎟 𓏎 𓇵 𓇐 𓈦 𓊄 𓀏 𓎗 𓇓 𓂛 𓏰 𓄸 𓉚 𓂞 𓀉 𓉦 𓅾 𓄣 𓏬 𓉳 𓀳 𓇟 𓊳 𓉙 𓈺 𓀣 𓀟 𓆟 𓆑 𓉨 𓉱 𓃱 𓂰 𓄫 𓋤 𓀔 𓅾 𓇏 𓀆 𓎚 𓀽 𓎠 𓇝 𓆉 𓄣 𓉅 𓏌 𓍬 𓏙 𓉞 𓊩 𓉻 𓊡 𓍢 𓋫 𓄟 𓋁 𓄑 𓏒 𓈈 𓊻 𓏋 𓀞 𓀚 𓏈 𓄑 𓇉 𓄱 𓆻 𓄩 𓋺 𓊙 𓏁 𓀛 𓋎 𓄟 𓋰 𓎼 𓋴 𓅍 𓋢 𓊺 𓉵 𓉗 𓃧 𓃯 𓏏 𓆰 𓏔 𓍊 𓏃 𓅩 𓆘 𓂬 𓅇 𓊖 𓅽 𓋇 𓃺 𓇠 𓍧 𓀒 𓆛 𓏉 𓊩 𓋋 𓀷 𓆲 𓄓 𓅜 𓉸 𓏨 𓆥 𓋪 𓊖 𓄲 𓇂 𓄺 𓋮 𓉲 𓋄 𓎮 𓏙 𓋓 𓊼 𓅵 𓋋 𓀁 𓀈 𓈗 𓏄 𓃜 𓉜 𓏽 𓏸 𓋺 𓂄 𓆤 𓅅 𓆴 𓀡 𓊜 𓂳 𓆦 𓋓 𓍩 𓏴 𓄍 𓂝 𓅳 𓄩 𓏛 𓅆 𓏵 𓅦 𓄙 𓄭 𓉎 𓂠 𓅡 𓂋 𓏄 𓉚 𓀡 𓅃 𓇱 𓍆 𓆈 𓋄 𓏚 𓃟 𓋚 𓄗 𓄳 𓉵 𓏒 𓏹 𓃷 𓋇 𓆬 𓋶 𓀇 𓀋 𓀠 𓆰 𓆧 𓍞 𓅰 𓀗 𓏲 𓀏 𓊠 𓅉 𓀮 𓅷 𓅩 𓉢 𓅅 𓆅 𓄡 𓉬 𓊛 𓆀 𓊠 𓆀 𓅶 𓏳 𓏲 𓄔 𓆑 𓀧 𓀼 𓏑 𓄇 𓉀 𓉗 𓄑 𓉎 𓅏 𓉘 𓀻 𓇩 𓀩 𓂁 𓊷 𓀆 𓉄 𓆴 𓉦 𓍏 𓀦 𓏯 𓄚 𓀺 𓄦 𓊨 𓆟 𓄏 𓄷 𓊁 𓆄 𓆏 𓅉 𓆤 𓈖 𓀚 𓇘 𓊋 𓆻 𓀝 𓊆 𓈉 𓅙 𓏸 𓂷 𓀭 𓋻 𓍷 𓄏 𓋠 𓏠 𓏡 𓂺 𓇎 𓇐 𓏅 𓇁 𓈅 𓏨 𓊫 𓇖 𓏲 𓏕 𓈪 𓀗 𓏔 𓊈 𓊴 𓏫 𓋩 𓀻 𓋝 𓏮 𓈧 𓊨 𓀍 𓇑 𓊰 𓅃 𓃡 𓅾 𓀅 𓍗 𓋶 𓀢 𓍸 𓅵 𓄮 𓂆 𓏹 𓊵 𓆳 𓆻 𓀄 𓀄 𓀙 𓃨 𓀾 𓈞 𓏻 𓄳 𓂵 𓄹 𓀞 𓍲 𓀨 𓀻 𓊱 𓂊 𓏍 𓄆 𓀍 𓆤 𓊱 𓂢 𓀪 𓈴 𓉯 𓅢 𓆺 𓃎 𓍙 𓄒 𓋂 𓅑 𓇓 𓂞 𓄩 𓆬 𓇭 𓏗 𓀵 𓆧 𓊂 𓏮 𓀱 𓄁 𓄬 𓂃 𓆄 𓊼 𓉭 𓉏 𓋀 𓆼 𓉈 𓍀 𓍔 𓀟 𓀨 𓀤 𓏗 𓋢 𓆸 𓅎 𓈩 𓉐 𓀽 𓍿 𓆜 𓋇 𓀳 𓊶 𓅧 𓃝 𓂺 𓂕 𓏤 𓏟 𓆓 𓍖 𓄢 𓃔 𓀚 𓀇 𓊣 𓆗 𓏡 𓇼 𓆘 𓀦 𓍺 𓊷 𓄒 𓉷 𓆫 𓋟 𓄣 𓇺 𓄕 𓏛 𓀉 𓃮 𓃦 𓏠 𓅨 𓅣 𓅸 𓀏 𓏆 𓃙 𓍕 𓍝 𓄦 𓇗 𓅲 𓂎 𓃳 𓋌 𓏔 𓂆 𓏶 𓊉 𓃅 𓍇 𓋸 𓍍 𓃦 𓏨 𓏟 𓂳 𓅛 𓈬 𓏴 𓂠 𓊁 𓋚 𓄪 𓉀 𓈏 𓏽 𓇻 𓋼 𓄟 𓋗 𓂥 𓏻 𓅠 𓆹 𓀚 𓄣 𓊾 𓈍 𓋆 𓅛 𓄗 𓄤 𓃱 𓈸 𓋄 𓄢 𓀙 𓉚 𓄰 𓏒 𓀉 𓀳 𓉚 𓄓 𓅲 𓋷 𓊆 𓋫 𓀻 𓆉 𓆾 `
    await acknowledge(interaction);
    await interaction.channel.send(curseOfRa);
  }

  else if (name === 'copiepate') {
    const copypasta = await fetchRandomCopiepate();
    const parts = splitMessage(copypasta);
    await acknowledge(interaction);
    for (const part of parts) {
      await interaction.channel.send(part);
    }
  }

  else if (name === 'insulte') {
    const targetUser = interaction.options.getUser('utilisateur');

    const isBotTargeted = targetUser.id === client.user.id;
    const trueTarget = isBotTargeted ? interaction.user : targetUser;

    const systemPrompt = isBotTargeted
      ? `Quelqu’un a osé utiliser la commande /insulte contre toi. Mais t’es le Retardomancien. Tu vas venger ton honneur en insultant ${trueTarget.username} encore plus fort que d’habitude.
Écris une insulte impitoyable, brutale, méchante, salée, drôle et humiliante. Tu peux aller plus loin que d’habitude. Une ou deux phrases max. Pas de nom dans le texte, juste du carnage.
Dis bien a ce batard de pas te ping`
      : `Quelqu’un a osé utiliser la commande /insulte. Mais t’es le Retardomancien. Tu vas venger ton honneur en insultant ${trueTarget.username} encore plus fort que d’habitude.
Écris une insulte impitoyable, brutale, méchante, salée, drôle et humiliante. Tu peux aller plus loin que d’habitude. Une ou deux phrases max. Pas de nom dans le texte, juste du carnage.
Dis bien a ce batard`;

    const chatMessages = [
      {
        role: "user",
        content: isBotTargeted
          ? "Insulte l’auteur de la commande encore plus violemment que d’habitude, sans dire son nom."
          : "Insulte quelqu’un de façon violente et énervée, sans dire son nom."
      }
    ];

    await acknowledge(interaction);

    const phrase = await GPTResponse(systemPrompt, chatMessages);

    await interaction.channel.send({
      content: `${trueTarget}, ${phrase}`,
      allowedMentions: { users: [trueTarget.id] }
    });
  }

  else if (name === 'meme') {
    const meme = await fetchRandomMeme();
    await acknowledge(interaction);
    if (!meme) {
      await interaction.channel.send("https://tenor.com/view/kirby-i-forgot-i-forgor-gif-22449575");
      return;
    }

    try {
      const res = await axios.get(meme.url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://www.reddit.com'
        }
      });

      const urlPath = new URL(meme.url).pathname;
      let ext = path.extname(urlPath);
      if (!ext) ext = meme.type === 'video' ? '.mp4' : '.png';
      const filename = `meme${ext}`;
      const file = { attachment: Buffer.from(res.data), name: filename };

      if (meme.type === 'image' || meme.type === 'video') {
        await interaction.channel.send({
          files: [file]
        });
      } else {
        await interaction.channel.send(meme.url);
      }
    } catch (err) {
      console.error('Erreur lors du téléchargement du meme :', err);
      await interaction.channel.send(meme.url);
    }
  }

  else if (name === 'ascii') {
    try {
      await acknowledge(interaction);

      const maxTries = 5;
      const maxPages = 53;
      let attempt = 0;
      let values = [];

      while (values.length === 0 && attempt < maxTries) {
        attempt++;
        const randomPage = Math.floor(Math.random() * maxPages) + 1;
        const url = `https://www.twitchquotes.com/copypastas/ascii-art?page=${randomPage}`;

        const browser = await puppeteer.launch({
          headless: "new",
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0");
        await page.goto(url, { waitUntil: "domcontentloaded" });

        try {
          await page.waitForSelector('button.copy_to_clipboard_js', { timeout: 5000 });

          values = await page.$$eval('button.copy_to_clipboard_js', buttons =>
            buttons
              .map(btn => btn.getAttribute("data-clipboard-text")?.trim())
              .filter(text => text && text.length > 30)
          );
        } catch (err) {
          console.warn(`Essai ${attempt} : aucun bouton détecté.`);
        }

        await browser.close();
      }

      if (values.length === 0) {
        await interaction.channel.send("https://tenor.com/view/kirby-i-forgot-i-forgor-gif-22449575");
      } else {
        const random = values[Math.floor(Math.random() * values.length)];
        const parts = splitMessage(random, 2000);
        for (const part of parts) {
          await interaction.channel.send(part);
        }
      }
    } catch (err) {
      console.error("Erreur Puppeteer ASCII :", err.message);
      await interaction.channel.send("Erreur lors du chargement de l'ASCII.");
    }
  }

});

// Confirmation dans la console quand le bot est prêt
client.once('ready', () => {
  console.log('Le retardOmancien est en ligne !');
});

client.login(DISCORD_TOKEN);
