const DEFAULT_SITE_URL = "https://artistyaar.ir";

function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
}

function indexNowKey() {
  return (process.env.INDEXNOW_KEY || "").trim();
}

function normalizeUrls(urls: string[]) {
  const origin = siteOrigin();
  const allowed = new URL(origin);
  return [...new Set(urls.map((value) => value.trim()).filter(Boolean))]
    .map((value) => {
      try {
        return new URL(value, origin);
      } catch {
        return null;
      }
    })
    .filter((url): url is URL => url !== null && url.origin === allowed.origin && url.protocol === "https:")
    .map((url) => url.toString());
}

export async function submitIndexNow(urls: string[]) {
  const key = indexNowKey();
  const urlList = normalizeUrls(urls);

  if (!key || !urlList.length) {
    return { ok: false, skipped: true, reason: !key ? "key_not_configured" : "no_valid_urls" };
  }

  const origin = siteOrigin();
  const host = new URL(origin).host;
  const payload = {
    host,
    key,
    keyLocation: origin + "/indexnow-key.txt",
    urlList: urlList.slice(0, 10000),
  };

  const endpoints = [
    "https://api.indexnow.org/indexnow",
    "https://www.bing.com/indexnow",
  ];

  let lastStatus = 0;
  let lastError = "";

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: "no-store",
      });
      lastStatus = response.status;
      if (response.ok || response.status === 202) {
        return { ok: true, status: response.status, submitted: payload.urlList.length };
      }
      lastError = (await response.text()).slice(0, 240);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  console.warn("indexnow_submission_failed", {
    status: lastStatus,
    error: lastError.slice(0, 240),
    count: payload.urlList.length,
  });

  return { ok: false, status: lastStatus, error: lastError.slice(0, 240) };
}