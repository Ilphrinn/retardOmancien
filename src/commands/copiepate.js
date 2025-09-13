const { splitMessage, randomItem, createTimedCache } = require('./utils');
const { getTop, TOP_TIMES } = require('../services/reddit');

const CACHE_TTL = 5 * 60 * 1000;
const copiepateCache = createTimedCache(CACHE_TTL);
const sentCopiepates = new Set();
const MAX_COPIE_HISTORY = 200;

async function fetchRandomCopiepate() {
  const cacheKey = 'CopiePates-multiTop';
  let posts = copiepateCache.get(cacheKey);
  if (!posts) {
    const limit = 100;
    const all = await Promise.all(
      TOP_TIMES.map(time => getTop('CopiePates', time, limit).catch(()=>[]))
    );
    posts = Array.from(new Map(all.flat().map(p => [p.id, p])).values());
    copiepateCache.set(cacheKey, posts);
  }

  const MAX_CHARS = 2000, MAX_LINES = 30;
  const valid = posts.filter(post => {
    const text = post.selftext;
    if (!text || text.length <= 30 || text.length > MAX_CHARS) return false;
    if (text.split('\n').length > MAX_LINES) return false;
    return !post.stickied && !sentCopiepates.has(text);
  });

  if (!valid.length) return 'https://tenor.com/view/kirby-i-forgot-i-forgor-gif-22449575';

  const pick = randomItem(valid).selftext;
  sentCopiepates.add(pick);
  if (sentCopiepates.size > MAX_COPIE_HISTORY) {
    const arr = Array.from(sentCopiepates);
    sentCopiepates.clear();
    arr.slice(-MAX_COPIE_HISTORY).forEach(t => sentCopiepates.add(t));
  }
  return pick;
}

module.exports = {
  name: 'copiepate',
  async execute(interaction) {
    const text = await fetchRandomCopiepate();
    for (const part of splitMessage(text)) await interaction.channel.send(part);
  }
};
