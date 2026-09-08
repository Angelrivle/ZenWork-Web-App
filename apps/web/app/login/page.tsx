import Link from "next/link";
import { LoginForm } from "./login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { ZenWorkLogo } from "@/components/logo";

const discordConfigured = Boolean(
  process.env.ZENWORK_DISCORD_CLIENT_ID && process.env.ZENWORK_DISCORD_CLIENT_SECRET
);
const githubConfigured = Boolean(
  process.env.ZENWORK_GITHUB_CLIENT_ID && process.env.ZENWORK_GITHUB_CLIENT_SECRET
);

const ERROR_MESSAGES: Record<string, string> = {
  oauth_not_configured: "El inicio de sesión con este proveedor no está configurado aún.",
  oauth_denied: "Inicio de sesión cancelado.",
  oauth_failed: "No se pudo completar el inicio de sesión. Intenta de nuevo.",
};

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { COOKIE_NAMES } from "@zenwork/shared";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registered?: string }>;
}) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_NAMES.SESSION)?.value;
  if (sessionToken) {
    try {
      await verifyAccessToken(sessionToken);
      redirect("/");
    } catch {
      // Token expirado o inválido, permitir login
    }
  }

  const params = await searchParams;

  return (
    <main className="auth-wrap">
      <div className="auth-glow" />
      <div className="auth-topbar">
        <Link href="/" className="brand" style={{ display: "flex", alignItems: "center" }}>
          <ZenWorkLogo size="sm" />
        </Link>
        <ThemeToggle />
      </div>

      <div className="auth-card">
        <h1 className="auth-title">Iniciar sesión</h1>
        <p className="auth-sub">Accede a tu organización para continuar.</p>

        {params.error && (
          <div className="error">
            {ERROR_MESSAGES[params.error] || "Ocurrió un error. Intenta de nuevo."}
          </div>
        )}
        {params.registered && (
          <div className="success">Cuenta creada. Inicia sesión con tus credenciales.</div>
        )}

        <LoginForm />

        {(discordConfigured || githubConfigured) && <div className="divider">o continúa con</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {discordConfigured && (
            <a className="btn btn-oauth" href="/api/auth/discord">
              <DiscordIcon />
              Continuar con Discord
            </a>
          )}
          {githubConfigured && (
            <a className="btn btn-oauth" href="/api/auth/github">
              <GitHubIcon />
              Continuar con GitHub
            </a>
          )}
        </div>

        <div className="auth-links">
          <Link href="/">← Inicio</Link>
          <Link href="/register">¿No tienes cuenta? Regístrate</Link>
        </div>
      </div>
    </main>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.616-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}