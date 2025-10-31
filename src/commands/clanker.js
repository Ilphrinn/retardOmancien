const path = require('path');

module.exports = async function clanker(message) {
  try {
    const imgPath = path.join(__dirname, '..', '..', 'ressources', 'clanker.png');
    await message.reply({ files: [imgPath] });
  } catch (err) {
    console.error("Erreur en envoyant l'image clanker:", err);
    try { await message.reply("Gnnneeeuuuuu j'arriv pu a t'insulter tes morts"); } catch (_) {}
  }
};
