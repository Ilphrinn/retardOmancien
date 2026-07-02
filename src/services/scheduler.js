const fs = require('fs');
const path = require('path');

const CHANNEL_ID = process.env.WEEKLY_CHANNEL_ID;
const VIDEO_PATH = process.env.WEEKLY_VIDEO_PATH || path.join(__dirname, '..', '..', 'ressources', 'mercredi.mp4');
const CHECK_INTERVAL_MS = 30 * 1000;

function getParisParts(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  return map;
}

async function sendWeeklyVideo(client) {
  if (!fs.existsSync(VIDEO_PATH)) {
    console.error(`❌ Vidéo hebdomadaire introuvable : ${VIDEO_PATH}`);
    return;
  }
  const channel = await client.channels.fetch(CHANNEL_ID);
  await channel.send({ files: [{ attachment: VIDEO_PATH, name: path.basename(VIDEO_PATH) }] });
  console.log('✅ Vidéo hebdomadaire envoyée.');
}

function scheduleWeeklyVideo(client) {
  if (!CHANNEL_ID) {
    console.warn('⚠️ WEEKLY_CHANNEL_ID non défini : envoi hebdomadaire de la vidéo désactivé.');
    return;
  }

  let lastTriggeredKey = null;

  setInterval(() => {
    const now = new Date();
    const { weekday, hour, minute } = getParisParts(now);
    if (weekday !== 'Wed' || hour !== '00' || minute !== '01') return;

    const key = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
    if (lastTriggeredKey === key) return;
    lastTriggeredKey = key;

    sendWeeklyVideo(client).catch(err =>
      console.error('❌ Erreur lors de l’envoi de la vidéo hebdomadaire :', err)
    );
  }, CHECK_INTERVAL_MS);

  console.log(`🕐 Envoi hebdomadaire programmé chaque mercredi à 00:01 (Europe/Paris) dans le salon ${CHANNEL_ID}.`);
}

module.exports = { scheduleWeeklyVideo };
