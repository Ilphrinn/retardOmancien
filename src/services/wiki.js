const axios = require('axios');

async function searchFirstLink(query) {
  const { data } = await axios.get('https://fr.wikipedia.org/w/api.php', {
    params: { action: 'query', list: 'search', srsearch: query, format: 'json' },
  });
  const results = data?.query?.search;
  if (!results || results.length === 0) return null;
  const page = results[0];
  return `https://fr.wikipedia.org/wiki/${page.title.replace(/ /g, '_')}`;
}

async function searchAnyLinkFromCorpus(corpus) {
  const text = corpus.toLowerCase();
  const words = text.match(/[a-zà-ÿ]+/g);
  if (!words) return null;
  const freq = words.reduce((a,w)=>((a[w]=(a[w]||0)+1),a),{});
  const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([w])=>w);
  if (top.length===0) return null;
  const keyword = top[Math.floor(Math.random()*top.length)];
  return searchFirstLink(keyword);
}

module.exports = { searchFirstLink, searchAnyLinkFromCorpus };
