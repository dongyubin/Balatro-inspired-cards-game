import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const SITE_URL_TOKEN = "%SITE_URL%";

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

test("focuses homepage metadata and headings on the online card game intent", async () => {
  const html = await source("index.html");
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1] ?? "";
  const description =
    html.match(/name="description"\s+content="([^"]+)"/s)?.[1] ?? "";
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];

  assert.equal(title, "Balatro Inspired Card Game Online | Play Balatrio");
  assert.ok(description.length >= 145 && description.length <= 160);
  assert.match(html, /<h1[^>]*>[\s\S]*?Play a Balatro Inspired Card Game Online/i);
  assert.equal((html.match(/<h1\b/gi) ?? []).length, 1);

  for (const heading of headings) {
    const text = stripHtml(heading[2]).toLowerCase();
    assert.doesNotMatch(text, /chess|pool|playing cards/);
  }

  for (let index = 1; index < headings.length; index += 1) {
    assert.ok(
      Number(headings[index][1]) <= Number(headings[index - 1][1]) + 1,
      "Heading levels should not skip"
    );
  }
});

test("uses absolute build-time SEO URLs and expanded game schema", async () => {
  const html = await source("index.html");
  const config = await source("vite.config.js");
  const robots = await source("public/robots.txt");
  const sitemap = await source("public/sitemap.xml");

  assert.doesNotMatch(html, /new URL\("\/", window\.location\.href\)/);
  assert.match(html, new RegExp(`rel="canonical" href="${SITE_URL_TOKEN}/"`));
  assert.match(html, new RegExp(`property="og:url" content="${SITE_URL_TOKEN}/"`));
  assert.match(html, new RegExp(`property="og:image" content="${SITE_URL_TOKEN}/og-cover.png"`));
  assert.match(html, /property="og:image:width" content="1200"/);
  assert.match(html, /property="og:image:height" content="630"/);
  assert.match(html, /name="twitter:image:alt"/);
  assert.match(html, /"@type":\s*"VideoGame"/);

  for (const property of ["image", "author", "publisher", "playMode", "gamePlatform"]) {
    assert.match(html, new RegExp(`"${property}"\\s*:`));
  }

  assert.match(config, /process\.env\.SITE_URL/);
  assert.match(config, /SITE_URL is required/);
  assert.match(config, /%SITE_URL%/);
  assert.match(robots, new RegExp(`Sitemap: ${SITE_URL_TOKEN}/sitemap.xml`));
  assert.doesNotMatch(sitemap, /<loc>\/<\/loc>/);
  assert.match(sitemap, new RegExp(`<loc>${SITE_URL_TOKEN}/</loc>`));
});

test("ships a crawlable topic cluster with contextual homepage links", async () => {
  const html = await source("index.html");
  const pages = [
    ["how-to-play/index.html", "How to Play Balatrio"],
    ["about/index.html", "About Balatrio"],
    ["privacy/index.html", "Privacy Policy"],
    ["terms/index.html", "Terms of Use"],
    ["changelog/index.html", "Balatrio Changelog"]
  ];

  for (const [path, heading] of pages) {
    const page = await source(path);
    assert.match(page, new RegExp(`<h1[^>]*>[\\s\\S]*?${heading}`, "i"));
    assert.match(page, new RegExp(`rel="canonical" href="${SITE_URL_TOKEN}/`));
    assert.match(page, /name="description"/);
    assert.match(html, new RegExp(`href="/${path.replace("/index.html", "/")}"`));
  }
});

test("provides substantial standalone game guidance outside the iframe", async () => {
  const html = await source("index.html");
  const main = html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? "";
  const words = stripHtml(main).split(/\s+/).filter(Boolean);

  assert.ok(
    words.length >= 1800 && words.length <= 2200,
    `Expected 1800-2200 words, found ${words.length}`
  );
  for (const heading of [
    "A Free Poker-Hand Strategy Game Built for Repeat Runs",
    "How This Balatro Inspired Card Game Works",
    "Classic Mode or Speed Mode: Choose Your Run",
    "Poker Hand Scoring and Escalating Round Targets",
    "Strategy Tips for Better Balatrio Runs",
    "Play a Free Single-Player Card Game in Your Browser",
    "Looking for Free Games Like Balatro?",
    "Balatrio Game FAQ"
  ]) {
    assert.match(html, new RegExp(`<h2[^>]*>[\\s\\S]*?${heading}[\\s\\S]*?<\\/h2>`, "i"));
  }
  assert.doesNotMatch(main.toLowerCase(), /balatro inspired chess game|balatro inspired pool game/);
});

