const puppeteer = require("puppeteer");

(async () => {
  // Launch a new browser instance
  const browser = await puppeteer.launch({ headless: false }); // Set to false to see the browser
  const page = await browser.newPage();

  // Navigate to a website
  await page.goto("https://example.com", { waitUntil: "load", timeout: 0 });

  // Take a screenshot
  await page.screenshot({ path: "screenshot.png", fullPage: true });

  console.log("Screenshot taken!");

  // Extract the title of the page
  const title = await page.title();
  console.log("Page Title:", title);

  // Close the browser
  await browser.close();
})();
