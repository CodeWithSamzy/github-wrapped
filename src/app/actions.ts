"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { normalizeLogin } from "@/lib/serve";

/** Starts the GitHub OAuth flow and returns to the dashboard afterwards. */
export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/" });
}

export async function signOutOfGitHub() {
  await signOut({ redirectTo: "/" });
}

/** Sends a visitor to a public wrapped from the lookup form. */
export async function lookUpWrapped(formData: FormData) {
  const value = formData.get("login");
  const login = normalizeLogin(typeof value === "string" ? value : "");

  if (!login) redirect("/?error=unknown-user");

  redirect(`/wrapped/${encodeURIComponent(login)}`);
}
