const Snoowrap = require('snoowrap');
const { TOP_TIMES } = require('../config');

const reddit = new Snoowrap({
  userAgent: 'RaccoonFetcher/1.0 by Ilphrinn',
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD
});

async function getTop(sub, time = 'day', limit = 50) {
  return reddit.getSubreddit(sub).getTop({ time, limit });
}
async function getHot(sub, limit = 50)  { return reddit.getSubreddit(sub).getHot({ limit }); }
async function getNew(sub, limit = 50)  { return reddit.getSubreddit(sub).getNew({ limit }); }
async function getRising(sub, limit = 50){ return reddit.getSubreddit(sub).getRising({ limit }); }

module.exports = { reddit, getTop, getHot, getNew, getRising, TOP_TIMES };
