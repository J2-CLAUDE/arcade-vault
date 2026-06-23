import { SupabaseAuthAdapter } from "./supabase-auth";
import type { AuthProvider } from "./types";

export const authProvider: AuthProvider = new SupabaseAuthAdapter();
export type {
  AuthProvider,
  AuthUser,
  AuthResult,
  AuthErrorCode,
} from "./types";
