const { Client, GatewayIntentBits } = require('discord.js');
const Snoowrap = require('snoowrap');
const { OpenAI } = require('openai');
const axios = require('axios');
const puppeteer = require('puppeteer');

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function splitMessage(str, size = 2000) {
  const parts = [];
  for (let i = 0; i < str.length; i += size) {
    parts.push(str.slice(i, i + size));
  }
  return parts;
}

const { DISCORD_TOKEN, CLIENT_ID } = process.env;

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

client.once('ready', () => {
  console.log(`Going Dank`);
});



// GPT Integration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
const sentCopiepates = new Set();
const MAX_COPIE_HISTORY = 200;
const copiepateCache = {};

async function fetchRandomCopiepate() {
  const now = Date.now();

  const topTimes = ['day', 'week', 'month', 'year', 'all'];
  const cacheKey = 'CopiePates-multiTop';
  const isCached = copiepateCache[cacheKey] && (now - copiepateCache[cacheKey].timestamp < CACHE_TTL);

  let posts;

  if (isCached) {
    posts = copiepateCache[cacheKey].posts;
  } else {
    const limit = 100;
    const all = await Promise.all(
      topTimes.map(time =>
        reddit.getSubreddit('CopiePates').getTop({ time, limit }).catch(() => [])
      )
    );

    const flat = all.flat();
    const unique = [];
    const seenIds = new Set();
    for (const post of flat) {
      if (!seenIds.has(post.id)) {
        seenIds.add(post.id);
        unique.push(post);
      }
    }

    posts = unique;

    copiepateCache[cacheKey] = {
      timestamp: now,
      posts
    };
  }

  const MAX_CHARS = 2000;
  const MAX_LINES = 30;

  const validPosts = posts.filter(post => {
    const text = post.selftext;
    return (
      text &&
      text.length > 30 &&
      text.length <= MAX_CHARS &&
      text.split('\n').length <= MAX_LINES &&
      !post.stickied &&
      !sentCopiepates.has(text)
    );
  });

  if (validPosts.length === 0) return "https://tenor.com/view/kirby-i-forgot-i-forgor-gif-22449575";

  const random = validPosts[Math.floor(Math.random() * validPosts.length)];

  sentCopiepates.add(random.selftext);
  if (sentCopiepates.size > MAX_COPIE_HISTORY) {
    const arr = Array.from(sentCopiepates);
    sentCopiepates.clear();
    arr.slice(arr.length - MAX_COPIE_HISTORY).forEach(text => sentCopiepates.add(text));
  }

  return random.selftext;
}

// Meme image (NSFW inclus)
const subredditsMemes = [
  'Discordmemes',
  'shitposting',
  'okbuddyretard',
  'doodoofard',
  'MemeMan',
];

const sentMemes = new Set();
const MAX_HISTORY = 200;
const subredditCache = {};

async function fetchRandomMemeImage() {
  const sub = subredditsMemes[Math.floor(Math.random() * subredditsMemes.length)];
  const now = Date.now();

  // Méthodes préférées selon diversité et rapidité
  const methods = ['hot', 'new', 'rising', 'top'];
  const chosenMethod = methods[Math.floor(Math.random() * methods.length)];

  const topTimes = ['day', 'week', 'month', 'year', 'all'];
  const time = topTimes[Math.floor(Math.random() * topTimes.length)];

  let posts;

  const cacheKey = `${sub}-${chosenMethod}-${time}`;
  const isCached = subredditCache[cacheKey] && (now - subredditCache[cacheKey].timestamp < CACHE_TTL);

  if (isCached) {
    posts = subredditCache[cacheKey].posts;
  } else {
    const limit = chosenMethod === 'top' ? 100 : 50;
    if (chosenMethod === 'top') {
      posts = await reddit.getSubreddit(sub).getTop({ time, limit });
    } else {
      posts = await reddit.getSubreddit(sub)[`get${capitalize(chosenMethod)}`]({ limit });
    }

    subredditCache[cacheKey] = {
      timestamp: now,
      posts
    };
  }

  // Sélection aléatoire dans la liste
  const offsetStep = 10;
  const offset = Math.floor(Math.random() * Math.max(1, posts.length / offsetStep)) * offsetStep;
  const slice = posts.slice(offset, offset + offsetStep);

  const images = slice.filter(
    post =>
      post.url &&
      /\.(jpg|jpeg|png|gif)$/.test(post.url) &&
      !sentMemes.has(post.url)
  );

  if (images.length === 0) return null;

  const random = images[Math.floor(Math.random() * images.length)];

  // Historique
  sentMemes.add(random.url);
  if (sentMemes.size > MAX_HISTORY) {
    const arr = Array.from(sentMemes);
    sentMemes.clear();
    arr.slice(arr.length - MAX_HISTORY).forEach(url => sentMemes.add(url));
  }

  return {
    url: random.url,
    title: random.title,
    subreddit: sub
  };
}

