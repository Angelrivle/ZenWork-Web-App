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

  const projects = await prisma.project.findMany({
    where: { organizationId: context.org.id, deletedAt: null },
    select: { id: true, name: true, key: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="dash">
      {/* SIDEBAR */}
      <aside className="dash-side">
        <Link href="/" className="brand">
          <span className="brand-logo">Z</span>
          ZenWork
        </Link>

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

        <div className="dash-side-footer">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </aside>

      {/* MAIN */}
      <main className="dash-main">
        <header className="dash-topbar">
          <span className="dash-topbar-title">ZenWork</span>
          <NotificationBell slug={slug} />
        </header>
        <div className="dash-content">{children}</div>
      </main>
    </div>
  );
}