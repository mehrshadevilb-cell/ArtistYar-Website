import { cookies } from "next/headers";
import { USER_SESSION_COOKIE, verifyUserSession, type WebUserSession } from "@/lib/server-admin-auth";

const backend = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");
const bridgeSecret = (process.env.WEB_STUDENT_BRIDGE_SECRET || process.env.RAHYAR_AI_BRIDGE_SECRET || "").trim();

export async function getStudentSession(): Promise<WebUserSession | null> {
  return verifyUserSession((await cookies()).get(USER_SESSION_COOKIE)?.value);
}

export async function verifyCourseAccess(session: WebUserSession, courseId: number): Promise<boolean> {
  if (!bridgeSecret || !Number.isInteger(courseId) || courseId <= 0) return false;
  const response = await fetch(backend + "/api/v1/web/students/" + encodeURIComponent(session.id) + "/courses/" + courseId + "/access", {
    headers: { "X-Bridge-Secret": bridgeSecret, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return false;
  const data = await response.json().catch(() => ({}));
  return data?.access === true;
}
