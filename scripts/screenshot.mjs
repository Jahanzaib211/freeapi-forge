import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(__dirname, "..", "docs", "screenshot-dashboard.png");

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

console.log("Navigating...");
await page.goto("http://localhost:5051", {
  waitUntil: "networkidle0",
  timeout: 20000,
});

// Wait for React to mount and render content
await page.waitForFunction(
  () => document.querySelector("#root")?.children.length > 0,
  { timeout: 15000 }
).catch(() => console.log("No immediate children in #root, waiting more..."));

await new Promise((r) => setTimeout(r, 5000));

// Check what's rendered
const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 200));
console.log("Page content:", JSON.stringify(bodyText));

const rootHTML = await page.evaluate(() => document.querySelector("#root")?.innerHTML?.slice(0, 300));
console.log("Root HTML:", JSON.stringify(rootHTML));

await page.screenshot({ path: output, fullPage: false });
const size = fs.statSync(output).size;
console.log("Screenshot:", output, `(${size} bytes)`);

await browser.close();