test("covers relevant long-tail searches naturally without keyword stuffing", async () => {
  const html = await source("index.html");
  const main = html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? "";
  const text = stripHtml(main).toLowerCase();
  const phrases = [
    "free balatro inspired game",
    "balatro like browser game",
    "free games like balatro online",
    "poker hand strategy game",
    "single player browser card game",
    "free online card game no download",
    "score chasing card game",
    "card game with poker hands",
    "classic mode card game",
    "speed mode card game"
  ];

  for (const phrase of phrases) {
    const count = text.split(phrase).length - 1;
    assert.ok(count >= 1 && count <= 2, `${phrase} should appear 1-2 times, found ${count}`);
  }

  const primaryCount = text.split("balatro inspired card game online").length - 1;
  assert.ok(primaryCount >= 2 && primaryCount <= 4);
  assert.match(
    html,
    /does not claim to include Jokers, a shop, upgrades, or a deckbuilding system/i
  );
});

test("keeps visible FAQ content aligned with FAQ structured data", async () => {
  const html = await source("index.html");
  const questions = [
    "What kind of game is Balatrio?",
    "Can I play Balatrio for free online?",
    "Do I need to download Balatrio?",
    "Does Balatrio work on mobile?",
    "Do I need to know poker before playing?",
    "How is Balatrio different from Balatro?"
  ];

  for (const question of questions) {
    assert.equal(
      html.split(question).length - 1,
      2,
      `${question} should appear once visibly and once in JSON-LD`
    );
  }
});

test("keeps the game directly playable and documents a gameplay concept image", async () => {
  const html = await source("index.html");
  const javascript = await source("src/main.js");
  const css = await source("src/style.css");

  assert.ok(
    html.indexOf('id="play-online"') < html.indexOf('class="hero section-grid"'),
    "Play Online should appear before the editorial hero"
  );
  assert.match(
    html,
    /<iframe[\s\S]*?src="https:\/\/753acdb5-7e64-4e40-8280-0a3c74f37166--\d+--[a-z0-9]+\.app\.yourware\.app\/?"/
  );
  assert.match(html, /<img[^>]+src="\/gameplay-screenshot\.webp"[^>]+width="1200"[^>]+height="675"/);
  assert.match(html, /alt="[^"]*Balatrio[^"]*gameplay[^"]*"/i);
  assert.match(javascript, /requestFullscreen/);
  assert.match(javascript, /exitFullscreen/);
  assert.match(css, /\.iframe-shell\s*\{[\s\S]*?height:\s*760px/);
});

test("adds trust signals, disclosure, dates, accessibility, and Vercel headers", async () => {
  const html = await source("index.html");
  const css = await source("src/style.css");
  const vercel = await source("vercel.json");

  assert.match(html, /Developed by the Balatrio team/i);
  assert.match(html, /Last updated:\s*June 12, 2026/i);
  assert.match(html, /not affiliated with or endorsed by LocalThunk or Playstack/i);
  assert.match(html, /aria-label="Main navigation"/);
  assert.match(html, /title="Play Balatrio online"/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /:focus-visible/);

  for (const header of [
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy"
  ]) {
    assert.match(vercel, new RegExp(header));
  }
});

test("loads critical page styles directly without waiting for JavaScript", async () => {
  const pages = [
    "index.html",
    "how-to-play/index.html",
    "about/index.html",
    "privacy/index.html",
    "terms/index.html",
    "changelog/index.html"
  ];
  const javascript = await source("src/main.js");

  for (const path of pages) {
    const html = await source(path);
    const stylesheetIndex = html.indexOf('<link rel="stylesheet" href="/src/style.css"');
    const moduleIndex = html.indexOf('<script type="module" src="/src/main.js"');

    assert.ok(stylesheetIndex >= 0, `${path} should link the stylesheet directly`);
    assert.match(
      html,
      /<style data-critical-css>html\{background:#08090c\}body\{margin:0;opacity:0\}<\/style>/,
      `${path} should hide unstyled content during the first paint`
    );
    assert.ok(
      moduleIndex < 0 || stylesheetIndex < moduleIndex,
      `${path} should discover CSS before the module script`
    );
  }

  assert.doesNotMatch(javascript, /import\s+["']\.\/style\.css["']/);
  assert.match(await source("src/style.css"), /body\s*\{[\s\S]*?opacity:\s*1/);
  const config = await source("vite.config.js");
  assert.match(config, /inject-critical-first-paint/);
  assert.match(config, /data-critical-css/);
});

test("provides an accessible site-wide back-to-top control", async () => {
  const pages = [
    "index.html",
    "how-to-play/index.html",
    "about/index.html",
    "privacy/index.html",
    "terms/index.html",
    "changelog/index.html"
  ];
  const javascript = await source("src/main.js");
  const css = await source("src/style.css");

  for (const path of pages) {
    const html = await source(path);
    assert.match(html, /<button[^>]+class="back-to-top"[^>]+aria-label="Back to top"[^>]+data-back-to-top/);
  }

  assert.match(javascript, /window\.scrollTo\(\{[\s\S]*?top:\s*0/);
  assert.match(javascript, /reduceMotion\s*\?\s*"auto"\s*:\s*"smooth"/);
  assert.match(css, /\.back-to-top\s*\{/);
  assert.match(css, /\.back-to-top\.is-visible\s*\{/);
});
