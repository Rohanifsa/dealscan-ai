"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import type { AuthActionState } from "@/features/auth/types";

export async function signUp(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "All fields are required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createServerClient();

  // Create user via admin API (service role required) — skips email verification
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });

  if (error) {
    return { error: error.message };
  }

  // Profile is created automatically by the on_auth_user_created trigger

  // Sign in immediately after creating account
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: signInError.message };
  }

  redirect("/dashboard");
}

export async function signIn(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  console.log(
    "[signIn] SUPABASE_URL defined:",
    !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  console.log(
    "[signIn] ANON_KEY defined:",
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const supabase = await createServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  console.log(
    "[signIn] result:",
    error ? `error: ${error.message}` : `user: ${data.user?.id}`,
  );
  console.log(
    "[signIn] session:",
    data.session ? `expires: ${data.session.expires_at}` : "none",
  );

  if (error) {
    return { error: "Invalid email or password." };
  }

  redirect("/dashboard");
}
