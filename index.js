const puppeteer = require("puppeteer");

(async () => {
  const websites = [
    { url: "https://example.com", type: "siteA", description: "Coop Mart" },
    { url: "https://example2.com", type: "siteB" },
    { url: "https://example3.com", type: "siteC" },
  ];

  // Site-specific rules
  const scrapingRules = {
    siteA: {
      chooseRegion: {
        city: "#modal-body div:nth-child(1) select",
        district: "#modal-body div:nth-child(2) select",
        ward: "#modal-body div:nth-child(3) select",
        branch: "#modal-body div:nth-child(4) select",
        submit: "#modal-body button",
      },
      description: 'meta[name="description"]',
      content: ".main-content p",
    },
    siteB: {
      chooseRegion: ".article-title",
      description: 'meta[property="og:description"]',
      content: ".post-body p",
    },
    siteC: {
      chooseRegion: ".header h2",
      description: 'meta[name="summary"]',
      content: ".content-section p",
    },
  };

  const browser = await puppeteer.launch({ headless: true });

  let results = [];

  for (let site of websites) {
    const page = await browser.newPage();
    console.log(`Scraping: ${site.url}`);

    try {
      await page.goto(site.url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      // Extract data based on the site type
      let data = await scrapePage(page, scrapingRules[site.type]);
      results.push({ url: site.url, ...data });
    } catch (error) {
      console.error(`Error scraping ${site.url}:`, error);
      results.push({ url: site.url, error: error.message });
    }

    await page.close();
  }

  await browser.close();

  console.log("Scraping completed:", results);
})();

// Function to extract data dynamically based on selectors
async function scrapePage(page, rules) {
  return await page.evaluate((rules) => {
    const getText = (selector) =>
      document.querySelector(selector)?.innerText || "N/A";
    const getMetaContent = (selector) =>
      document.querySelector(selector)?.content || "N/A";

    return {
      title: getText(rules.title),
      description: getMetaContent(rules.description),
      content: getText(rules.content),
    };
  }, rules);
}
