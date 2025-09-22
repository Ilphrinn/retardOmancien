const axios = require('axios');
const path = require('path');
const { randomItem, createTimedCache } = require('../utils');
const { MEME_METHODS, TOP_TIMES, subredditsMemes } = require('../config');
const { getTop, getHot, getNew, getRising } = require('./reddit');

const subredditCache = createTimedCache(5 * 60 * 1000);
const redditVideoDownloadCache = createTimedCache(30 * 60 * 1000);
const sentMemes = new Set();
const MAX_HISTORY = 200;
const NO_REDDIT_SAVE_RESULT = Symbol('no_reddit_save');

async function fetchFromReddit(sub, method, time) {
  if (method === 'top') return getTop(sub, time, 100);
  if (method === 'hot') return getHot(sub, 50);
  if (method === 'new') return getNew(sub, 50);
  if (method === 'rising') return getRising(sub, 50);
  return getHot(sub, 50);
}

async function resolveRedditVideoDownload(permalink) {
  if (!permalink) return null;
  const cacheKey = permalink;
  const cached = redditVideoDownloadCache.get(cacheKey);
  if (cached) {
    if (cached === NO_REDDIT_SAVE_RESULT) return null;
    return cached;
  }

  const infoUrl = `https://redditsave.com/info?url=${encodeURIComponent(permalink)}`;

  try {
    const res = await axios.get(infoUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    let data = res.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (err) {
        console.warn('Impossible de parser la réponse de redditsave :', err?.message || err);
        data = null;
      }
    }

    if (data && typeof data === 'object') {
      const downloadUrl = data.download_hd || data.download_url || null;
      redditVideoDownloadCache.set(cacheKey, downloadUrl || NO_REDDIT_SAVE_RESULT);
      return downloadUrl;
    }
  } catch (err) {
    console.warn('Echec de récupération du téléchargement reddit avec son :', err?.message || err);
  }

  redditVideoDownloadCache.set(cacheKey, NO_REDDIT_SAVE_RESULT);
  return null;
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

  const postsArray = Array.isArray(posts)
    ? posts
    : (typeof posts?.slice === 'function' ? posts.slice(0) : []);

  if (!postsArray || postsArray.length === 0) {
    return null;
  }

  const offsetStep = 10;
  const offset = Math.floor(Math.random() * Math.max(1, postsArray.length / offsetStep)) * offsetStep;
  const slice = postsArray.slice(offset, offset + offsetStep);

  const medias = slice.map(post => {
    const url = post.url || '';

    if (post.is_video && post.media?.reddit_video?.fallback_url) {
      const fallbackUrl = post.media.reddit_video.fallback_url;
      const permalink = post.permalink
        ? `https://www.reddit.com${post.permalink}`
        : (url.includes('reddit.com') ? url : null);
      const pageUrl = url || (post.permalink ? `https://www.reddit.com${post.permalink}` : fallbackUrl);
      return {
        type: 'reddit_video',
        url: pageUrl,
        downloadUrl: fallbackUrl,
        cacheKey: fallbackUrl,
        title: post.title,
        subreddit: sub,
        permalink
      };
    }

    if (/\.gifv$/.test(url)) {
      const convertedUrl = url.replace(/\.gifv$/, '.mp4');
      return {
        type: 'video',
        url: convertedUrl,
        downloadUrl: convertedUrl,
        cacheKey: convertedUrl,
        title: post.title,
        subreddit: sub
      };
    }

    if (/\.(mp4)$/.test(url)) {
      return {
        type: 'video',
        url,
        downloadUrl: url,
        cacheKey: url,
        title: post.title,
        subreddit: sub
      };
    }

    if (/\.(jpg|jpeg|png|gif)$/.test(url)) {
      return {
        type: 'image',
        url,
        downloadUrl: url,
        cacheKey: url,
        title: post.title,
        subreddit: sub
      };
    }

    return null;
  }).filter(Boolean).filter(m => !sentMemes.has(m.cacheKey || m.url));

  if (medias.length === 0) return null;

  const random = randomItem(medias);
  const identifier = random.cacheKey || random.url;
  if (random.type === 'reddit_video' && random.permalink) {
    const enhancedDownload = await resolveRedditVideoDownload(random.permalink);
    if (enhancedDownload) {
      random.downloadUrl = enhancedDownload;
    }
  }
  sentMemes.add(identifier);
  if (sentMemes.size > MAX_HISTORY) {
    const arr = Array.from(sentMemes);
    sentMemes.clear();
    arr.slice(-MAX_HISTORY).forEach(u => sentMemes.add(u));
  }
  return random;
}

async function downloadToDiscordAttachment(meme) {
  const { downloadUrl, type } = meme;
  if (!downloadUrl) {
    throw new Error('Aucune URL téléchargeable disponible pour ce meme');
  }

  const res = await axios.get(downloadUrl, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.reddit.com' }
  });
  const urlPath = new URL(downloadUrl).pathname;
  let ext = path.extname(urlPath);
  if (!ext) ext = type === 'video' || type === 'reddit_video' ? '.mp4' : '.png';
  const filename = `meme${ext}`;
  return { attachment: Buffer.from(res.data), name: filename };
}

module.exports = { fetchRandomMeme, downloadToDiscordAttachment };
