import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type {
  AuthProvider,
  AuthResult,
  AuthErrorCode,
  AuthUser,
} from "./types";

function mapUser(u: User | null | undefined): AuthUser | null {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email ?? "",
    displayName:
      (u.user_metadata?.display_name as string | undefined) ?? u.email ?? "",
    emailVerified: !!u.email_confirmed_at,
  };
}

function mapError(msg: string): AuthErrorCode {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "invalid_credentials";
  if (m.includes("email not confirmed")) return "email_not_verified";
  if (m.includes("user not found")) return "user_not_found";
  if (m.includes("otp has expired") || m.includes("token has expired"))
    return "otp_expired";
  if (m.includes("invalid otp") || m.includes("token is invalid"))
    return "otp_invalid";
  if (m.includes("over_email_send_rate_limit") || m.includes("rate limit"))
    return "rate_limited";
  if (m.includes("password") && m.includes("weak")) return "weak_password";
  if (m.includes("already registered") || m.includes("user already exists"))
    return "email_taken";
  return "unknown";
}

export class SupabaseAuthAdapter implements AuthProvider {
  async signUp({
    email,
    password,
    displayName,
  }: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<AuthResult> {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) return { ok: false, error: mapError(error.message) };
    return { ok: true, user: mapUser(data.user) };
  }

  async signInWithPassword({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<AuthResult> {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { ok: false, error: mapError(error.message) };
    return { ok: true, user: mapUser(data.user) };
  }

  async signInWithOtp({ email }: { email: string }): Promise<AuthResult> {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) return { ok: false, error: mapError(error.message) };
    return { ok: true, user: null };
  }

  async verifyOtp({
    email,
    token,
  }: {
    email: string;
    token: string;
  }): Promise<AuthResult> {
    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) return { ok: false, error: mapError(error.message) };
    return { ok: true, user: mapUser(data.user) };
  }

  async resetPassword({ email }: { email: string }): Promise<AuthResult> {
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/acceso/recuperar`,
    });
    if (error) return { ok: false, error: mapError(error.message) };
    return { ok: true, user: null };
  }

  async updatePassword({
    password,
  }: {
    password: string;
  }): Promise<AuthResult> {
    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false, error: mapError(error.message) };
    return { ok: true, user: mapUser(data.user) };
  }

  async signOut(): Promise<void> {
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  async getSession(): Promise<AuthUser | null> {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return mapUser(data.user);
  }

  onChange(cb: (user: AuthUser | null) => void): () => void {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      cb(mapUser(session?.user ?? null));
    });
    return () => subscription.unsubscribe();
  }
}
