import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  BadgeCheckIcon,
  BellIcon,
  BuildingIcon,
  ChecklistIcon,
  DatabaseIcon,
  DocumentIcon,
  KanbanIcon,
  KeyIcon,
  LayersIcon,
  LockIcon,
  ScrollIcon,
  ShieldIcon,
  WebhookIcon,
} from "@/components/icons";

const pillars = [
  {
    icon: ChecklistIcon,
    title: "Proyectos e Issues",
    desc: "Tipos configurables (Bug, Tarea, Historia, Épica), estados con workflow, prioridades, etiquetas, asignados y story points.",
    alt: "Estilo Jira",
  },
  {
    icon: KanbanIcon,
    title: "Tableros Kanban",
    desc: "Columnas configurables y drag & drop con posición fraccional. Tarjetas con checklist, fecha límite, etiquetas y miembros.",
    alt: "Estilo Trello",
  },
  {
    icon: DocumentIcon,
    title: "Documentos",
    desc: "Editor de bloques con jerarquía de páginas, enlaces entre documentos y contenido embebido de proyectos e issues.",
    alt: "Estilo Notion",
  },
];

const features = [
  {
    icon: BuildingIcon,
    title: "Multi-tenant por organización",
    desc: "Cada organización tiene sus proyectos, tableros, documentos y miembros. El usuario puede pertenecer a varias.",
  },
  {
    icon: WebhookIcon,
    title: "Webhooks salientes firmados",
    desc: "Registra tu propia URL con secreto y recibe eventos firmados con HMAC-SHA256 (header X-ZenWork-Signature).",
  },
  {
    icon: BellIcon,
    title: "Notificaciones multicanal",
    desc: "Event bus interno que enruta notificaciones a Email y Discord según las preferencias de cada usuario.",
  },
  {
    icon: LayersIcon,
    title: "API versionada",
    desc: "Endpoints REST bajo /api/webhooks/v1 y servicios desacoplados, listos para evolucionar sin romper contratos.",
  },
  {
    icon: DatabaseIcon,
    title: "Consistencia transaccional",
    desc: "Operaciones multi-tabla críticas dentro de $transaction, con constraints y soft deletes en entidades clave.",
  },
  {
    icon: ShieldIcon,
    title: "Listo para producción",
    desc: "Migramos de SQLite local a PostgreSQL o MySQL según tu elección, sin cambiar una línea de código de la app.",
  },
];

const security = [
  {
    icon: LockIcon,
    title: "Autenticación robusta",
    desc: "Argon2id para contraseñas, JWT de corta duración con refresh rotativo en cookie httpOnly, secure y sameSite=strict.",
  },
  {
    icon: KeyIcon,
    title: "2FA con TOTP",
    desc: "Verificación en dos pasos estándar RFC 6238 compatible con Google Authenticator y códigos de respaldo de un solo uso.",
  },
  {
    icon: ShieldIcon,
    title: "RBAC granular",
    desc: "Roles Owner, Admin, Member y Guest por organización, con permisos a nivel de proyecto y tablero.",
  },
  {
    icon: BadgeCheckIcon,
    title: "Rate limiting",
    desc: "Límites distintos para login (anti fuerza bruta), API general y webhooks entrantes. Distribuido con Redis en producción.",
  },
];

const securityBadges = [
  { icon: LockIcon, title: "Argon2id", desc: "Hash de contraseñas" },
  { icon: KeyIcon, title: "JWT rotativo", desc: "Access 15min + refresh" },
  { icon: BadgeCheckIcon, title: "Zod en cada boundary", desc: "Validación de entradas" },
  { icon: ScrollIcon, title: "Audit logs", desc: "Acciones sensibles rastreadas" },
];

const PillarIcon = ({ icon: Icon, size }: { icon: React.ElementType; size?: number }) => (
  <Icon size={size} />
);

function SecurityIcon({ icon: Icon }: { icon: React.ElementType }) {
  return <Icon size={20} />;
}

