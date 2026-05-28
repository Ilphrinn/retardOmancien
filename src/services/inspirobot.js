const axios = require('axios');

async function fetchInspirobotImageUrl() {
  const response = await axios.get('https://inspirobot.me/api', {
    params: { generate: 'true' },
    responseType: 'text',
    timeout: 15000
  });

  const imageUrl = String(response.data || '').trim();
  if (!/^https?:\/\/.+/i.test(imageUrl)) {
    throw new Error('URL Inspirobot invalide');
  }

  return imageUrl;
}

module.exports = { fetchInspirobotImageUrl };
