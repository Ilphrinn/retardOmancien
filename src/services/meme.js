const axios = require('axios');
const path = require('path');
const { randomItem, createTimedCache } = require('../utils');
const { MEME_METHODS, TOP_TIMES, subredditsMemes } = require('../config');
const { getTop, getHot, getNew, getRising } = require('./reddit');

const subredditCache = createTimedCache(5 * 60 * 1000);
const sentMemes = new Set();
const MAX_HISTORY = 200;

async function fetchFromReddit(sub, method, time) {
  if (method === 'top') return getTop(sub, time, 100);
  if (method === 'hot') return getHot(sub, 50);
  if (method === 'new') return getNew(sub, 50);
  if (method === 'rising') return getRising(sub, 50);
  return getHot(sub, 50);
}

async function fetchRandomMeme() {
  const sub = randomItem(subredditsMemes);
  const chosenMethod = randomItem(MEME_METHODS);
  const time = randomItem(TOP_TIMES);
  const cacheKey = `${sub}-${chosenMethod}-${time}`;

  let posts = subredditCache.get(cacheKey);
  if (!posts) {
    posts = await fetchFromReddit(sub, chosenMethod, time);
    subredditCache.set(cacheKey, posts);
  }

  const offsetStep = 10;
  const offset = Math.floor(Math.random() * Math.max(1, posts.length / offsetStep)) * offsetStep;
  const slice = posts.slice(offset, offset + offsetStep);

  const medias = slice.map(post => {
    const url = post.url || '';
    if (post.is_video && post.media?.reddit_video?.fallback_url) {
      return { type: 'video', url: post.media.reddit_video.fallback_url, title: post.title, subreddit: sub };
    }
    if (/\.gifv$/.test(url)) {
      return { type: 'video', url: url.replace(/\.gifv$/, '.mp4'), title: post.title, subreddit: sub };
    }
    if (/\.(jpg|jpeg|png|gif)$/.test(url)) {
      return { type: 'image', url, title: post.title, subreddit: sub };
    }
    return null;
  }).filter(Boolean).filter(m => !sentMemes.has(m.url));

  if (medias.length === 0) return null;

  const random = randomItem(medias);
  sentMemes.add(random.url);
  if (sentMemes.size > MAX_HISTORY) {
    const arr = Array.from(sentMemes);
    sentMemes.clear();
    arr.slice(-MAX_HISTORY).forEach(u => sentMemes.add(u));
  }
  return random;
}

async function downloadToDiscordAttachment(url, type) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.reddit.com' }
  });
  const urlPath = new URL(url).pathname;
  let ext = path.extname(urlPath);
  if (!ext) ext = type === 'video' ? '.mp4' : '.png';
  const filename = `meme${ext}`;
  return { attachment: Buffer.from(res.data), name: filename };
}

module.exports = { fetchRandomMeme, downloadToDiscordAttachment };
