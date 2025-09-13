function splitMessage(str, size = 2000) {
  const parts = [];
  for (let i = 0; i < str.length; i += size) parts.push(str.slice(i, i + size));
  return parts;
}

const randomItem = arr => arr[Math.floor(Math.random() * arr.length)];

async function acknowledge(interaction) {
  await interaction.deferReply({ ephemeral: true });
  await interaction.deleteReply();
}

// petit cache clé -> { timestamp, value }
function createTimedCache(ttlMs) {
  const map = new Map();
  return {
    get(key) {
      const hit = map.get(key);
      if (!hit) return null;
      if (Date.now() - hit.timestamp > ttlMs) { map.delete(key); return null; }
      return hit.value;
    },
    set(key, value) { map.set(key, { timestamp: Date.now(), value }); },
    clear() { map.clear(); }
  };
}

const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

module.exports = {
  splitMessage,
  randomItem,
  acknowledge,
  createTimedCache,
  capitalize,
};