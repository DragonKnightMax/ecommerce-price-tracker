import axios from "axios";
import * as cheerio from "cheerio";
import { extractCurrency, extractDescription, extractPrice } from "../utils";

export async function scrapeAmazonProduct(url: string) {
  if (!url) return;

  const username = String(process.env.BRIGHT_DATA_USERNAME);
  const password = String(process.env.BRIGHT_DATA_PASSWORD);
  const port = 22225;
  const session_id = (1_000_000 * Math.random()) | 0;

  const options = {
    auth: {
      username: `${username}-session-${session_id}`,
      password, 
    }, 
    host: "brd.superproxy.io", 
    port,
    rejectUnauthorized: false,
  }

  try {
    // fetch product page
    const response = await axios.get(url, options);
    const $ = cheerio.load(response.data);

    // extract product title
    const title = $('#productTitle').text().trim();
    const currentPrice = extractPrice(
      $(".priceToPay span.a-price-whole"), 
      $(".a.size.base.a-color-price"),
      $(".a-button-selected .a-color-base"),
    );

    const originalPrice = extractPrice(
      $("#priceblock_ourprice"), 
      $(".a-price.a-text-price span.a-offscreen"), 
      $("#listPrice"), 
      $("#priceblock_dealprice"), 
      $(".a-size-base.a-color-price"),
    );

    const outOfStock = $("#availability span").text().trim().toLowerCase() === "currently unavailable";
    
    const images = 
      $("#imgBlkFront").attr("data-a-dynamic-image") || 
      $("#landingImage").attr("data-a-dynamic-image") ||
      "{}";

    const imageUrls = Object.keys(JSON.parse(images));

    const currency = extractCurrency($(".a-price-symbol"));
   
    const discountRate = $(".savingsPercentage").text().replace(/[-%]/g, "");

    const description = extractDescription($);

    const stars = $("#acrPopover > span.a-declarative > a > i.a-icon.a-icon-star.a-star-4-5.cm-cr-review-stars-spacing-big > span")
      .text().trim().split(" ")[0];

    const reviewsCount = $("#acrCustomerReviewText").text().trim().split(" ")[0].replace(/,/g, "");
    
    // construct data object with scraped information
    const data = {
      url, 
      currency: currency || '$', 
      image: imageUrls[0], 
      title, 
      currentPrice: Number(currentPrice) || Number(originalPrice), 
      originalPrice: Number(originalPrice) || Number(currentPrice),
      priceHistory: [], 
      discountRate: Number(discountRate),
      category: 'category', 
      reviewsCount: Number(reviewsCount), 
      stars: Number(stars), 
      isOutOfStock: outOfStock,
      description,
      lowestPrice: Number(currentPrice) || Number(originalPrice),
      highestPrice: Number(originalPrice) || Number(currentPrice),
      averagePrice: Number(originalPrice) || Number(currentPrice),
    }
    console.log("Inside scrapeAmazonProduct() function:")
    console.log(data);
    return data;
  } catch (error: any) {
    throw new Error(`Failed to scrape product: ${error.message}`);
  }
}