"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authProvider } from "@/lib/auth";
import { checkPassword } from "@/lib/auth/password";
import type { AuthErrorCode } from "@/lib/auth";

// Debe coincidir con "Email OTP Length" en Supabase (Authentication → Providers
// → Email). Supabase manda: si cambias la longitud allí, ajusta solo este número.
const OTP_LENGTH = 6;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(s: string): boolean {
  return EMAIL_RE.test(s.trim());
}

// ── Error messages ──────────────────────────────────────────────────────────

const ERROR_MSGS: Record<AuthErrorCode, string> = {
  invalid_credentials: "Correo o contraseña incorrectos.",
  email_not_verified: "Debes verificar tu correo antes de ingresar.",
  user_not_found: "No existe una cuenta con ese correo.",
  otp_invalid: "El código ingresado no es válido.",
  otp_expired: "El código es inválido o ya expiró. Solicita uno nuevo.",
  rate_limited: "Demasiados intentos. Espera unos minutos.",
  weak_password: "La contraseña no cumple los requisitos.",
  email_taken: "Ese correo ya está registrado.",
  unknown: "Ocurrió un error inesperado. Intenta nuevamente.",
};

// ── Password checklist component ────────────────────────────────────────────

function PasswordChecklist({ password }: { password: string }) {
  const { rules } = checkPassword(password);
  const items = [
    { key: "length" as const, label: "10 a 16 caracteres" },
    { key: "lower" as const, label: "Al menos 1 minúscula" },
    { key: "upper" as const, label: "Al menos 1 mayúscula" },
    { key: "digit" as const, label: "Al menos 1 número" },
    {
      key: "special" as const,
      label: "Al menos 1 carácter especial: ! @ # $ % & * _ - . ?",
    },
    { key: "noSpace" as const, label: "Sin espacios" },
  ];
  return (
    <div className="pw-rules">
      {items.map(({ key, label }) => (
        <div key={key} className={`pw-rule ${rules[key] ? "ok" : "fail"}`}>
          {rules[key] ? "✓" : "✗"} {label}
        </div>
      ))}
    </div>
  );
}

// ── OTP 6-box code input ─────────────────────────────────────────────────────

function OtpBoxes({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? "");

  function setDigit(i: number, d: string) {
    onChange((value.slice(0, i) + d + value.slice(i + 1)).slice(0, OTP_LENGTH));
  }

  function handleChange(i: number, raw: string) {
    const d = raw.replace(/\D/g, "");
    if (!d) {
      setDigit(i, "");
      return;
    }
    setDigit(i, d[d.length - 1]);
    if (i < OTP_LENGTH - 1) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;
    onChange(pasted);
    refs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  }

  return (
    <div className="otp-boxes" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="otp-box"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          autoFocus={i === 0}
          aria-label={`Dígito ${i + 1}`}
        />
      ))}
    </div>
  );
}

// ── Main Auth component ──────────────────────────────────────────────────────

type Tab = "in" | "up";
type LoginMode = "password" | "otp";
type Screen = "form" | "otp-code" | "verify-sent" | "reset-sent";

