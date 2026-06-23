"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authProvider } from "@/lib/auth";
import { checkPassword } from "@/lib/auth/password";
import type { AuthErrorCode } from "@/lib/auth";

const ERROR_MSGS: Partial<Record<AuthErrorCode, string>> = {
  weak_password: "La contraseña no cumple los requisitos.",
  unknown: "Ocurrió un error inesperado. Intenta nuevamente.",
};

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

export default function RecuperarPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  // Supabase sets a session when the user arrives via the reset link.
  // We wait for that session before showing the form.
  useEffect(() => {
    authProvider.getSession().then((user) => {
      setReady(true);
      if (!user) {
        // No session — link expired or already used
        router.replace("/acceso");
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { valid } = checkPassword(password);
    if (!valid) {
      setError("La contraseña no cumple los requisitos indicados.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    const result = await authProvider.updatePassword({ password });
    setLoading(false);
    if (!result.ok) {
      setError(ERROR_MSGS[result.error] ?? ERROR_MSGS.unknown!);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/acceso"), 2500);
  }

  if (!ready) return null;

  if (done) {
    return (
      <div className="av-auth-wrap fade-in">
        <div className="auth-card">
          <div className="auth-header">
            <div className="mark" />
            <h2 className="neon-cyan">ARCADE VAULT</h2>
          </div>
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <div
              className="mono"
              style={{ color: "var(--cyan)", fontSize: 13, marginBottom: 8 }}
            >
              CONTRASEÑA ACTUALIZADA
            </div>
            <div
              className="mono"
              style={{
                color: "var(--ink-faint)",
                fontSize: 11,
                lineHeight: 1.7,
              }}
            >
              Redirigiendo al inicio de sesión…
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            NUEVA CONTRASEÑA
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="••••••••••"
              autoComplete="new-password"
              autoFocus
            />
          </div>
          <PasswordChecklist password={password} />
          <div className="field" style={{ marginTop: 8 }}>
            <label>Confirmar contraseña</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError(null);
              }}
              placeholder="••••••••••"
              autoComplete="new-password"
            />
          </div>
          <button
            className="btn lg"
            type="submit"
            style={{ width: "100%", marginTop: 12 }}
            disabled={loading}
          >
            {loading ? "GUARDANDO…" : "GUARDAR CONTRASEÑA"}
          </button>
        </form>
      </div>
    </div>
  );
}
