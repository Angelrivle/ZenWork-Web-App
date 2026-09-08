import Link from "next/link";
import { RegisterForm } from "./register-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { ZenWorkLogo } from "@/components/logo";

export default function RegisterPage() {
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
        <h1 className="auth-title">Crear tu cuenta</h1>
        <p className="auth-sub">
          Regístrate para crear tu organización y empezar a trabajar.
        </p>

        <RegisterForm />

        <div className="auth-links">
          <Link href="/">← Inicio</Link>
          <Link href="/login">¿Ya tienes cuenta? Inicia sesión</Link>
        </div>
      </div>
    </main>
  );
}