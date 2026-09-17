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

/** Demo accounts until backend auth is wired. */
const DEMO_USERS: StoredMember[] = [
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

function readMembers(): StoredMember[] {
  if (typeof window === "undefined") return [...DEMO_USERS];
  try {
    const raw = localStorage.getItem(MEMBERS_KEY);
    const local = raw ? (JSON.parse(raw) as StoredMember[]) : [];
    const byUsername = new Map<string, StoredMember>();
    for (const u of DEMO_USERS) byUsername.set(u.username.toLowerCase(), u);
    for (const u of local) byUsername.set(u.username.toLowerCase(), u);
    return Array.from(byUsername.values());
  } catch {
    return [...DEMO_USERS];
  }
}

function writeMember(member: StoredMember) {
  if (typeof window === "undefined") return;
  const existing = readMembers().filter((u) => u.username.toLowerCase() !== member.username.toLowerCase());
  // Never overwrite demo accounts on disk; only store non-demo registrations
  const localOnly = existing.filter((u) => !DEMO_USERS.some((d) => d.username === u.username));
  localOnly.push(member);
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(localOnly));
}

export function login(username: string, password: string): SessionUser | null {
  const found = readMembers().find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password,
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
  if (!input.fullName.trim()) return { error: "نام کامل را وارد کن." };
  if (readMembers().some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return { error: "این نام کاربری قبلاً ثبت شده است." };
  }
  const member: StoredMember = {
    id: String(Date.now()),
    username,
    password: input.password,
    fullName: input.fullName.trim(),
    role: "student",
    telegramLinked: false,
  };
  writeMember(member);
  const { password: _, ...session } = member;
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

/** Admin helper: list registered local members (no passwords). */
export function listLocalMembers(): SessionUser[] {
  return readMembers().map(({ password: _, ...rest }) => rest);
}
