const { GatewayIntentBits } = require('discord.js');

module.exports = {
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  CACHE_TTL: 5 * 60 * 1000,
  triggers: new Set([
    "ta gueule", "toi ta gueule", "nan toi ta gueule", "non toi ta gueule",
    "toi tg", "nan toi tg", "non toi tg", "vos gueules", "vos gueule",
    "tg", "ftg", "ferme ta gueule"
  ]),
  TOP_TIMES: ['day', 'week', 'month', 'year', 'all'],
  MEME_METHODS: ['hot', 'new', 'rising', 'top'],
  subredditsMemes: [
    'Discordmemes','shitposting','okbuddyretard','doodoofard',
    'DeepFriedMemes','MemeMan', 'cursedcomments'
  ]
};
