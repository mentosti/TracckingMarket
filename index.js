import puppeteer from "puppeteer";
import fs from "fs";
import pLimit from "p-limit";
import { timeout } from "puppeteer";

async function scrapeBranch(browser, city, district, ward, branch, rules, url) {
  const page = await browser.newPage();
  console.log(url);
  console.log(
    `Scraping: ${city.text}, ${district.text}, ${ward.text}, ${branch.text}`
  );

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 100000 });
  await page.setViewport({ width: 1280, height: 720 });
  // const chooseStore = await page.evaluate(() => {
  //   const store = document.querySelector("#chooseStore_Modal");
  //   return store ? window.getComputedStyle(store).display : "none";
  // });
  // if (chooseStore == "none" ) {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await page.click("ul.signin-link li:first-child a:first-child");
  // }
  await page.waitForSelector(rules.chooseRegion.city, { visible: true });

  // choose city
  await page.select(rules.chooseRegion.city, city.value);
  await new Promise((resolve) => setTimeout(resolve, 500));
  await page.select(rules.chooseRegion.district, district.value);
  await new Promise((resolve) => setTimeout(resolve, 500));
  await page.select(rules.chooseRegion.ward, ward.value);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // await page.evaluate(
  //   (rules, index) => {
  //     document.querySelector(rules.chooseRegion.branch).selectedIndex = index;
  //   },
  //   rules,
  //   branch.value
  // );
  // await page.waitForTimeout(500);
  await page.click("#modal-body div:nth-child(4) select");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  for (let index = 0; index < branch.value; index++) {
    await page.keyboard.press("ArrowDown");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  await page.keyboard.press("Enter");
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await page.click(rules.chooseRegion.submit);

  await new Promise((resolve) => setTimeout(resolve, 1500));
  // await page.waitForSelector(".products-list", { visible: true });
  await page.waitForSelector(".price-new", { visible: true, timeout: 100000 });
  // await page.waitForNavigation({ waitUntil: "networkidle2" });

  var items = await page.evaluate(() => {
    var itemsEle = document.querySelectorAll(".product-item-container");
    var items = [];
    for (const itemEle of itemsEle) {
      var itemPrice = itemEle.querySelector(".price-new").textContent.trim();
      var itemName = itemEle.querySelector("h4 > a").textContent.trim();

      items.push({ itemPrice, itemName });
    }
    return items;
  });
  console.log(items);

  await new Promise((resolve) => setTimeout(resolve, 2000));
  await page.close();
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

(async () => {
  const limit = pLimit(1);

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

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--use-gl=desktop", // Enable GPU acceleration
      "--disk-cache-dir=/tmp/cache", // Enable disk caching
      "--start-maximized", // Open window maximized
    ],
  });

  let results = [];

  const data = fs.readFileSync("data1.json", "utf8");
  const regions = JSON.parse(data);
  const type = "coop";
  const tasks = [];

  for (const city of regions) {
    for (const district of city.districts) {
      for (const ward of district.wards) {
        for (const branch of ward.branches) {
          // tasks.push(
          //   limit(() =>
          //     scrapeBranch(
          //       browser,
          //       city,
          //       district,
          //       ward,
          //       branch,
          //       scrapingRules[type],
          //       websites[0].url
          //     )
          //   )
          // );
          await scrapeBranch(
            browser,
            city,
            district,
            ward,
            branch,
            scrapingRules[type],
            websites[0].url
          );
        }
      }
    }
  }
  // await Promise.all(tasks);
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
