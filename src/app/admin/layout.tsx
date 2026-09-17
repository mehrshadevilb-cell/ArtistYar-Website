import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "./AdminShell";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from "@/lib/server-admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!session) redirect("/login?next=/admin");

  return <AdminShell>{children}</AdminShell>;
}
