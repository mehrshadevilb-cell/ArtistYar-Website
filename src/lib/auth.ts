export type UserRole = "student" | "admin";

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  telegramLinked: boolean;
  telegramId?: string;
};

const STORAGE_KEY = "artistyar_session_v1";
const MEMBERS_KEY = "artistyar_members_v1";

type StoredMember = SessionUser & { password: string };

function setStorageItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, value); } catch { /* Storage must not crash auth. */ }
}

function removeStorageItem(key: string): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(key); } catch { /* Ignore unavailable storage. */ }
}

function readLocalStudents(): StoredMember[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MEMBERS_KEY);
    const local = raw ? (JSON.parse(raw) as StoredMember[]) : [];
    if (!Array.isArray(local)) return [];
    return local.filter(
      (u) => u && typeof u.username === "string" && u.role !== "admin" &&
        u.username.toLowerCase() !== "admin" && u.username.toLowerCase() !== "student",
    );
  } catch { return []; }
}

function writeLocalStudent(member: StoredMember) {
  if (typeof window === "undefined") return;
  const existing = readLocalStudents().filter(
    (u) => u.username.toLowerCase() !== member.username.toLowerCase(),
  );
  existing.push(member);
  setStorageItem(MEMBERS_KEY, JSON.stringify(existing));
}

export function login(username: string, password: string): SessionUser | null {
  const found = readLocalStudents().find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password,
  );
  if (!found) return null;
  const { password: _, ...session } = found;
  setStorageItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export async function loginViaApi(
  username: string,
  password: string,
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok || !data.user) {
      try {
        const local = login(username, password);
        if (local) return { ok: true, user: local };
      } catch { /* Fall through to a normal login error. */ }
      return { ok: false, error: data.error || "نام کاربری یا رمز عبور نادرست است." };
    }
    const user = data.user as SessionUser;
    setStorageItem(STORAGE_KEY, JSON.stringify(user));
    return { ok: true, user };
  } catch {
    try {
      const local = login(username, password);
      if (local) return { ok: true, user: local };
    } catch { /* Storage errors must not crash the panel. */ }
    return { ok: false, error: "ارتباط با سرور ورود برقرار نشد." };
  }
}

export function registerLocal(input: {
  username: string;
  password: string;
  fullName: string;
}): SessionUser | { error: string } {
  const username = input.username.trim();
  if (username.length < 3) return { error: "نام کاربری حداقل ۳ کاراکتر باشد." };
  if (input.password.length < 6) return { error: "رمز عبور حداقل ۶ کاراکتر باشد." };
  if (!input.fullName.trim()) return { error: "نام کامل را وارد کن." };
  if (["admin", "student"].includes(username.toLowerCase())) return { error: "این نام کاربری مجاز نیست." };
  if (readLocalStudents().some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return { error: "این نام کاربری قبلاً ثبت شده است." };
  }
  const member: StoredMember = {
    id: String(Date.now()), username, password: input.password, fullName: input.fullName.trim(),
    role: "student", telegramLinked: false,
  };
  writeLocalStudent(member);
  const { password: _, ...session } = member;
  setStorageItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } finally {
    removeStorageItem(STORAGE_KEY);
  }
}

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionUser>;
    if (!parsed || typeof parsed.id !== "string" || typeof parsed.username !== "string") return null;
    if (parsed.role !== "admin" && parsed.role !== "student") return null;
    return parsed as SessionUser;
  } catch { return null; }
}

export function saveSession(user: SessionUser): void {
  setStorageItem(STORAGE_KEY, JSON.stringify(user));
}

export function listLocalMembers(): SessionUser[] {
  return readLocalStudents().map(({ password: _, ...rest }) => rest);
}
