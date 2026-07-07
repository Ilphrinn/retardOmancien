const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://knowyourmeme.com';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
const REQUEST_TIMEOUT = 2000;

async function findTopResult(query) {
  const { data } = await axios.get(`${BASE_URL}/search`, {
    params: { q: query },
    headers: HEADERS,
    timeout: REQUEST_TIMEOUT
  });

  const $ = cheerio.load(data);
  const top = $('a.item[data-title]').first();
  if (top.length === 0) return null;

  const href = top.attr('href');
  if (!href) return null;

  return {
    title: top.attr('data-title'),
    url: href.startsWith('http') ? href : `${BASE_URL}${href}`
  };
}

async function findRandomResult() {
  const { data } = await axios.get(`${BASE_URL}/memes/popular`, {
    headers: HEADERS,
    timeout: REQUEST_TIMEOUT
  });

  const $ = cheerio.load(data);
  const items = $('a.item[data-title]').toArray();
  if (items.length === 0) return null;

  const el = $(items[Math.floor(Math.random() * items.length)]);
  const href = el.attr('href');
  if (!href) return null;

  return {
    title: el.attr('data-title'),
    url: href.startsWith('http') ? href : `${BASE_URL}${href}`
  };
}

async function fetchSummary(url) {
  const { data } = await axios.get(url, { headers: HEADERS, timeout: REQUEST_TIMEOUT });
  const $ = cheerio.load(data);

  const description = $('meta[name="description"]').attr('content');
  const title = $('meta[property="og:title"]').attr('content')?.replace(/\s*\|\s*Know Your Meme\s*$/i, '');
  const image = $('meta[property="og:image"]').attr('content');

  if (!description) return null;
  return { title: title || null, summary: description.trim(), image: image || null };
}

async function lookupMeme(query) {
  try {
    const top = await findTopResult(query);
    if (!top) return null;

    const details = await fetchSummary(top.url);
    if (!details) return null;

    return {
      title: details.title || top.title,
      summary: details.summary,
      url: top.url
    };
  } catch (err) {
    console.warn('Echec recherche KnowYourMeme :', err?.message || err);
    return null;
  }
}

async function getMemeFact(query) {
  try {
    const top = query ? await findTopResult(query) : await findRandomResult();
    if (!top) return null;

    const details = await fetchSummary(top.url);
    if (!details) return null;

    return {
      title: details.title || top.title,
      summary: details.summary,
      url: top.url,
      image: details.image
    };
  } catch (err) {
    console.warn('Echec récupération fact KnowYourMeme :', err?.message || err);
    return null;
  }
}

module.exports = { lookupMeme, getMemeFact };
