const puppeteer = require('puppeteer');

async function fetchRandomAscii(maxTries = 5, maxPages = 53) {
  let attempt = 0;
  let values = [];

  while (values.length === 0 && attempt < maxTries) {
    attempt++;
    const randomPage = Math.floor(Math.random() * maxPages) + 1;
    const url = `https://www.twitchquotes.com/copypastas/ascii-art?page=${randomPage}`;
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0");
    await page.goto(url, { waitUntil: "domcontentloaded" });

    try {
      await page.waitForSelector('button.copy_to_clipboard_js', { timeout: 5000 });
      values = await page.$$eval('button.copy_to_clipboard_js', buttons =>
        buttons.map(btn => btn.getAttribute("data-clipboard-text")?.trim()).filter(t => t && t.length > 30)
      );
    } catch (_) { /* ignore */ }
    await browser.close();
  }

  return values.length ? values[Math.floor(Math.random()*values.length)] : null;
}

module.exports = { fetchRandomAscii };
