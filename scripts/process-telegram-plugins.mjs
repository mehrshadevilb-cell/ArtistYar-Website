const rawBase = String(process.env.TELEGRAM_PLUGIN_PROCESS_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
const base = rawBase ? (/^https?:\/\//i.test(rawBase) ? rawBase : "http://" + rawBase) : "";
const key = String(process.env.WEB_ADMIN_API_KEY || "").trim();

if (!base || !key) {
  console.error("telegram-plugin-cron-misconfigured");
  process.exit(1);
}

const endpoint = base + "/api/telegram/plugins/process?key=" + encodeURIComponent(key);
const response = await fetch(endpoint, {
  method: "GET",
  cache: "no-store",
  signal: AbortSignal.timeout(120000),
});
const text = await response.text();

console.log(text);

if (!response.ok) {
  process.exit(1);
}

try {
  const data = JSON.parse(text);
  if (!data.ok) process.exit(1);
  if (data.result?.errors?.length) process.exit(2);
} catch {
  process.exit(1);
}
