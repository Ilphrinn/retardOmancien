const path = require('path');

module.exports = async function clanker(message) {
  try {
    const imgPath = path.join(__dirname, '..', '..', 'ressources', 'clanker.png');
    await message.channel.send({ files: [imgPath] });
  } catch (err) {
    console.error("Erreur en envoyant l'image clanker:", err);
    try { await message.channel.send("Impossible d'envoyer l'image clanker."); } catch (_) {}
  }
};