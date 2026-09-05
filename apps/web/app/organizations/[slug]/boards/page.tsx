import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { COOKIE_NAMES } from "@zenwork/shared";
import { prisma } from "@zenwork/db";
import { getBoards } from "@/lib/services";
import { CreateBoardButton } from "@/components/org/create-board";

export default async function BoardsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_NAMES.SESSION)?.value;
  if (!sessionToken) redirect("/login");

  let userId: string;
  try {
    const payload = await verifyAccessToken(sessionToken);
    userId = payload.sub;
  } catch {
    redirect("/login");
  }

  const org = await prisma.organization.findFirst({
    where: {
      slug,
      memberships: { some: { userId, isActive: true } },
      deletedAt: null,
    },
    select: { id: true, name: true },
  });

  if (!org) redirect("/login");

  const [boards, membership] = await Promise.all([
    getBoards(org.id),
    prisma.membership.findFirst({
      where: { organizationId: org.id, userId, role: { in: ["OWNER", "ADMIN", "MEMBER"] } },
    }),
  ]);

  return (
    <>
      <div className="dash-toolbar">
        <div>
          <div className="crumb">
            <Link href={`/organizations/${slug}`}>{org.name}</Link>
            <span>/</span>
            <span>Tableros</span>
          </div>
          <header className="dash-header" style={{ marginBottom: 0 }}>
            <h1>Tableros</h1>
            <p>Kanban para visualizar y mover el trabajo de tu equipo.</p>
          </header>
        </div>
        <div className="actions">
          <CreateBoardButton slug={slug} canCreate={!!membership} />
        </div>
      </div>

      {boards.length === 0 ? (
        <div className="empty-state">No hay tableros todavía. Crea uno para empezar.</div>
      ) : (
        <div className="doc-list">
          {boards.map((b) => {
            const cards = b.columns.reduce((s, c) => s + c._count.cards, 0);
            return (
              <Link className="doc-card" href={`/organizations/${slug}/boards/${b.id}`} key={b.id}>
                <div className="doc-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 3v18M3 9h6" />
                  </svg>
                </div>
                <h3>{b.name}</h3>
                <p>
                  {b.columns.map((c) => c.name).join(" · ") || "Sin columnas"} · {cards} tarjetas
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}