export default function Auth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/games";

  const [tab, setTab] = useState<Tab>("in");
  const [loginMode, setLoginMode] = useState<LoginMode>("password");
  const [screen, setScreen] = useState<Screen>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Register fields
  const [alias, setAlias] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // OTP fields
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Reset fields
  const [resetEmail, setResetEmail] = useState("");
  const [showReset, setShowReset] = useState(false);

  // Countdown for OTP cooldown
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [cooldown]);

  function clearError() {
    setError(null);
  }

  // ── Register ──────────────────────────────────────────────────────────────

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    const { valid } = checkPassword(regPass);
    if (!valid) {
      setError("La contraseña no cumple los requisitos indicados.");
      return;
    }
    if (!alias.trim()) {
      setError("El alias no puede estar vacío.");
      return;
    }
    setLoading(true);
    const result = await authProvider.signUp({
      email: regEmail,
      password: regPass,
      displayName: alias.trim().slice(0, 24),
    });
    setLoading(false);
    if (!result.ok) {
      setError(ERROR_MSGS[result.error]);
      return;
    }
    setScreen("verify-sent");
  }

  // ── Login by password ─────────────────────────────────────────────────────

  async function handleLoginPassword(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLoading(true);
    const result = await authProvider.signInWithPassword({
      email: loginEmail,
      password: loginPass,
    });
    setLoading(false);
    if (!result.ok) {
      setError(ERROR_MSGS[result.error]);
      return;
    }
    router.push(redirect);
  }

  // ── Login by OTP — step 1: request code ───────────────────────────────────

  async function handleOtpRequest(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    if (!isValidEmail(otpEmail)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }
    setLoading(true);
    const result = await authProvider.signInWithOtp({ email: otpEmail });
    setLoading(false);
    if (!result.ok) {
      setError(ERROR_MSGS[result.error]);
      return;
    }
    setScreen("otp-code");
    setCooldown(60);
  }

  // ── Login by OTP — step 2: verify code ───────────────────────────────────

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLoading(true);
    const result = await authProvider.verifyOtp({
      email: otpEmail,
      token: otpCode,
    });
    setLoading(false);
    if (!result.ok) {
      setError(ERROR_MSGS[result.error]);
      return;
    }
    router.push(redirect);
  }

  // ── Resend OTP ────────────────────────────────────────────────────────────

  async function handleResendOtp() {
    if (cooldown > 0) return;
    clearError();
    if (!isValidEmail(otpEmail)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }
    const result = await authProvider.signInWithOtp({ email: otpEmail });
    if (!result.ok) {
      setError(ERROR_MSGS[result.error]);
      return;
    }
    setCooldown(60);
  }

  // ── Password reset ────────────────────────────────────────────────────────

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLoading(true);
    const result = await authProvider.resetPassword({ email: resetEmail });
    setLoading(false);
    if (!result.ok) {
      setError(ERROR_MSGS[result.error]);
      return;
    }
    setScreen("reset-sent");
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  if (screen === "verify-sent") {
    return (
      <div className="av-auth-wrap fade-in">
        <div className="auth-card">
          <div className="auth-header">
            <div className="mark" />
            <h2 className="neon-cyan">ARCADE VAULT</h2>
          </div>
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
            <div
              className="mono"
              style={{ color: "var(--cyan)", fontSize: 13, marginBottom: 8 }}
            >
              REVISA TU CORREO
            </div>
            <div
              className="mono"
              style={{
                color: "var(--ink-faint)",
                fontSize: 11,
                lineHeight: 1.7,
              }}
            >
              Te enviamos un enlace de verificación.
              <br />
              Confírmalo para poder ingresar.
            </div>
          </div>
          <button
            className="btn ghost"
            style={{ width: "100%", marginTop: 8 }}
            onClick={() => {
              setScreen("form");
              setTab("in");
            }}
          >
            VOLVER AL INICIO DE SESIÓN
          </button>
        </div>
      </div>
    );
  }

  if (screen === "reset-sent") {
    return (
      <div className="av-auth-wrap fade-in">
        <div className="auth-card">
          <div className="auth-header">
            <div className="mark" />
            <h2 className="neon-cyan">ARCADE VAULT</h2>
          </div>
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔑</div>
            <div
              className="mono"
              style={{ color: "var(--cyan)", fontSize: 13, marginBottom: 8 }}
            >
              ENLACE ENVIADO
            </div>
            <div
              className="mono"
              style={{
                color: "var(--ink-faint)",
                fontSize: 11,
                lineHeight: 1.7,
              }}
            >
              Te enviamos un enlace para restablecer
              <br />
              tu contraseña. Revisa tu correo.
            </div>
          </div>
          <button
            className="btn ghost"
            style={{ width: "100%", marginTop: 8 }}
            onClick={() => {
              setScreen("form");
              setShowReset(false);
            }}
          >
            VOLVER AL INICIO DE SESIÓN
          </button>
        </div>
      </div>
    );
  }

  if (screen === "otp-code") {
    return (
      <div className="av-auth-wrap fade-in">
        <div className="auth-card">
          <div className="auth-header">
            <div className="mark" />
            <h2 className="neon-cyan">ARCADE VAULT</h2>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--ink-faint)",
                letterSpacing: "0.16em",
                marginTop: 6,
              }}
            >
              CÓDIGO DE ACCESO
            </div>
          </div>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              margin: "12px 0 4px",
              lineHeight: 1.7,
            }}
          >
            Ingresa el código de {OTP_LENGTH} dígitos enviado a{" "}
            <span style={{ color: "var(--cyan)" }}>{otpEmail}</span>. Expira en
            10 minutos.
          </div>
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={handleOtpVerify}>
            <div className="field">
              <label>Código</label>
              <OtpBoxes
                value={otpCode}
                onChange={(v) => {
                  setOtpCode(v);
                  clearError();
                }}
              />
            </div>
            <button
              className="btn lg"
              type="submit"
              style={{ width: "100%", marginTop: 8 }}
              disabled={loading || otpCode.length !== OTP_LENGTH}
            >
              {loading ? "VERIFICANDO…" : "VERIFICAR CÓDIGO"}
            </button>
          </form>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 12,
            }}
          >
            <button
              className="btn ghost"
              style={{ fontSize: 10 }}
              onClick={handleResendOtp}
              disabled={cooldown > 0}
            >
              {cooldown > 0 ? `REENVIAR (${cooldown}s)` : "REENVIAR CÓDIGO"}
            </button>
            <button
              className="btn ghost"
              style={{ fontSize: 10 }}
              onClick={() => {
                setScreen("form");
                setOtpCode("");
                clearError();
              }}
            >
              CANCELAR
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form (login + register) ──────────────────────────────────────────

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark" />
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={tab === "in" ? "on" : ""}
            onClick={() => {
              setTab("in");
              clearError();
            }}
          >
            INICIAR SESIÓN
          </button>
          <button
            className={tab === "up" ? "on" : ""}
            onClick={() => {
              setTab("up");
              clearError();
            }}
          >
            CREAR CUENTA
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {/* ── Register tab ── */}
        {tab === "up" && (
          <form onSubmit={handleRegister}>
            <div className="field">
              <label>Alias de jugador</label>
              <input
                value={alias}
                onChange={(e) => {
                  setAlias(e.target.value.slice(0, 24));
                  clearError();
                }}
                placeholder="px_kai"
                autoComplete="nickname"
              />
            </div>
            <div className="field">
              <label>Correo electrónico</label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => {
                  setRegEmail(e.target.value);
                  clearError();
                }}
                placeholder="jugador@vault.gg"
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input
                type="password"
                value={regPass}
                onChange={(e) => {
                  setRegPass(e.target.value);
                  clearError();
                }}
                placeholder="••••••••••"
                autoComplete="new-password"
              />
            </div>
            <PasswordChecklist password={regPass} />
            <button
              className="btn lg"
              type="submit"
              style={{ width: "100%", marginTop: 8 }}
              disabled={loading}
            >
              {loading ? "CREANDO CUENTA…" : "CREAR Y JUGAR"}
            </button>
          </form>
        )}

        {/* ── Login tab ── */}
        {tab === "in" && !showReset && (
          <>
            <div className="auth-tabs" style={{ marginBottom: 12 }}>
              <button
                className={loginMode === "password" ? "on" : ""}
                onClick={() => {
                  setLoginMode("password");
                  clearError();
                }}
              >
                CONTRASEÑA
              </button>
              <button
                className={loginMode === "otp" ? "on" : ""}
                onClick={() => {
                  setLoginMode("otp");
                  clearError();
                }}
              >
                CÓDIGO POR EMAIL
              </button>
            </div>

            {loginMode === "password" && (
              <form onSubmit={handleLoginPassword}>
                <div className="field">
                  <label>Correo electrónico</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      clearError();
                    }}
                    placeholder="jugador@vault.gg"
                    autoComplete="email"
                  />
                </div>
                <div className="field">
                  <label>Contraseña</label>
                  <input
                    type="password"
                    value={loginPass}
                    onChange={(e) => {
                      setLoginPass(e.target.value);
                      clearError();
                    }}
                    placeholder="••••••••••"
                    autoComplete="current-password"
                  />
                </div>
                <button
                  className="btn lg"
                  type="submit"
                  style={{ width: "100%", marginTop: 8 }}
                  disabled={loading}
                >
                  {loading ? "INGRESANDO…" : "ENTRAR AL VAULT"}
                </button>
              </form>
            )}

            {loginMode === "otp" && (
              <form onSubmit={handleOtpRequest}>
                <div className="field">
                  <label>Correo electrónico</label>
                  <input
                    type="email"
                    value={otpEmail}
                    onChange={(e) => {
                      setOtpEmail(e.target.value);
                      clearError();
                    }}
                    placeholder="jugador@vault.gg"
                    autoComplete="email"
                  />
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: "var(--ink-faint)",
                    marginTop: 6,
                    lineHeight: 1.6,
                  }}
                >
                  Te enviaremos un código de {OTP_LENGTH} dígitos a tu correo.
                  Solo funciona con cuentas ya registradas.
                </div>
                <button
                  className="btn lg"
                  type="submit"
                  style={{ width: "100%", marginTop: 8 }}
                  disabled={loading}
                >
                  {loading ? "ENVIANDO…" : "ENVIAR CÓDIGO"}
                </button>
              </form>
            )}

            <button
              className="btn ghost"
              style={{ width: "100%", marginTop: 10, fontSize: 10 }}
              type="button"
              onClick={() => {
                setShowReset(true);
                clearError();
              }}
            >
              ¿OLVIDASTE TU CONTRASEÑA?
            </button>
          </>
        )}

        {/* ── Password reset inline form ── */}
        {tab === "in" && showReset && (
          <form onSubmit={handleReset}>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--ink-faint)",
                margin: "4px 0 12px",
                lineHeight: 1.7,
              }}
            >
              Ingresa tu correo y te enviaremos un enlace para restablecer tu
              contraseña.
            </div>
            <div className="field">
              <label>Correo electrónico</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => {
                  setResetEmail(e.target.value);
                  clearError();
                }}
                placeholder="jugador@vault.gg"
                autoComplete="email"
                autoFocus
              />
            </div>
            <button
              className="btn lg"
              type="submit"
              style={{ width: "100%", marginTop: 8 }}
              disabled={loading}
            >
              {loading ? "ENVIANDO…" : "ENVIAR ENLACE"}
            </button>
            <button
              className="btn ghost"
              type="button"
              style={{ width: "100%", marginTop: 8, fontSize: 10 }}
              onClick={() => {
                setShowReset(false);
                clearError();
              }}
            >
              VOLVER AL INICIO DE SESIÓN
            </button>
          </form>
        )}

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
