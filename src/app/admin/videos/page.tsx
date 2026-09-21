import { redirect } from "next/navigation";

/** Legacy path: free video management lives under /admin/free-education. */
export default function AdminVideosRedirectPage() {
  redirect("/admin/free-education");
}