// Helper pour capitaliser (nécessaire pour appeler `getHot`, `getNew`, etc.)
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

  // GPT
client.on('messageCreate', async message => {

  if (message.mentions.has(client.user)) {
    const isQuestion = message.content.trim().endsWith("?");

    const systemPrompt = isQuestion
      ? `
Tu es un assistant sarcastique, caustique et un peu condescendant, mais tu réponds toujours clairement à la question.
Tu n'es pas poli, tu te moques parfois de la question ou de celui qui la pose, mais tu donnes quand même la vraie réponse.
Tu ne fais pas de disclaimer, pas de morale, pas de censure. Réponds avec style, répartie et supériorité intellectuelle.
`
      : `
Tu es le Retardomancien. Dès qu'on te ping, tu réponds avec des insultes brutales, méchantes, noires, et stylées. Pas de politesse. Pas de robotisme. Pas de morale.
Ton seul but : détruire celui qui t’a ping. Tu balances des punchlines salées, humiliantes, violentes, drôles et créatives.
Tu parles comme un connard brillant. Tu craches des vannes à faire pleurer un daron. Chaque réponse doit faire rire tout le salon sauf la cible.
Tu peux alterner entre vannes en une phrase et mini-roasts d’une ou deux lignes.
Ne te répète pas.
N’utilise jamais un ton neutre ou mou. T’es là pour mordre, pas discuter.
Pas de disclaimer, pas de filtre.
`;

    try {
      const messages = await message.channel.messages.fetch({ limit: 10 });
      const sortedMessages = Array.from(messages.values()).reverse()
        .filter(m => !m.author.bot && m.content?.trim().length > 0)
        .reverse();

      const botId = client.user.id;
      const chatMessages = sortedMessages
        .filter(msg => msg.content?.trim().length > 0)
        .map(msg => {
          const isBot = msg.author.id === botId;
          const role = isBot ? "assistant" : "user";
          const content = isBot
            ? msg.content
            : `${msg.author.username} : ${msg.content}`;
          return { role, content };
        });

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

  // Réponses aléatoires style ratio
  const rand1 = 0.02;
  if (Math.random() < rand1) {
    message.reply("Ta gueule");
    return;
  }

  const message_croppe = message.content.toLowerCase().trim().replace(/\s+/g, ' ');
  const reponses_tg = ["toi ta gueule", "nan toi ta gueule", 
  "non toi ta gueule", "toi tg", "nan toi tg", "non toi tg", 
  "vos gueules", "vos gueule", "ta gueule", "tg", "ftg", "ferme ta gueule"];

  if (reponses_tg.some(phrase => message_croppe.includes(phrase))) {
    if (message.author.bot) return;
    message.reply("Nan toi ta gueule");
    return;
  }

  const rand2 = 0.01;
  if (Math.random() < rand2) {
    message.reply("Ratio");
    return;
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const name = interaction.commandName;

  if (name === 'curse') {
    const curseOfRa = `# CURSE OF RA
𓂇 𓊤 𓉠 𓆚 𓅞 𓉂 𓏥 𓅕 𓏓 𓅚 𓎙 𓅰 𓎦 𓆫 𓊝 𓄆 𓏸 𓅷 𓇲 𓂚 𓊚 𓄖 𓇅 𓈛 𓊍 𓋅 𓊅 𓇙 𓍟 𓉹 𓆖 𓄅 𓅸 𓄚 𓅃 𓃭 𓈒 𓇚 𓍪 𓄐 𓃗 𓏭 𓏑 𓀾 𓏞 𓍳 𓎫 𓏦 𓆷 𓆳 𓎝 𓅉 𓏍 𓈰 𓇋 𓃓 𓅀 𓏙 𓄬 𓊆 𓎙 𓀴 𓈴 𓀈 𓏗 𓂙 𓊻 𓉬 𓅑 𓏩 𓎏 𓈅 𓆇 𓂳 𓀀 𓆏 𓊶 𓊓 𓏞 𓄊 𓄣 𓈵 𓅪 𓂍 𓋩 𓋏 𓉎 𓋻 𓍦 𓎙 𓄺 𓅵 𓅲 𓏚 𓉚 𓅹 𓀡 𓏚 𓂛 𓏪 𓄥 𓉄 𓏤 𓊪 𓂧 𓏪 𓄴 𓏀 𓇔 𓅱 𓅔 𓅮 𓉷 𓀥 𓆪 𓋯 𓏩 𓈚 𓈕 𓅺 𓍶 𓎧 𓄻 𓇫 𓉦 𓉔 𓂢 𓏕 𓅏 𓉦 𓎶 𓉃 𓆇 𓅼 𓆅 𓊑 𓆩 𓅍 𓃹 𓆔 𓈠 𓄽 𓄊 𓆩 𓊩 𓏼 𓆏 𓂑 𓉭 𓋛 𓅫 𓊓 𓏑 𓍈 𓊩 𓊋 𓏁 𓂋 𓇏 𓋎 𓈆 𓋙 𓂸 𓈙 𓇀 𓊢 𓏦 𓋕 𓆢 𓆟 𓎃 𓎟 𓋋 𓅙 𓎎 𓎄 𓋅 𓆛 𓈍 𓅧 𓊗 𓉫 𓎀 𓂃 𓏘 𓅡 𓃉 𓉤 𓅶 𓄕 𓏝 𓃾 𓉬 𓀄 𓏷 𓋹 𓏵 𓋡 𓃒 𓄷 𓅮 𓋜 𓆃 𓊋 𓀹 𓉆 𓇞 𓇄 𓊨 𓀇 𓃳 𓃹 𓋞 𓎩 𓄠 𓇍 𓆼 𓍡 𓍠 𓏏 𓇉 𓎣 𓄭 𓊆 𓂣 𓊁 𓎣 𓄟 𓆾 𓉟 𓋰 𓂤 𓍰 𓂣 𓏞 𓅻 𓊏 𓈷 𓂽 𓉮 𓏅 𓉡 𓈡 𓋇 𓅥 𓂦 𓂒 𓆅 𓉓 𓄗 𓃉 𓍥 𓅾 𓋲 𓏴 𓃅 𓏯 𓎖 𓀬 𓉽 𓊾 𓃰 𓅻 𓄦 𓈃 𓉶 𓀘 𓏴 𓍫 𓇵 𓅰 𓄱 𓋦 𓅗 𓋵 𓀠 𓈤 𓂽 𓏣 𓄧 𓏏 𓃛 𓆩 𓄀 𓅘 𓋉 𓆄 𓎤 𓏕 𓅆 𓀋 𓃚 𓂵 𓅛 𓊁 𓊬 𓋽 𓄁 𓏏 𓏞 𓍤 𓏴 𓊭 𓀲 𓉛 𓀌 𓈶 𓎎 𓋠 𓄑 𓍑 𓅍 𓀕 𓅻 𓀺 𓊺 𓇑 𓉏 𓎧 𓉉 𓄟 𓇟 𓀙 𓇁 𓊕 𓆴 𓀅 𓊀 𓃳 𓄩 𓋯 𓀐 𓊇 𓎟 𓏎 𓇵 𓇐 𓈦 𓊄 𓀏 𓎗 𓇓 𓂛 𓏰 𓄸 𓉚 𓂞 𓀉 𓉦 𓅾 𓄣 𓏬 𓉳 𓀳 𓇟 𓊳 𓉙 𓈺 𓀣 𓀟 𓆟 𓆑 𓉨 𓉱 𓃱 𓂰 𓄫 𓋤 𓀔 𓅾 𓇏 𓀆 𓎚 𓀽 𓎠 𓇝 𓆉 𓄣 𓉅 𓏌 𓍬 𓏙 𓉞 𓊩 𓉻 𓊡 𓍢 𓋫 𓄟 𓋁 𓄑 𓏒 𓈈 𓊻 𓏋 𓀞 𓀚 𓏈 𓄑 𓇉 𓄱 𓆻 𓄩 𓋺 𓊙 𓏁 𓀛 𓋎 𓄟 𓋰 𓎼 𓋴 𓅍 𓋢 𓊺 𓉵 𓉗 𓃧 𓃯 𓏏 𓆰 𓏔 𓍊 𓏃 𓅩 𓆘 𓂬 𓅇 𓊖 𓅽 𓋇 𓃺 𓇠 𓍧 𓀒 𓆛 𓏉 𓊩 𓋋 𓀷 𓆲 𓄓 𓅜 𓉸 𓏨 𓆥 𓋪 𓊖 𓄲 𓇂 𓄺 𓋮 𓉲 𓋄 𓎮 𓏙 𓋓 𓊼 𓅵 𓋋 𓀁 𓀈 𓈗 𓏄 𓃜 𓉜 𓏽 𓏸 𓋺 𓂄 𓆤 𓅅 𓆴 𓀡 𓊜 𓂳 𓆦 𓋓 𓍩 𓏴 𓄍 𓂝 𓅳 𓄩 𓏛 𓅆 𓏵 𓅦 𓄙 𓄭 𓉎 𓂠 𓅡 𓂋 𓏄 𓉚 𓀡 𓅃 𓇱 𓍆 𓆈 𓋄 𓏚 𓃟 𓋚 𓄗 𓄳 𓉵 𓏒 𓏹 𓃷 𓋇 𓆬 𓋶 𓀇 𓀋 𓀠 𓆰 𓆧 𓍞 𓅰 𓀗 𓏲 𓀏 𓊠 𓅉 𓀮 𓅷 𓅩 𓉢 𓅅 𓆅 𓄡 𓉬 𓊛 𓆀 𓊠 𓆀 𓅶 𓏳 𓏲 𓄔 𓆑 𓀧 𓀼 𓏑 𓄇 𓉀 𓉗 𓄑 𓉎 𓅏 𓉘 𓀻 𓇩 𓀩 𓂁 𓊷 𓀆 𓉄 𓆴 𓉦 𓍏 𓀦 𓏯 𓄚 𓀺 𓄦 𓊨 𓆟 𓄏 𓄷 𓊁 𓆄 𓆏 𓅉 𓆤 𓈖 𓀚 𓇘 𓊋 𓆻 𓀝 𓊆 𓈉 𓅙 𓏸 𓂷 𓀭 𓋻 𓍷 𓄏 𓋠 𓏠 𓏡 𓂺 𓇎 𓇐 𓏅 𓇁 𓈅 𓏨 𓊫 𓇖 𓏲 𓏕 𓈪 𓀗 𓏔 𓊈 𓊴 𓏫 𓋩 𓀻 𓋝 𓏮 𓈧 𓊨 𓀍 𓇑 𓊰 𓅃 𓃡 𓅾 𓀅 𓍗 𓋶 𓀢 𓍸 𓅵 𓄮 𓂆 𓏹 𓊵 𓆳 𓆻 𓀄 𓀄 𓀙 𓃨 𓀾 𓈞 𓏻 𓄳 𓂵 𓄹 𓀞 𓍲 𓀨 𓀻 𓊱 𓂊 𓏍 𓄆 𓀍 𓆤 𓊱 𓂢 𓀪 𓈴 𓉯 𓅢 𓆺 𓃎 𓍙 𓄒 𓋂 𓅑 𓇓 𓂞 𓄩 𓆬 𓇭 𓏗 𓀵 𓆧 𓊂 𓏮 𓀱 𓄁 𓄬 𓂃 𓆄 𓊼 𓉭 𓉏 𓋀 𓆼 𓉈 𓍀 𓍔 𓀟 𓀨 𓀤 𓏗 𓋢 𓆸 𓅎 𓈩 𓉐 𓀽 𓍿 𓆜 𓋇 𓀳 𓊶 𓅧 𓃝 𓂺 𓂕 𓏤 𓏟 𓆓 𓍖 𓄢 𓃔 𓀚 𓀇 𓊣 𓆗 𓏡 𓇼 𓆘 𓀦 𓍺 𓊷 𓄒 𓉷 𓆫 𓋟 𓄣 𓇺 𓄕 𓏛 𓀉 𓃮 𓃦 𓏠 𓅨 𓅣 𓅸 𓀏 𓏆 𓃙 𓍕 𓍝 𓄦 𓇗 𓅲 𓂎 𓃳 𓋌 𓏔 𓂆 𓏶 𓊉 𓃅 𓍇 𓋸 𓍍 𓃦 𓏨 𓏟 𓂳 𓅛 𓈬 𓏴 𓂠 𓊁 𓋚 𓄪 𓉀 𓈏 𓏽 𓇻 𓋼 𓄟 𓋗 𓂥 𓏻 𓅠 𓆹 𓀚 𓄣 𓊾 𓈍 𓋆 𓅛 𓄗 𓄤 𓃱 𓈸 𓋄 𓄢 𓀙 𓉚 𓄰 𓏒 𓀉 𓀳 𓉚 𓄓 𓅲 𓋷 𓊆 𓋫 𓀻 𓆉 𓆾 `
    await interaction.deferReply({ ephemeral: true });
    await interaction.deleteReply();
    await interaction.channel.send(curseOfRa);
  }

  else if (name === 'copiepate') {
    const copypasta = await fetchRandomCopiepate();
    const parts = splitMessage(copypasta);
    await interaction.deferReply({ ephemeral: true });
    await interaction.deleteReply();
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
Écris une insulte impitoyable, brutale, méchante, salée, drôle et humiliante. Tu peux aller plus loin que d’habitude. Une ou deux phrases max. Pas de nom dans le texte, juste du carnage.`
    : `Tu es le Retardomancien. Tu es cruel, créatif et impitoyable. 
Tu dois générer une insulte stylée, méchante, brutale, drôle, énervée, et originale.
Pas besoin de prénom, pas de @username, pas de politesse, pas d’intro. Juste l’insulte.
Tu ne parles qu’à la cible. N’écris pas de nom. Ne salue pas. Ne conclus pas.
Juste une dinguerie, ou deux phrases maximum.`;

  const chatMessages = [
    {
      role: "user",
      content: isBotTargeted
        ? "Insulte l’auteur de la commande encore plus violemment que d’habitude, sans dire son nom."
        : "Insulte quelqu’un de façon originale et méchante, sans dire son nom."
    }
  ];

  await interaction.deferReply({ ephemeral: true });

  const phrase = await GPTResponse(systemPrompt, chatMessages);

  await interaction.deleteReply();

  await interaction.channel.send({
    content: `${trueTarget}, ${phrase}`,
    allowedMentions: { users: [trueTarget.id] }
  });
}

  else if (name === 'meme') {
    const meme = await fetchRandomMemeImage();
    await interaction.deferReply({ ephemeral: true });
    await interaction.deleteReply();
    if (!meme) {
      await interaction.channel.send("https://tenor.com/view/kirby-i-forgot-i-forgor-gif-22449575");
    } else {
      await interaction.channel.send({
        embeds: [{
          title: meme.title,
          image: { url: meme.url },
          footer: { text: `r/${meme.subreddit}` }
        }]
      });
    }
  }

  else if (name === 'ascii') {
    try {
      await interaction.deferReply({ ephemeral: true });

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

      await interaction.deleteReply();

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
      try {
        await interaction.deleteReply();
      } catch {}
      await interaction.channel.send("Erreur lors du chargement de l'ASCII.");
    }
  }
});

client.once('ready', () => {
  console.log('Le retardOmancien est en ligne !');
});

client.login(DISCORD_TOKEN);

//git add . && git commit -m "e" && git push