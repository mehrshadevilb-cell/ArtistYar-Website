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

/** Demo accounts until backend auth is wired. */
const DEMO_USERS: Array<SessionUser & { password: string }> = [
  {
    id: "1",
    username: "student",
    password: "student123",
    fullName: "هنرجوی نمونه",
    role: "student",
    telegramLinked: false,
  },
  {
    id: "2",
    username: "admin",
    password: "admin123",
    fullName: "مدیر آکادمی",
    role: "admin",
    telegramLinked: true,
    telegramId: "owner",
  },
];

export function login(username: string, password: string): SessionUser | null {
  const found = DEMO_USERS.find(
    (u) => u.username === username.trim() && u.password === password,
  );
  if (!found) return null;
  const { password: _, ...session } = found;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
  return session;
}

export function registerLocal(input: {
  username: string;
  password: string;
  fullName: string;
}): SessionUser | { error: string } {
  const username = input.username.trim();
  if (username.length < 3) return { error: "نام کاربری حداقل ۳ کاراکتر باشد." };
  if (input.password.length < 6) return { error: "رمز عبور حداقل ۶ کاراکتر باشد." };
  if (DEMO_USERS.some((u) => u.username === username)) {
    return { error: "این نام کاربری قبلاً ثبت شده (دمو)." };
  }
  const session: SessionUser = {
    id: String(Date.now()),
    username,
    fullName: input.fullName.trim() || username,
    role: "student",
    telegramLinked: false,
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
  return session;
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function saveSession(user: SessionUser): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
}
