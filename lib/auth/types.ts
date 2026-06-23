export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
};

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_verified"
  | "user_not_found"
  | "otp_invalid"
  | "otp_expired"
  | "rate_limited"
  | "weak_password"
  | "email_taken"
  | "unknown";

export type AuthResult =
  | { ok: true; user: AuthUser | null }
  | { ok: false; error: AuthErrorCode };

export interface AuthProvider {
  signUp(p: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<AuthResult>;
  signInWithPassword(p: {
    email: string;
    password: string;
  }): Promise<AuthResult>;
  signInWithOtp(p: { email: string }): Promise<AuthResult>;
  verifyOtp(p: { email: string; token: string }): Promise<AuthResult>;
  resetPassword(p: { email: string }): Promise<AuthResult>;
  updatePassword(p: { password: string }): Promise<AuthResult>;
  signOut(): Promise<void>;
  getSession(): Promise<AuthUser | null>;
  onChange(cb: (user: AuthUser | null) => void): () => void;
}
