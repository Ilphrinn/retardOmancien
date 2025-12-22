/**
 * ============================================
 * UTILITAIRES GÉNÉRAUX
 * ============================================
 */

/**
 * Découpe un message en morceaux pour respecter les limites Discord
 * @param {string} str - Le texte à découper
 * @param {number} size - Taille maximale par morceau (défaut: 2000)
 * @returns {string[]} - Tableau de morceaux
 */
function splitMessage(str, size = 2000) {
  const parts = [];
  for (let i = 0; i < str.length; i += size) {
    parts.push(str.slice(i, i + size));
  }
  return parts;
}

/**
 * Récupère un élément aléatoire d'un tableau
 * @param {Array} arr - Le tableau source
 * @returns {*} - Un élément aléatoire
 */
const randomItem = arr => arr[Math.floor(Math.random() * arr.length)];

/**
 * Acknowledge une interaction sans message visible
 * @param {Interaction} interaction - L'interaction Discord
 */
async function acknowledge(interaction) {
  await interaction.deferReply({ ephemeral: true });
  await interaction.deleteReply();
}

/**
 * Crée un cache avec expiration temporelle
 * @param {number} ttlMs - Durée de vie en millisecondes
 * @returns {Object} - Objet cache avec get/set/clear
 */
function createTimedCache(ttlMs) {
  const map = new Map();
  return {
    get(key) {
      const hit = map.get(key);
      if (!hit) return null;
      if (Date.now() - hit.timestamp > ttlMs) {
        map.delete(key);
        return null;
      }
      return hit.value;
    },
    set(key, value) {
      map.set(key, { timestamp: Date.now(), value });
    },
    clear() {
      map.clear();
    }
  };
}

/**
 * Met en majuscule la première lettre d'une chaîne
 * @param {string} str - La chaîne à capitaliser
 * @returns {string} - Chaîne capitalisée
 */
const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * ============================================
 * LOGGER SIMPLE
 * ============================================
 */

const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  debug: (...args) => console.log('[DEBUG]', ...args)
};

/**
 * ============================================
 * EXPORTS
 * ============================================
 */

module.exports = {
  splitMessage,
  randomItem,
  acknowledge,
  createTimedCache,
  capitalize,
  logger
};
