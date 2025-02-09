// @ts-check

const puppeteer = require("puppeteer");

/**
 * Opens a new page and navigates to a given link.
 * @param {import('puppeteer').Browser} browser - The Puppeteer browser instance.
 * @returns {Promise<void>} - A promise that resolves when the page has loaded.
 */
const browseMarket = async (browser, link) => {
  const page = await browser.newPage();

  await page.goto(link.start);
};
