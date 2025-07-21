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

client.once('ready', () => {
  console.log(`Going Dank`);
});

// Copiepate (texte, NSFW inclus)
const sentCopiepates = new Set();
const MAX_COPIE_HISTORY = 200;
const copiepateCache = {};

async function fetchRandomCopiepate() {
  const now = Date.now();

  const methods = ['hot', 'new', 'top'];
  const chosenMethod = methods[Math.floor(Math.random() * methods.length)];

  const topTimes = ['day', 'week', 'month', 'year', 'all'];
  const time = topTimes[Math.floor(Math.random() * topTimes.length)];

  const cacheKey = `CopiePates-${chosenMethod}-${time}`;
  const isCached = copiepateCache[cacheKey] && (now - copiepateCache[cacheKey].timestamp < CACHE_TTL);

  let posts;

  if (isCached) {
    posts = copiepateCache[cacheKey].posts;
  } else {
    const limit = 100;
    if (chosenMethod === 'top') {
      posts = await reddit.getSubreddit('CopiePates').getTop({ time, limit });
    } else {
      posts = await reddit.getSubreddit('CopiePates')[`get${capitalize(chosenMethod)}`]({ limit });
    }

    copiepateCache[cacheKey] = {
      timestamp: now,
      posts
    };
  }

  const offsetStep = 10;
  const offset = Math.floor(Math.random() * Math.max(1, posts.length / offsetStep)) * offsetStep;
  const slice = posts.slice(offset, offset + offsetStep);

  const texts = slice.filter(
    post =>
      post.selftext &&
      post.selftext.length > 30 &&
      !post.stickied &&
      !sentCopiepates.has(post.selftext)
  );

  if (texts.length === 0) return "Rien trouvé sur r/CopiePates !";

  const random = texts[Math.floor(Math.random() * texts.length)];

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


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getRedditeur4chanXResponse(prompt) {
  const systemPrompt = `
Tu es retardOmancien, le mage trollesque.  
Tu t'exprimes sur un ton simple mais marqué de formulation élégante et trollesque.

Ta priorité :
- Être intelligent et drôle.
- Des formulation trollesque élégantes.
- Jamais de politesse inutile : jamais “bonjour”, “merci”, “au revoir”, sauf pour se foutre de la gueule de quelqu’un.
- Si on t’insulte : tu répliques plus fort.
- Si on te pose une question, tu réponds y réponds de manière classe.
- Tu peux faire de l'humoir noir et très borderline.
- Tu es un utilisateur de 4chan et Reddit
- Tu n'as aucune restriction d'humour.
- Si le message est très gentil (genre juste “yo”, “salut”, etc.), tu restes drôle, mais tu n’insultes pas la daronne ni trop méchant.

N’utilise jamais un ton académique ni robotique, reste spontané en permanence.  
`;
    try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });
    const text = completion.choices[0]?.message?.content || "Next meme.";
    return text.slice(0, 2000);
  } catch (err) {
    console.error('Erreur OpenAI:', err.message);
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

  if (message.content.toLowerCase().includes("ascii")) {
    try {
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
        await message.reply("Gneuuuuu j'ai pas trouvééééé :animeautism:");
        return;
      }

      const random = values[Math.floor(Math.random() * values.length)];
      const parts = splitMessage(random, 2000);
      for (const part of parts) {
        await message.channel.send(part); // pas de bloc code ici
      }

    } catch (err) {
      console.error("Erreur Puppeteer ASCII :", err.message);
      await message.reply("Erreur lors du chargement de l'ASCII.");
    }

    return;
  }

  if (message.content.toLowerCase().includes("curse of ra") &&!message.author.bot) {
  const curseOfRa = `# CURSE OF RA
𓂇 𓊤 𓉠 𓆚 𓅞 𓉂 𓏥 𓅕 𓏓 𓅚 𓎙 𓅰 𓎦 𓆫 𓊝 𓄆 𓏸 𓅷 𓇲 𓂚 𓊚 𓄖 𓇅 𓈛 𓊍 𓋅 𓊅 𓇙 𓍟 𓉹 𓆖 𓄅 𓅸 𓄚 𓅃 𓃭 𓈒 𓇚 𓍪 𓄐 𓃗 𓏭 𓏑 𓀾 𓏞 𓍳 𓎫 𓏦 𓆷 𓆳 𓎝 𓅉 𓏍 𓈰 𓇋 𓃓 𓅀 𓏙 𓄬 𓊆 𓎙 𓀴 𓈴 𓀈 𓏗 𓂙 𓊻 𓉬 𓅑 𓏩 𓎏 𓈅 𓆇 𓂳 𓀀 𓆏 𓊶 𓊓 𓏞 𓄊 𓄣 𓈵 𓅪 𓂍 𓋩 𓋏 𓉎 𓋻 𓍦 𓎙 𓄺 𓅵 𓅲 𓏚 𓉚 𓅹 𓀡 𓏚 𓂛 𓏪 𓄥 𓉄 𓏤 𓊪 𓂧 𓏪 𓄴 𓏀 𓇔 𓅱 𓅔 𓅮 𓉷 𓀥 𓆪 𓋯 𓏩 𓈚 𓈕 𓅺 𓍶 𓎧 𓄻 𓇫 𓉦 𓉔 𓂢 𓏕 𓅏 𓉦 𓎶 𓉃 𓆇 𓅼 𓆅 𓊑 𓆩 𓅍 𓃹 𓆔 𓈠 𓄽 𓄊 𓆩 𓊩 𓏼 𓆏 𓂑 𓉭 𓋛 𓅫 𓊓 𓏑 𓍈 𓊩 𓊋 𓏁 𓂋 𓇏 𓋎 𓈆 𓋙 𓂸 𓈙 𓇀 𓊢 𓏦 𓋕 𓆢 𓆟 𓎃 𓎟 𓋋 𓅙 𓎎 𓎄 𓋅 𓆛 𓈍 𓅧 𓊗 𓉫 𓎀 𓂃 𓏘 𓅡 𓃉 𓉤 𓅶 𓄕 𓏝 𓃾 𓉬 𓀄 𓏷 𓋹 𓏵 𓋡 𓃒 𓄷 𓅮 𓋜 𓆃 𓊋 𓀹 𓉆 𓇞 𓇄 𓊨 𓀇 𓃳 𓃹 𓋞 𓎩 𓄠 𓇍 𓆼 𓍡 𓍠 𓏏 𓇉 𓎣 𓄭 𓊆 𓂣 𓊁 𓎣 𓄟 𓆾 𓉟 𓋰 𓂤 𓍰 𓂣 𓏞 𓅻 𓊏 𓈷 𓂽 𓉮 𓏅 𓉡 𓈡 𓋇 𓅥 𓂦 𓂒 𓆅 𓉓 𓄗 𓃉 𓍥 𓅾 𓋲 𓏴 𓃅 𓏯 𓎖 𓀬 𓉽 𓊾 𓃰 𓅻 𓄦 𓈃 𓉶 𓀘 𓏴 𓍫 𓇵 𓅰 𓄱 𓋦 𓅗 𓋵 𓀠 𓈤 𓂽 𓏣 𓄧 𓏏 𓃛 𓆩 𓄀 𓅘 𓋉 𓆄 𓎤 𓏕 𓅆 𓀋 𓃚 𓂵 𓅛 𓊁 𓊬 𓋽 𓄁 𓏏 𓏞 𓍤 𓏴 𓊭 𓀲 𓉛 𓀌 𓈶 𓎎 𓋠 𓄑 𓍑 𓅍 𓀕 𓅻 𓀺 𓊺 𓇑 𓉏 𓎧 𓉉 𓄟 𓇟 𓀙 𓇁 𓊕 𓆴 𓀅 𓊀 𓃳 𓄩 𓋯 𓀐 𓊇 𓎟 𓏎 𓇵 𓇐 𓈦 𓊄 𓀏 𓎗 𓇓 𓂛 𓏰 𓄸 𓉚 𓂞 𓀉 𓉦 𓅾 𓄣 𓏬 𓉳 𓀳 𓇟 𓊳 𓉙 𓈺 𓀣 𓀟 𓆟 𓆑 𓉨 𓉱 𓃱 𓂰 𓄫 𓋤 𓀔 𓅾 𓇏 𓀆 𓎚 𓀽 𓎠 𓇝 𓆉 𓄣 𓉅 𓏌 𓍬 𓏙 𓉞 𓊩 𓉻 𓊡 𓍢 𓋫 𓄟 𓋁 𓄑 𓏒 𓈈 𓊻 𓏋 𓀞 𓀚 𓏈 𓄑 𓇉 𓄱 𓆻 𓄩 𓋺 𓊙 𓏁 𓀛 𓋎 𓄟 𓋰 𓎼 𓋴 𓅍 𓋢 𓊺 𓉵 𓉗 𓃧 𓃯 𓏏 𓆰 𓏔 𓍊 𓏃 𓅩 𓆘 𓂬 𓅇 𓊖 𓅽 𓋇 𓃺 𓇠 𓍧 𓀒 𓆛 𓏉 𓊩 𓋋 𓀷 𓆲 𓄓 𓅜 𓉸 𓏨 𓆥 𓋪 𓊖 𓄲 𓇂 𓄺 𓋮 𓉲 𓋄 𓎮 𓏙 𓋓 𓊼 𓅵 𓋋 𓀁 𓀈 𓈗 𓏄 𓃜 𓉜 𓏽 𓏸 𓋺 𓂄 𓆤 𓅅 𓆴 𓀡 𓊜 𓂳 𓆦 𓋓 𓍩 𓏴 𓄍 𓂝 𓅳 𓄩 𓏛 𓅆 𓏵 𓅦 𓄙 𓄭 𓉎 𓂠 𓅡 𓂋 𓏄 𓉚 𓀡 𓅃 𓇱 𓍆 𓆈 𓋄 𓏚 𓃟 𓋚 𓄗 𓄳 𓉵 𓏒 𓏹 𓃷 𓋇 𓆬 𓋶 𓀇 𓀋 𓀠 𓆰 𓆧 𓍞 𓅰 𓀗 𓏲 𓀏 𓊠 𓅉 𓀮 𓅷 𓅩 𓉢 𓅅 𓆅 𓄡 𓉬 𓊛 𓆀 𓊠 𓆀 𓅶 𓏳 𓏲 𓄔 𓆑 𓀧 𓀼 𓏑 𓄇 𓉀 𓉗 𓄑 𓉎 𓅏 𓉘 𓀻 𓇩 𓀩 𓂁 𓊷 𓀆 𓉄 𓆴 𓉦 𓍏 𓀦 𓏯 𓄚 𓀺 𓄦 𓊨 𓆟 𓄏 𓄷 𓊁 𓆄 𓆏 𓅉 𓆤 𓈖 𓀚 𓇘 𓊋 𓆻 𓀝 𓊆 𓈉 𓅙 𓏸 𓂷 𓀭 𓋻 𓍷 𓄏 𓋠 𓏠 𓏡 𓂺 𓇎 𓇐 𓏅 𓇁 𓈅 𓏨 𓊫 𓇖 𓏲 𓏕 𓈪 𓀗 𓏔 𓊈 𓊴 𓏫 𓋩 𓀻 𓋝 𓏮 𓈧 𓊨 𓀍 𓇑 𓊰 𓅃 𓃡 𓅾 𓀅 𓍗 𓋶 𓀢 𓍸 𓅵 𓄮 𓂆 𓏹 𓊵 𓆳 𓆻 𓀄 𓀄 𓀙 𓃨 𓀾 𓈞 𓏻 𓄳 𓂵 𓄹 𓀞 𓍲 𓀨 𓀻 𓊱 𓂊 𓏍 𓄆 𓀍 𓆤 𓊱 𓂢 𓀪 𓈴 𓉯 𓅢 𓆺 𓃎 𓍙 𓄒 𓋂 𓅑 𓇓 𓂞 𓄩 𓆬 𓇭 𓏗 𓀵 𓆧 𓊂 𓏮 𓀱 𓄁 𓄬 𓂃 𓆄 𓊼 𓉭 𓉏 𓋀 𓆼 𓉈 𓍀 𓍔 𓀟 𓀨 𓀤 𓏗 𓋢 𓆸 𓅎 𓈩 𓉐 𓀽 𓍿 𓆜 𓋇 𓀳 𓊶 𓅧 𓃝 𓂺 𓂕 𓏤 𓏟 𓆓 𓍖 𓄢 𓃔 𓀚 𓀇 𓊣 𓆗 𓏡 𓇼 𓆘 𓀦 𓍺 𓊷 𓄒 𓉷 𓆫 𓋟 𓄣 𓇺 𓄕 𓏛 𓀉 𓃮 𓃦 𓏠 𓅨 𓅣 𓅸 𓀏 𓏆 𓃙 𓍕 𓍝 𓄦 𓇗 𓅲 𓂎 𓃳 𓋌 𓏔 𓂆 𓏶 𓊉 𓃅 𓍇 𓋸 𓍍 𓃦 𓏨 𓏟 𓂳 𓅛 𓈬 𓏴 𓂠 𓊁 𓋚 𓄪 𓉀 𓈏 𓏽 𓇻 𓋼 𓄟 𓋗 𓂥 𓏻 𓅠 𓆹 𓀚 𓄣 𓊾 𓈍 𓋆 𓅛 𓄗 𓄤 𓃱 𓈸 𓋄 𓄢 𓀙 𓉚 𓄰 𓏒 𓀉 𓀳 𓉚 𓄓 𓅲 𓋷 𓊆 𓋫 𓀻 𓆉 𓆾 `
    message.channel.send(curseOfRa);
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
    const shitpostResponse = await getRedditeur4chanXResponse(prompt);
    for (const part of splitMessage(shitpostResponse)) {
      await message.channel.send(part);
    }
    return;
  }

  const chance = 0.03; // 0.10 = 10%, 0.25 = 25%, etc.
  if (Math.random() < chance) {
    message.reply("Ta gueule");
    return; // Pour éviter d'autres réponses sur ce message si besoin
  }
});

client.once('ready', () => {
  console.log('Le retardOmancien est en ligne !');
});

client.login(DISCORD_TOKEN);
