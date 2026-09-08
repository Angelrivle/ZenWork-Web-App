import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { COOKIE_NAMES } from "@zenwork/shared";
import { getOrgContext } from "@/lib/services";
import { OrgSwitcher, OrgNav, LogoutButton } from "../org-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/org/notification-bell";
import { CommandPalette } from "@/components/org/command-palette";
import { ZenWorkLogo } from "@/components/logo";

export default async function OrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_NAMES.SESSION)?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  let userId: string;
  try {
    const payload = await verifyAccessToken(sessionToken);
    userId = payload.sub;
  } catch {
    redirect("/login");
  }

  const context = await getOrgContext(slug, userId);

  if (!context) {
    redirect("/login");
  }

  const [projects, boards, documents] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: context.org.id, deletedAt: null },
      select: { id: true, name: true, key: true },
      orderBy: { name: "asc" },
    }),
    prisma.board.findMany({
      where: { organizationId: context.org.id, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.document.findMany({
      where: { organizationId: context.org.id, deletedAt: null },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
      take: 20,
    }),
  ]);

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased">
      {/* SIDEBAR MODERNO ZENWORK */}
      <aside className="fixed top-0 left-0 bottom-0 w-sidebar-width bg-surface-container-low border-r border-outline-variant/40 shadow-[1px_0_12px_rgba(0,0,0,0.35)] flex flex-col z-30 select-none">
        <OrgSwitcher current={slug} organizations={context.organizations} />

        <OrgNav
          slug={slug}
          orgName={context.org.name}
          projects={projects.map((p) => ({
            id: p.id,
            name: p.name,
            key: p.key,
          }))}
        />

        <div className="border-t border-outline-variant/30 p-space-sm bg-surface-container-lowest/90 space-y-space-2xs">
          <nav className="space-y-space-2xs">
            <Link
              href="/"
              className="flex items-center gap-space-sm px-space-sm py-2 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all rounded-[4px]"
            >
              <span className="material-symbols-outlined text-[18px] text-outline">home</span>
              <span>Inicio</span>
            </Link>
            <div className="px-space-sm py-1.5 flex items-center justify-between text-body-sm text-outline">
              <span className="text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">palette</span>
                <span>Tema</span>
              </span>
              <ThemeToggle />
            </div>
            <LogoutButton className="flex items-center gap-space-sm px-space-sm py-2 font-body-sm text-body-sm text-error/90 hover:bg-error/10 hover:text-error transition-all rounded-[4px] w-full text-left" />
          </nav>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="pl-sidebar-width min-h-screen flex flex-col">
        <header className="fixed top-0 left-sidebar-width right-0 h-topbar-height bg-surface/95 backdrop-blur-md border-b border-outline-variant/30 z-20 flex items-center justify-between px-space-lg">
          <div className="flex items-center gap-space-lg flex-1">
            <CommandPalette
              slug={slug}
              projects={projects}
              boards={boards}
              documents={documents}
            />
          </div>
          <div className="flex items-center gap-space-md">
            <Link
              href={`/organizations/${slug}/projects`}
              className="flex items-center gap-space-xs bg-primary-container hover:bg-inverse-primary text-on-surface px-space-md py-space-xs font-body-sm text-body-sm font-medium border border-primary-container transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Crear</span>
            </Link>
            <NotificationBell slug={slug} />
            <Link
              href={`/organizations/${slug}/profile`}
              title="Mi Perfil"
              className="w-9 h-9 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/40 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-outline hover:text-on-surface text-[20px]">
                person
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 pt-topbar-height bg-background w-full">
          <div className="flex flex-col w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}