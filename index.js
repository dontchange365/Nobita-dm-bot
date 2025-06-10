const express = require('express');
const puppeteer = require('puppeteer-core'); // Changed from puppeteer
const chrome = require('chrome-aws-lambda'); // Added

const app = express();

app.get('/auto-dm', async (req, res) => {
  const INSTA_USERNAME = process.env.INSTA_USERNAME || 'YOUR_USERNAME'; // REPLACE with your actual username or use ENV
  const INSTA_PASSWORD = process.env.INSTA_PASSWORD || 'YOUR_PASSWORD'; // REPLACE with your actual password or use ENV

  if (INSTA_USERNAME === 'YOUR_USERNAME' || INSTA_PASSWORD === 'YOUR_PASSWORD') {
      return res.status(400).send('Please set INSTA_USERNAME and INSTA_PASSWORD environment variables or replace placeholders in index.js.');
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: [...chrome.args, '--hide-scrollbars', '--disable-web-security'], // Use chrome-aws-lambda args
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath, // Use chrome-aws-lambda's executable path
      headless: chrome.headless, // Use chrome-aws-lambda's headless setting (true)
      ignoreHTTPSErrors: true
    });
    const page = await browser.newPage();

    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });
    await page.type('input[name="username"]', INSTA_USERNAME, { delay: 100 });
    await page.type('input[name="password"]', INSTA_PASSWORD, { delay: 100 });

    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]') // Common selector for login button
    ]);

    if (page.url().includes('/accounts/login/')) {
        console.error('Login failed, check username/password or if Instagram requires verification.');
        return res.status(401).send('Login failed. Check your Instagram credentials or if Instagram is asking for verification (e.g., OTP).');
    }

    await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'networkidle2' });

    await page.waitForSelector('div[role="button"][tabindex="0"]', { timeout: 10000 });
    const firstChat = await page.$('div[role="button"][tabindex="0"]');
    if (firstChat) {
        await firstChat.click();
    } else {
        console.warn('No chat found to click. It might be empty inbox or selector changed.');
        return res.status(404).send('No active chat found to send a message. Make sure you have at least one conversation in your inbox.');
    }

    await page.waitForSelector('textarea[placeholder="Message..."]', { timeout: 10000 });
    await page.type('textarea[placeholder="Message..."]', 'Auto reply from Nobita 🤖, via Render deployment!', { delay: 50 });
    await page.keyboard.press('Enter');

    res.send('Message sent successfully to the first chat!');

  } catch (error) {
    console.error('Error during automation:', error);
    res.status(500).send(`An error occurred: ${error.message}. Check logs.`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot Server Running on port ${PORT}`));