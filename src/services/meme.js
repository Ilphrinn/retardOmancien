const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { randomItem, createTimedCache } = require('../utils');
const { MEME_METHODS, TOP_TIMES, subredditsMemes } = require('../config');
const { getTop, getHot, getNew, getRising } = require('./reddit');

const subredditCache = createTimedCache(5 * 60 * 1000);
const redditAudioUrlCache = createTimedCache(60 * 60 * 1000);
const sentMemes = new Set();
const MAX_HISTORY = 200;
const MIN_SCORE = 5;
const NO_AUDIO = Symbol('no_audio');
const AUDIO_FILENAME_CANDIDATES = ['DASH_audio.mp4', 'DASH_AUDIO_128.mp4', 'DASH_AUDIO_64.mp4', 'DASH_AUDIO_96.mp4'];

async function fetchFromReddit(sub, method, time) {
  if (method === 'top') return getTop(sub, time, 100);
  if (method === 'hot') return getHot(sub, 100);
  if (method === 'new') return getNew(sub, 100);
  if (method === 'rising') return getRising(sub, 100);
  return getHot(sub, 100);
}

function buildCandidateUrl(fallbackUrl, filename) {
  const u = new URL(fallbackUrl);
  const dir = u.pathname.replace(/\/[^/]+$/, '');
  return `${u.origin}${dir}/${filename}`;
}

async function findRedditAudioUrl(fallbackUrl) {
  const cached = redditAudioUrlCache.get(fallbackUrl);
  if (cached) return cached === NO_AUDIO ? null : cached;

  for (const filename of AUDIO_FILENAME_CANDIDATES) {
    const candidateUrl = buildCandidateUrl(fallbackUrl, filename);
    try {
      const res = await axios.head(candidateUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.reddit.com' },
        validateStatus: status => status === 200
      });
      if (res.status === 200) {
        redditAudioUrlCache.set(fallbackUrl, candidateUrl);
        return candidateUrl;
      }
    } catch {
      // ce candidat n'existe pas, on essaie le suivant
    }
  }

  redditAudioUrlCache.set(fallbackUrl, NO_AUDIO);
  return null;
}

async function fetchRandomMeme({ allowNsfw = false } = {}) {
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

  const medias = postsArray
    .filter(post =>
      !post.stickied &&
      post.author !== '[deleted]' &&
      !post.removed_by_category &&
      (post.score || 0) >= MIN_SCORE &&
      (allowNsfw || !post.over_18)
    )
    .map(post => {
      const url = post.url || '';

      if (post.is_video && post.media?.reddit_video?.fallback_url) {
        const fallbackUrl = post.media.reddit_video.fallback_url;
        return {
          type: 'reddit_video',
          url: url || (post.permalink ? `https://www.reddit.com${post.permalink}` : fallbackUrl),
          downloadUrl: fallbackUrl,
          cacheKey: fallbackUrl,
          title: post.title,
          subreddit: sub,
          score: post.score || 0
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
          subreddit: sub,
          score: post.score || 0
        };
      }

      if (/\.(mp4)$/.test(url)) {
        return {
          type: 'video',
          url,
          downloadUrl: url,
          cacheKey: url,
          title: post.title,
          subreddit: sub,
          score: post.score || 0
        };
      }

      if (/\.(jpg|jpeg|png|gif)$/.test(url)) {
        return {
          type: 'image',
          url,
          downloadUrl: url,
          cacheKey: url,
          title: post.title,
          subreddit: sub,
          score: post.score || 0
        };
      }

      return null;
    })
    .filter(Boolean)
    .filter(m => !sentMemes.has(m.cacheKey || m.url));

  if (medias.length === 0) return null;

  medias.sort((a, b) => b.score - a.score);
  const topPoolSize = Math.max(5, Math.ceil(medias.length * 0.5));
  const random = randomItem(medias.slice(0, topPoolSize));

  const identifier = random.cacheKey || random.url;
  if (random.type === 'reddit_video') {
    random.audioUrl = await findRedditAudioUrl(random.downloadUrl);
  }
  sentMemes.add(identifier);
  if (sentMemes.size > MAX_HISTORY) {
    const arr = Array.from(sentMemes);
    sentMemes.clear();
    arr.slice(-MAX_HISTORY).forEach(u => sentMemes.add(u));
  }
  return random;
}

async function downloadBuffer(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.reddit.com' }
  });
  return Buffer.from(res.data);
}

async function muxVideoAudio(videoBuffer, audioBuffer) {
  const id = crypto.randomUUID();
  const videoPath = path.join(os.tmpdir(), `${id}_v.mp4`);
  const audioPath = path.join(os.tmpdir(), `${id}_a.mp4`);
  const outputPath = path.join(os.tmpdir(), `${id}_out.mp4`);

  await fs.promises.writeFile(videoPath, videoBuffer);
  await fs.promises.writeFile(audioPath, audioBuffer);

  try {
    await new Promise((resolve, reject) => {
      execFile('ffmpeg', [
        '-y',
        '-i', videoPath,
        '-i', audioPath,
        '-c', 'copy',
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-movflags', '+faststart',
        outputPath
      ], (err) => (err ? reject(err) : resolve()));
    });
    return await fs.promises.readFile(outputPath);
  } finally {
    await Promise.all(
      [videoPath, audioPath, outputPath].map(p => fs.promises.unlink(p).catch(() => {}))
    );
  }
}

async function downloadToDiscordAttachment(meme) {
  const { downloadUrl, type } = meme;
  if (!downloadUrl) {
    throw new Error('Aucune URL téléchargeable disponible pour ce meme');
  }

  let buffer;
  if (type === 'reddit_video' && meme.audioUrl) {
    try {
      const [videoBuffer, audioBuffer] = await Promise.all([
        downloadBuffer(downloadUrl),
        downloadBuffer(meme.audioUrl)
      ]);
      buffer = await muxVideoAudio(videoBuffer, audioBuffer);
    } catch (err) {
      console.warn('Echec de la fusion audio/vidéo, envoi de la vidéo sans son :', err?.message || err);
      buffer = await downloadBuffer(downloadUrl);
    }
  } else {
    buffer = await downloadBuffer(downloadUrl);
  }

  const urlPath = new URL(downloadUrl).pathname;
  let ext = path.extname(urlPath);
  if (!ext) ext = type === 'video' || type === 'reddit_video' ? '.mp4' : '.png';
  const filename = `meme${ext}`;
  return { attachment: buffer, name: filename };
}

module.exports = { fetchRandomMeme, downloadToDiscordAttachment };
