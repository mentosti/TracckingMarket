const puppeteer = require("puppeteer");
const fs = require("fs");

(async () => {
  const websites = [
    {
      url: "https://cooponline.vn/groups/bo-va-thit-cac-loai/",
      type: "coop",
      description: "Coop Mart",
    },
  ];

  const scrapingRules = {
    coop: {
      chooseRegion: {
        city: "#modal-body div:nth-child(1) select",
        district: "#modal-body div:nth-child(2) select",
        ward: "#modal-body div:nth-child(3) select",
        branch: "#modal-body div:nth-child(4) select",
        submit: "#modal-body button",
      },
      item: {
        name: "h4.title_product_lmh",
        price: ".price > span",
        unit: "đ",
        priceSep: ",",
      },
    },
  };

  const browser = await puppeteer.launch({ headless: false });

  let results = [];

  for (let site of websites) {
    const page = await browser.newPage();
    console.log(`Scraping: ${site.url}`);

    try {
      await page.goto(site.url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      // const data = [];
      const branchMap = new Map();
      const rules = scrapingRules[site.type];
      // CHOOSE REGION
      // CITY
      let cities = await page.evaluate((rules) => {
        const citySelectElement = document.querySelector(
          rules.chooseRegion.city
        );

        return Array.from(citySelectElement.options).map((option) => ({
          value: option.value,
          text: option.text.trim(),
        }));
      }, rules);

      // DISTRICT
      for (const city of cities) {
        await page.select(rules.chooseRegion.city, city.value);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        let districts = await page.evaluate((rules) => {
          const districtSelectElement = document.querySelector(
            rules.chooseRegion.district
          );

          return Array.from(districtSelectElement.options)
            .filter((option) => option.value !== "0")
            .map((option) => ({
              value: option.value,
              text: option.text.trim(),
            }));
        }, rules);

        for (const district of districts) {
          await page.select(rules.chooseRegion.district, district.value);
          await new Promise((resolve) => setTimeout(resolve, 2000));

          let wards = await page.evaluate((rules) => {
            const wardSelectElement = document.querySelector(
              rules.chooseRegion.ward
            );

            return Array.from(wardSelectElement.options)
              .filter((option) => option.value !== "0")
              .map((option) => ({
                value: option.value,
                text: option.text.trim(),
              }));
          }, rules);

          for (const ward of wards) {
            await page.select(rules.chooseRegion.ward, ward.value);
            await new Promise((resolve) => setTimeout(resolve, 2000));

            let branches = await page.evaluate((rules) => {
              const branchSelectElement = document.querySelector(
                rules.chooseRegion.branch
              );

              return Array.from(branchSelectElement.options)
                .filter((option) => option.value !== "0")
                .map((option) => ({
                  value: option.value,
                  text: option.text.trim(),
                }));
            }, rules);

            for (let branch of branches) {
              let { text, value } = branch;
              if (!branchMap.has(text)) {
                branchMap.set(text, {
                  value: value,
                  text: text,
                  locations: [ward.text],
                });
              } else {
                branchMap.get(text).locations.push(ward.text);
              }
              branch = branchMap.get(text);
            }

            ward.branches = branches;
          }

          district.wards = wards;
        }

        city.districts = districts;

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Extract data based on the site type
      // let data = await scrapePage(page, scrapingRules[site.type]);
      // results.push({ url: site.url, ...data });
      // console.log(cities);
      fs.writeFileSync("data.json", JSON.stringify(cities), "utf8");
    } catch (error) {
      console.error(`Error scraping ${site.url}:`, error);
      // results.push({ url: site.url, error: error.message });
    }

    await page.close();
  }

  await browser.close();

  console.log("Scraping completed:", results);
})();

async function scrapePage(page, rules) {
  return await page.evaluate((rules) => {
    // CITY
    const citySelectElement = document.querySelector(rules.chooseRegion.city);
    const branchSet = new Set();

    const cityOptions = Array.from(citySelectElement.options).map((option) => ({
      value: option.value,
      text: option.text.trim(),
    }));

    // DISTRICT
    cityOptions.forEach((co) => {
      citySelectElement.value = co.value;

      const districtSelectElement = document.querySelector(
        rules.chooseRegion.district
      );
      const districtOptions = Array.from(districtSelectElement.options)
        .filter((option) => option.value != 0)
        .map((option) => ({
          value: option.value,
          text: option.text.trim(),
        }));

      // WARD
      districtOptions.forEach((dOp) => {
        districtSelectElement.value = dOp.value;

        const wardSelectElement = document.querySelector(
          rules.chooseRegion.ward
        );
        const wardOptions = Array.from(wardSelectElement.options)
          .filter((option) => option.value != 0)
          .map((option) => ({
            value: option.value,
            text: option.text.trim(),
          }));

        // BRANCH
        wardOptions.forEach((wo) => {
          branchSelectElement.value = wo.value;

          const branchSelectElement = document.querySelector(
            rules.chooseRegion.branch
          );
          const branchOptions = Array.from(branchSelectElement.options)
            .filter((option) => option.value != 0)
            .forEach((option) => {
              const trimmedText = option.text.trim();
              const value = option.value;

              if (!branchMap.has(trimmedText)) {
                branchMap.set(trimmedText, {
                  value: value,
                  text: trimmedText,
                  location: [wo.text],
                });
              } else {
                branchMap.get(trimmedText).location.push(wo.text);
              }
            });

          wo.branches = branchOptions;
        });

        dOp.wards = wardOptions;
      });

      co.districts = districtOptions;
    });

    return cityOptions;
  }, rules);
}
