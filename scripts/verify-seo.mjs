#!/usr/bin/env node

const expectedSiteUrl = (process.env.SEO_EXPECTED_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");
const port = Number(process.env.SEO_VERIFY_PORT || 4317);
const baseUrl = `http://127.0.0.1:${port}`;
const child = await import("node:child_process");
const { spawn } = child;
const proc = spawn("node", [".next/standalone/server.js"], {
  env: { ...process.env, NODE_ENV: "production", PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

let logs = "";
proc.stdout.on("data", (chunk) => { logs += chunk.toString(); });
proc.stderr.on("data", (chunk) => { logs += chunk.toString(); });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(path) {
  const response = await fetch(baseUrl + path, { redirect: "manual" });
  const body = await response.text();
  return { response, body };
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(baseUrl + "/", { redirect: "manual" });
      if (response.status >= 200 && response.status < 400) {
        ready = true;
        break;
      }
    } catch {}
    await sleep(500);
  }
  if (!ready) throw new Error("standalone server did not become ready");

  const robots = await fetchText("/robots.txt");
  if (robots.response.status !== 200) throw new Error(`robots.txt returned HTTP ${robots.response.status}`);
  if (!robots.body.includes(`Sitemap: ${expectedSiteUrl}/sitemap.xml`)) {
    throw new Error("robots.txt does not advertise the production sitemap URL");
  }
  if (!robots.body.includes("Disallow: /api/")) throw new Error("robots.txt no longer disallows /api/");
  if (!robots.body.includes("Disallow: /admin/")) throw new Error("robots.txt no longer disallows /admin/");

  const sitemap = await fetchText("/sitemap.xml");
  if (sitemap.response.status !== 200) throw new Error(`sitemap.xml returned HTTP ${sitemap.response.status}`);
  if (!/^<\?xml|<urlset|<sitemapindex/i.test(sitemap.body.trim())) {
    throw new Error("sitemap.xml is not valid XML sitemap content");
  }

  const locs = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
  if (!locs.length) throw new Error("sitemap.xml contains no URLs");
  for (const loc of locs) {
    const url = new URL(loc);
    if (url.protocol !== "https:" || url.host !== new URL(expectedSiteUrl).host) {
      throw new Error(`sitemap contains non-production URL: ${loc}`);
    }
    if (url.search || url.hash) throw new Error(`sitemap contains query/hash URL: ${loc}`);
  }

  const publicPaths = ["/", "/courses", "/ai", "/ai-music", "/music-analyzer", "/hitnevis"];
  for (const path of publicPaths) {
    const page = await fetchText(path);
    if (page.response.status !== 200) throw new Error(`${path} returned HTTP ${page.response.status}`);
    const canonical = page.body.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
      || page.body.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
    if (!canonical) throw new Error(`${path} is missing a canonical link`);
    const canonicalUrl = new URL(canonical[1], expectedSiteUrl).toString().replace(/\/$/, "");
    const expected = new URL(path, expectedSiteUrl).toString().replace(/\/$/, "");
    if (canonicalUrl !== expected) throw new Error(`${path} canonical is ${canonical[1]}, expected ${expected}`);
    const robotsMeta = page.body.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i);
    if (robotsMeta && /(^|,|\\s)noindex($|,|\\s)/i.test(robotsMeta[1])) {
      throw new Error(`${path} is unexpectedly marked noindex`);
    }
  }

  const home = await fetchText("/");
  if (!home.body.includes(`<meta name="robots"`) && !home.body.includes(`<meta name="googlebot"`)) {
    throw new Error("homepage does not expose crawl/index metadata");
  }

  console.log(`SEO verification passed: ${expectedSiteUrl}`);
  console.log(`Checked robots.txt, sitemap.xml (${locs.length} URLs), and canonical/indexability on ${publicPaths.length} public routes.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  if (logs) console.error(logs.slice(-4000));
  process.exitCode = 1;
} finally {
  proc.kill("SIGTERM");
}
