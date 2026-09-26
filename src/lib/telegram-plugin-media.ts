/**
 * Telegram plugin media helpers — image/file fetch for public cover proxy.
 * Kept separate from the full sync module so cover serving stays available
 * even when the heavy ingest pipeline is being restored.
 */
import https from "https";

const TG = "https://api.telegram.org";

function botToken() {
  const plugin = (process.env.TELEGRAM_PLUGIN_BOT_TOKEN || "").trim();
  if (plugin) return plugin;
  return (process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || "").trim();
}

function clean(v: unknown, max = 500) {
  return String(v ?? "")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

async function tg(method: string, body: Record<string, unknown>) {
  const t = botToken();
  if (!t) throw new Error("telegram_bot_token_missing");
  let last = "telegram_" + method + "_failed";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(TG + "/bot" + t + "/" + method, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) return data.result;
      const description = clean(data?.description || last, 240);
      last = description;
      if (![429, 500, 502, 503, 504].includes(res.status) || attempt >= 2) {
        throw new Error(description);
      }
      const retryAfter = Number(data?.parameters?.retry_after || 0);
      const waitMs = retryAfter > 0 ? Math.min(15000, retryAfter * 1000) : 700 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    } catch (error) {
      if (attempt >= 2) throw error;
      last = clean(error instanceof Error ? error.message : String(error), 240);
      if (!/fetch failed|timeout|timed out|aborted|network/i.test(last)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw new Error(last);
}

export async function telegramGetFile(fileId: string) {
  const file = await tg("getFile", { file_id: fileId });
  if (!file?.file_path) throw new Error("telegram_file_path_missing");
  return {
    filePath: String(file.file_path),
    url: TG + "/file/" + botToken() + "/" + file.file_path,
  };
}

function imageMimeFromPath(filePath: string, header: string | null) {
  const normalized = (header || "").split(";")[0].trim().toLowerCase();
  if (normalized.startsWith("image/")) return normalized;
  const ext = filePath.toLowerCase().split("?")[0].split(".").pop() || "";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "bmp") return "image/bmp";
  return "image/jpeg";
}

function httpsDownload(urlValue: string) {
  return new Promise<{ bytes: Buffer; status: number; contentType: string | null }>((resolve, reject) => {
    const req = https.get(
      urlValue,
      {
        headers: {
          accept: "image/*,*/*;q=0.8",
          "accept-encoding": "identity",
          "user-agent": "ArtistYar-Telegram-Plugin-Sync/1.0",
        },
        timeout: 30000,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) =>
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
        );
        response.on("end", () =>
          resolve({
            bytes: Buffer.concat(chunks),
            status: response.statusCode || 0,
            contentType: response.headers["content-type"] || null,
          }),
        );
        response.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("telegram_file_download_timeout")));
    req.on("error", reject);
  });
}

export async function telegramBytes(fileId: string) {
  let last = "telegram_file_download_failed";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const file = await telegramGetFile(fileId);

      const native = await httpsDownload(file.url);
      if (native.status >= 200 && native.status < 300) {
        return {
          bytes: native.bytes,
          contentType: imageMimeFromPath(file.filePath, native.contentType),
        };
      }

      let nativeDetail = "";
      if (native.status === 404) {
        const body = native.bytes.toString("utf8").slice(0, 240);
        nativeDetail = body ? ":" + body.replace(/\s+/g, " ").trim() : "";
      }
      last = "telegram_file_download_failed_" + native.status + nativeDetail;

      const res = await fetch(file.url, {
        cache: "no-store",
        redirect: "follow",
        headers: {
          accept: "image/*,*/*;q=0.8",
          "accept-encoding": "identity",
          "user-agent": "ArtistYar-Telegram-Plugin-Sync/1.0",
        },
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const bytes = Buffer.from(await res.arrayBuffer());
        return {
          bytes,
          contentType: imageMimeFromPath(file.filePath, res.headers.get("content-type")),
        };
      }
      const body = res.status === 404 ? (await res.text().catch(() => "")).slice(0, 240) : "";
      last =
        "telegram_file_download_failed_" +
        res.status +
        (body ? ":" + body.replace(/\s+/g, " ").trim() : "");
    } catch (error) {
      last = clean(error instanceof Error ? error.message : String(error), 300);
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 900 * (attempt + 1)));
  }
  throw new Error(last);
}

export async function pluginImageResponse(fileId: string) {
  const downloaded = await telegramBytes(fileId);
  return {
    body: downloaded.bytes,
    headers: {
      get(name: string) {
        if (String(name).toLowerCase() === "content-type") {
          return downloaded.contentType || "image/jpeg";
        }
        return null;
      },
    },
  };
}

export function pluginTokenConfigured() {
  return Boolean(botToken());
}
