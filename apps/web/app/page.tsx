import Link from "next/link";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@zenwork/auth";
import { COOKIE_NAMES } from "@zenwork/shared";
import { prisma } from "@zenwork/db";
import { ThemeToggle } from "@/components/theme-toggle";
import { LandingPage } from "@/components/landing";
import { AppHome, type HomeOrg, type PendingInvitation } from "@/components/app/app-home";
import { LogoutButton } from "@/app/organizations/org-client";
import { getPendingInvitationsForEmail } from "@/lib/services";
import { ZenWorkLogo } from "@/components/logo";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_NAMES.SESSION)?.value;

  if (sessionToken) {
    try {
      const payload = await verifyAccessToken(sessionToken);

      const orgs = await prisma.organization.findMany({
        where: {
          memberships: { some: { userId: payload.sub, isActive: true } },
          deletedAt: null,
        },
        include: {
          memberships: {
            where: { userId: payload.sub },
            select: { role: true },
          },
          projects: {
            where: { deletedAt: null },
            select: { id: true, name: true, key: true },
            take: 8,
            orderBy: { updatedAt: "desc" },
          },
          _count: {
            select: { projects: true, memberships: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const orgIds = orgs.map((o) => o.id);

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { name: true, email: true },
      });

      const [issues, boards, pendingInvitations] = await Promise.all([
        orgIds.length > 0
          ? prisma.issue.findMany({
              where: { project: { organizationId: { in: orgIds } }, deletedAt: null },
              select: { projectId: true },
            })
          : Promise.resolve([]),
        orgIds.length > 0
          ? prisma.board.findMany({
              where: { organizationId: { in: orgIds }, deletedAt: null },
              select: { organizationId: true },
            })
          : Promise.resolve([]),
        user ? getPendingInvitationsForEmail(user.email) : Promise.resolve([]),
      ]);

      const issueCounts = new Map<string, number>();
      for (const i of issues) {
        issueCounts.set(i.projectId, (issueCounts.get(i.projectId) || 0) + 1);
      }
      const boardCounts = new Map<string, number>();
      for (const b of boards) {
        boardCounts.set(b.organizationId, (boardCounts.get(b.organizationId) || 0) + 1);
      }

      const organizations: HomeOrg[] = orgs.map((o) => ({
        slug: o.slug,
        name: o.name,
        description: o.description,
        role: o.memberships[0]?.role || "MEMBER",
        projects: o.projects,
        stats: {
          projects: o._count.projects,
          members: o._count.memberships,
          issues: o.projects.reduce((sum, p) => sum + (issueCounts.get(p.id) || 0), 0),
          boards: boardCounts.get(o.id) || 0,
        },
      }));

      const invitations: PendingInvitation[] = pendingInvitations.map((i) => ({
        id: i.id,
        role: i.role,
        organizationSlug: i.organization.slug,
        organizationName: i.organization.name,
        invitedBy: i.invitedBy?.name || "Alguien",
      }));

      return (
        <div className="min-h-screen bg-background text-on-surface antialiased">
          <header className="h-topbar-height bg-surface/95 backdrop-blur-md border-b border-outline-variant/30 px-space-xl flex items-center justify-between sticky top-0 z-20">
            <Link href="/" className="flex items-center gap-space-sm">
              <ZenWorkLogo size="sm" />
            </Link>
            <div className="flex items-center gap-space-md">
              <ThemeToggle />
              <LogoutButton className="flex items-center gap-space-xs px-space-md py-space-xs font-body-sm text-body-sm text-error bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 transition-colors" />
            </div>
          </header>
          <main className="bg-background w-full">
            <AppHome
              userName={user?.name || ""}
              organizations={organizations}
              invitations={invitations}
            />
          </main>
        </div>
      );
    } catch (err) {
      console.error("[HomePage] Error verificando sesión en /:", err);
    }
  }

  return <LandingPage />;
}