import { redirect } from "next/navigation";

/** Canonical student profile lives under /panel/profile. */
export default function ProfileIndexPage() {
  redirect("/panel/profile");
}
