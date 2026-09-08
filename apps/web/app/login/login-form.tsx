"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Estados para 2FA
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [isBackupCodeMode, setIsBackupCodeMode] = useState(false);

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        setLoading(false);
        return;
      }

      // Si el usuario tiene 2FA activado
      if (data.requires2FA && data.tempToken) {
        setRequires2FA(true);
        setTempToken(data.tempToken);
        setLoading(false);
        return;
      }

      // Ir al inicio de la app (organizaciones y proyectos) con recarga completa para asegurar cookies
      window.location.href = "/";
    } catch {
      setError("Error de conexión con el servidor");
      setLoading(false);
    }
  }

  async function handle2FASubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tempToken) {
      setError("Sesión temporal expirada. Inicia sesión nuevamente.");
      setRequires2FA(false);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-2fa-token": tempToken,
        },
        body: JSON.stringify({ token: twoFactorCode.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Código de verificación inválido");
        setLoading(false);
        return;
      }

      // 2FA verificado con éxito, redirigir
      router.push("/");
    } catch {
      setError("Error verificando el código con el servidor");
      setLoading(false);
    }
  }

  function handleReset() {
    setRequires2FA(false);
    setTempToken(null);
    setTwoFactorCode("");
    setError(null);
  }

  if (requires2FA) {
    return (
      <form onSubmit={handle2FASubmit}>
        {error && <div className="error">{error}</div>}
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 14, color: "var(--text-2)", margin: "0 0 12px" }}>
            {isBackupCodeMode
              ? "Ingresa uno de tus códigos de respaldo de 8 caracteres."
              : "Ingresa el código de 6 dígitos generado por tu aplicación autenticadora."}
          </p>
          <div className="field">
            <label htmlFor="twoFactorCode">
              {isBackupCodeMode ? "Código de respaldo" : "Código de verificación (TOTP)"}
            </label>
            <input
              id="twoFactorCode"
              type="text"
              required
              autoFocus
              autoComplete="one-time-code"
              className="input"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              placeholder={isBackupCodeMode ? "XXXXXXXX" : "123456"}
              style={{ letterSpacing: "2px", fontSize: "16px" }}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block btn-lg"
          disabled={loading || !twoFactorCode.trim()}
        >
          {loading ? "Verificando..." : "Confirmar e ingresar"}
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 13 }}>
          <button
            type="button"
            onClick={() => {
              setIsBackupCodeMode(!isBackupCodeMode);
              setTwoFactorCode("");
              setError(null);
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--link)",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {isBackupCodeMode ? "Usar código de autenticador" : "¿No tienes tu teléfono? Usar código de respaldo"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-3)",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ← Volver
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleCredentialsSubmit}>
      {error && <div className="error">{error}</div>}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@empresa.com"
        />
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
        {loading ? "Ingresando..." : "Iniciar sesión"}
      </button>
    </form>
  );
}