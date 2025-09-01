import * as cheerio from "cheerio";
import puppeteerExtra from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import chromium from "@sparticuz/chromium";
import fs from "fs";
import path from "path";

async function searchGoogleMaps() {
  try {
    const start = Date.now();

    puppeteerExtra.use(stealthPlugin());

    const browser = await puppeteerExtra.launch({
      headless: false,
      // headless: "new",
      // devtools: true,
      executablePath: "", // your path here
    });

    // const browser = await puppeteerExtra.launch({
    //   args: chromium.args,
    //   defaultViewport: chromium.defaultViewport,
    //   executablePath: await chromium.executablePath(),
    //   headless: "new",
    //   ignoreHTTPSErrors: true,
    // });

    const page = await browser.newPage();

    // Get search query from command line arguments or use default
    const query = process.argv[2] || "balangoda shops";

    try {
      await page.goto(
        `https://www.google.com/maps/search/${query.split(" ").join("+")}`
      );
      
      // Wait for page to fully load and dynamic content to appear
      await page.waitForTimeout(5000);
      
      // Wait for business listings to load
      await page.waitForSelector('div[role="feed"]', { timeout: 15000 });
      
      // Scroll down to load more results
      await page.evaluate(() => {
        const feed = document.querySelector('div[role="feed"]');
        if (feed) {
          feed.scrollTop = feed.scrollHeight;
        }
      });
      
      // Wait a bit more for additional content to load
      await page.waitForTimeout(2000);
    } catch (error) {
      console.log("error going to page");
    }

    async function autoScroll(page) {
      await page.evaluate(async () => {
        const wrapper = document.querySelector('div[role="feed"]');

        await new Promise((resolve, reject) => {
          var totalHeight = 0;
          var distance = 1000;
          var scrollDelay = 3000;

          var timer = setInterval(async () => {
            var scrollHeightBefore = wrapper.scrollHeight;
            wrapper.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeightBefore) {
              totalHeight = 0;
              await new Promise((resolve) => setTimeout(resolve, scrollDelay));

              // Calculate scrollHeight after waiting
              var scrollHeightAfter = wrapper.scrollHeight;

              if (scrollHeightAfter > scrollHeightBefore) {
                // More content loaded, keep scrolling
                return;
              } else {
                // No more content loaded, stop scrolling
                clearInterval(timer);
                resolve();
              }
            }
          }, 200);
        });
      });
    }

    await autoScroll(page);

    const html = await page.content();
    const pages = await browser.pages();
    await Promise.all(pages.map((page) => page.close()));

    await browser.close();
    console.log("browser closed");

    // get all a tag parent where a tag href includes /maps/place/
    const $ = cheerio.load(html);
    const aTags = $("a");
    const parents = [];
    aTags.each((i, el) => {
      const href = $(el).attr("href");
      if (!href) {
        return;
      }
      if (href.includes("/maps/place/")) {
        parents.push($(el).parent());
      }
    });

    console.log("parents", parents.length);

    const buisnesses = [];

    parents.forEach((parent) => {
      const url = parent.find("a").attr("href");
      // get a tag where data-value="Website"
      const website = parent.find('a[data-value="Website"]').attr("href");
      // find a div that includes the class fontHeadlineSmall
      const storeName = parent.find("div.fontHeadlineSmall").text();
      // find span that includes class fontBodyMedium
      const ratingText = parent
        .find("span.fontBodyMedium > span")
        .attr("aria-label");

      // get the first div that includes the class fontBodyMedium
      const bodyDiv = parent.find("div.fontBodyMedium").first();
      const children = bodyDiv.children();
      const lastChild = children.last();
      const firstOfLast = lastChild.children().first();
      const lastOfLast = lastChild.children().last();

      // Enhanced phone number extraction with multiple strategies
      let phoneNumber = lastOfLast?.text()?.split("·")?.[1]?.trim();
      if (!phoneNumber || phoneNumber === "N/A") {
        // Strategy 1: Look for phone buttons
        const phoneButton = parent.find('button[data-item-id*="phone"], button[aria-label*="phone"], button[title*="phone"]');
        if (phoneButton.length > 0) {
          phoneNumber = phoneButton.first().attr('aria-label')?.replace(/[^\d+\-\(\)\s]/g, '').trim() || 
                       phoneButton.first().attr('title')?.replace(/[^\d+\-\(\)\s]/g, '').trim();
        }
        
        // Strategy 2: Look for phone links
        if (!phoneNumber || phoneNumber === "N/A") {
          const phoneLink = parent.find('a[href*="tel:"], a[aria-label*="phone"]');
          if (phoneLink.length > 0) {
            phoneNumber = phoneLink.first().attr('href')?.replace('tel:', '').trim() || 
                         phoneLink.first().attr('aria-label')?.replace(/[^\d+\-\(\)\s]/g, '').trim();
          }
        }
        
        // Strategy 3: Look for phone text in various elements
        if (!phoneNumber || phoneNumber === "N/A") {
          const phoneText = parent.find('span, div, p').filter(function() {
            const text = $(this).text();
            return /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(text) || /\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/.test(text);
          });
          if (phoneText.length > 0) {
            phoneNumber = phoneText.first().text().trim();
          }
        }
      }

      // Enhanced website extraction with multiple strategies
      let businessWebsite = website;
      if (!businessWebsite || businessWebsite === "N/A") {
        // Strategy 1: Look for website buttons
        const websiteButton = parent.find('button[data-value="Website"], button[aria-label*="website"], button[title*="website"]');
        if (websiteButton.length > 0) {
          businessWebsite = websiteButton.first().attr('aria-label') || websiteButton.first().attr('title');
        }
        
        // Strategy 2: Look for website links
        if (!businessWebsite || businessWebsite === "N/A") {
          const websiteLink = parent.find('a[href*="http"], a[aria-label*="website"], a[title*="website"]');
          if (websiteLink.length > 0) {
            const href = websiteLink.first().attr('href');
            if (href && !href.includes('google.com/maps')) {
              businessWebsite = href;
            }
          }
        }
        
        // Strategy 3: Look for website text
        if (!businessWebsite || businessWebsite === "N/A") {
          const websiteText = parent.find('span, div, p').filter(function() {
            const text = $(this).text();
            return /https?:\/\/[^\s]+/.test(text) && !text.includes('google.com/maps');
          });
          if (websiteText.length > 0) {
            businessWebsite = websiteText.first().text().trim();
          }
        }
      }

      buisnesses.push({
        placeId: `ChI${url?.split("?")?.[0]?.split("ChI")?.[1]}`,
        address: firstOfLast?.text()?.split("·")?.[1]?.trim(),
        category: firstOfLast?.text()?.split("·")?.[0]?.trim(),
        phone: phoneNumber || "N/A",
        googleUrl: url,
        bizWebsite: businessWebsite || "N/A",
        storeName,
        ratingText,
        stars: ratingText?.split("stars")?.[0]?.trim()
          ? Number(ratingText?.split("stars")?.[0]?.trim())
          : null,
        numberOfReviews: ratingText
          ?.split("stars")?.[1]
          ?.replace("Reviews", "")
          ?.trim()
          ? Number(
              ratingText?.split("stars")?.[1]?.replace("Reviews", "")?.trim()
            )
          : null,
      });
    });
    const end = Date.now();

    console.log(`time in seconds ${Math.floor((end - start) / 1000)}`);

    return buisnesses;
  } catch (error) {
    console.log("error at googleMaps", error.message);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    // Get search query from command line arguments or use default
    const searchQuery = process.argv[2] || "balangoda shops";
    
    console.log("Starting Google Maps scraper...");
    console.log(`Searching for: "${searchQuery}"`);
    const results = await searchGoogleMaps();
    console.log("Scraping completed successfully!");
    console.log(`Found ${results?.length || 0} businesses`);
    
    if (results && results.length > 0) {
      console.log("\nAll scraped results:");
      results.forEach((business, index) => {
        console.log(`\n${index + 1}. ${business.storeName}`);
        console.log(`   Rating: ${business.stars} stars (${business.numberOfReviews} reviews)`);
        console.log(`   Category: ${business.category}`);
        console.log(`   Address: ${business.address}`);
        console.log(`   Phone: ${business.phone || 'N/A'}`);
        console.log(`   Website: ${business.bizWebsite || 'N/A'}`);
        console.log(`   Google Maps: ${business.googleUrl || 'N/A'}`);
        console.log(`   Place ID: ${business.placeId || 'N/A'}`);
      });
      
      // Display summary statistics
      console.log("\n" + "=".repeat(60));
      console.log("SUMMARY STATISTICS");
      console.log("=".repeat(60));
      
      const totalBusinesses = results.length;
      const businessesWithRating = results.filter(b => b.stars !== null).length;
      const businessesWithPhone = results.filter(b => b.phone).length;
      const businessesWithWebsite = results.filter(b => b.bizWebsite).length;
      
      console.log(`Total businesses found: ${totalBusinesses}`);
      console.log(`Businesses with ratings: ${businessesWithRating}`);
      console.log(`Businesses with phone numbers: ${businessesWithPhone}`);
      console.log(`Businesses with websites: ${businessesWithWebsite}`);
      
      if (businessesWithRating > 0) {
        const avgRating = results.reduce((sum, b) => sum + (b.stars || 0), 0) / businessesWithRating;
        console.log(`Average rating: ${avgRating.toFixed(1)} stars`);
      }
      
      // Save results to JSON file
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `google-maps-results-${timestamp}.json`;
        const filepath = path.join(process.cwd(), filename);
        
        const dataToSave = {
          searchQuery: searchQuery,
          timestamp: new Date().toISOString(),
          totalResults: results.length,
          results: results
        };
        
        fs.writeFileSync(filepath, JSON.stringify(dataToSave, null, 2));
        console.log(`\nResults saved to: ${filename}`);
      } catch (saveError) {
        console.log(`\nWarning: Could not save results to file: ${saveError.message}`);
      }
    }
  } catch (error) {
    console.error("Failed to run scraper:", error.message);
    process.exit(1);
  }
}

// Run the main function
main();