export function LandingPage() {
  return (
    <div className="landing">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link href="/" className="brand">
            <span className="brand-logo">Z</span>
            ZenWork
          </Link>
          <div className="nav-links">
            <a href="#producto">Producto</a>
            <a href="#funcionalidades">Funcionalidades</a>
            <a href="#seguridad">Seguridad</a>
            <ThemeToggle />
            <div className="nav-cta">
              <Link href="/login" className="btn btn-outline">
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="hero-badge">● Plataforma SaaS empresarial</span>
            <h1>
              Jira + Trello + Notion en{" "}
              <span className="grad-text">una sola plataforma</span>
            </h1>
            <p className="hero-sub">
              Gestiona proyectos e issues, organiza tableros Kanban y colabora en
              documentos, todo bajo la marca ZenWork: multi-tenant, segura por
              defecto y lista para producción.
            </p>
            <div className="hero-ctas">
              <Link href="/login" className="btn btn-primary btn-lg">
                Comenzar gratis
              </Link>
              <a href="#producto" className="btn btn-outline btn-lg">
                Ver el producto
              </a>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <strong>3-en-1</strong>
                <span>Issues, Kanban y Docs</span>
              </div>
              <div className="hero-stat">
                <strong>Multi-tenant</strong>
                <span>Por organización</span>
              </div>
              <div className="hero-stat">
                <strong>100%</strong>
                <span>Seguro por defecto</span>
              </div>
            </div>
          </div>

          {/* MOCKUP */}
          <div className="mock">
            <div className="mock-window">
              <div className="mock-bar">
                <span className="mock-dot r" />
                <span className="mock-dot y" />
                <span className="mock-dot g" />
              </div>
              <div className="mock-body">
                <div className="mock-sidebar">
                  <div className="mock-side-item active" />
                  <div className="mock-side-item" />
                  <div className="mock-side-item" />
                  <div className="mock-side-item" />
                </div>
                <div className="mock-main">
                  <div className="mock-kanban">
                    {[0, 1, 2].map((col) => (
                      <div className="mock-col" key={col}>
                        <div className="mock-col-h" />
                        <div className="mock-card">
                          <div className="mock-card-line tint" />
                          <div className="mock-card-line short" />
                          <div className="mock-card-line" />
                        </div>
                        <div className="mock-card">
                          <div className="mock-card-line" />
                          <div className="mock-chip" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mock-float-a">
              <span className="pill-check">✓</span> Issue creado con éxito
            </div>
            <div className="mock-float-b">
              <span className="pill-check">✓</span> Tarea movida a “En curso”
            </div>
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section className="section" id="producto">
        <div className="container">
          <span className="sec-tag">Producto</span>
          <h2 className="sec-title">Todo lo que tu equipo necesita, sin cambiar de herramienta</h2>
          <p className="sec-sub">
            ZenWork fusiona las funciones esenciales de las tres herramientas de
            productividad más usadas en una experiencia única y coherente.
          </p>
          <div className="pillars">
            {pillars.map((p) => (
              <div className="pillar" key={p.title}>
                <div className="pillar-icon">
                  <PillarIcon icon={p.icon} size={20} />
                </div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
                <div className="alt">{p.alt}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section bg-soft" id="funcionalidades">
        <div className="container">
          <span className="sec-tag">Funcionalidades</span>
          <h2 className="sec-title center">Diseñado para escalar desde el primer día</h2>
          <p className="sec-sub center">
            Arquitectura en monorepo con la lógica de negocio desacoplada de las
            rutas, para reutilizarse desde la API, los workers o futuros clientes.
          </p>
          <div className="features-grid">
            {features.map((f) => (
              <div className="feature" key={f.title}>
                <div className="feature-icon">
                  <PillarIcon icon={f.icon} size={17} />
                </div>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section className="section" id="seguridad">
        <div className="container sec-grid">
          <div>
            <span className="sec-tag">Seguridad</span>
            <h2 className="sec-title">Seguro por defecto, listo para producción</h2>
            <p className="sec-sub">
              Cada capa de ZenWork está protegida desde el diseño: autenticación,
              autorización, validación y auditoría.
            </p>
            <div className="sec-list">
              {security.map((item) => (
                <div className="sec-item" key={item.title}>
                  <div className="sec-item-bullet">
                    <SecurityIcon icon={item.icon} />
                  </div>
                  <div>
                    <h5>{item.title}</h5>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="sec-badges">
            {securityBadges.map((b) => (
              <div className="sec-badge" key={b.title}>
                <div className="feature-icon" style={{ margin: "0 auto 10px" }}>
                  <PillarIcon icon={b.icon} size={17} />
                </div>
                <strong>{b.title}</strong>
                <span>{b.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="cta-banner">
            <h2>Empieza a trabajar mejor hoy</h2>
            <p>
              Crea tu organización en ZenWork y provider de proyectos, tableros y
              documentos en menos de un minuto.
            </p>
            <Link href="/login" className="btn btn-lg">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container footer-grid">
          <p>© {new Date().getFullYear()} ZenWork. Todos los derechos reservados.</p>
          <div className="footer-links">
            <a href="#producto">Producto</a>
            <a href="#seguridad">Seguridad</a>
            <a href="/login">Iniciar sesión</a>
          </div>
        </div>
      </footer>
    </div>
  );
}