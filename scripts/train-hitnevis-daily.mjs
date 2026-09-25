const rawBase = String(process.env.HITNEVIS_TRAIN_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
const base = rawBase ? (/^https?:\/\//i.test(rawBase) ? rawBase : "http://" + rawBase) : "";
const key = String(process.env.HITNEVIS_TRAIN_SECRET || "").trim();

if (!base || !key) {
  console.error("hitnevis-daily-trainer-misconfigured");
  process.exit(1);
}

const response = await fetch(base + "/api/hitnevis/cron/train", {
  method: "POST",
  headers: { authorization: "Bearer " + key, "content-type": "application/json" },
  body: JSON.stringify({ source: "render-daily" }),
  cache: "no-store",
  signal: AbortSignal.timeout(180000),
});
const body = await response.text();
console.log(body);
if (!response.ok) process.exit(1);
try {
  const data = JSON.parse(body);
  if (!data.ok) process.exit(1);
} catch {
  process.exit(1);
}
