import crypto from "crypto";

function secret(): Buffer {
  const raw = (process.env.AI_PROVIDER_ENCRYPTION_KEY || process.env.SECRET_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();
  if (raw.length < 32) throw new Error("AI_PROVIDER_ENCRYPTION_KEY (or SECRET_KEY) must be at least 32 characters");
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

export function encryptProviderKey(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secret(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(":");
}

export function decryptProviderKey(value: string): string {
  const [version, ivRaw, tagRaw, dataRaw] = String(value || "").split(":");
  if (version !== "v1" || !ivRaw || !tagRaw || !dataRaw) throw new Error("Invalid encrypted provider credential");
  const decipher = crypto.createDecipheriv("aes-256-gcm", secret(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataRaw, "base64url")), decipher.final()]).toString("utf8");
}
