import { createHmac, timingSafeEqual } from "crypto";

export type PracticeQuestionClaims = {
  userId: string;
  gameId: string;
  fingerprint: string;
  answer: string;
  difficulty: number;
  issuedAt: number;
};

function secret() {
  return process.env.PRACTICE_QUESTION_SECRET || process.env.JWT_SECRET || process.env.ARTISTYAR_SESSION_SECRET || "";
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(payload: string) {
  const key = secret();
  if (!key) return "";
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function createPracticeQuestionToken(claims: PracticeQuestionClaims): string | null {
  const payload = encode(JSON.stringify(claims));
  const signature = sign(payload);
  return signature ? `${payload}.${signature}` : null;
}

export function verifyPracticeQuestionToken(token: unknown, userId: string): PracticeQuestionClaims | null {
  if (typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (!expected) return null;
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PracticeQuestionClaims;
    if (claims.userId !== userId || !claims.fingerprint || !claims.gameId) return null;
    if (!Number.isFinite(claims.issuedAt) || Date.now() - claims.issuedAt > 15 * 60 * 1000) return null;
    if (!Number.isFinite(claims.difficulty) || claims.difficulty < 1 || claims.difficulty > 500) return null;
    return claims;
  } catch {
    return null;
  }
}
