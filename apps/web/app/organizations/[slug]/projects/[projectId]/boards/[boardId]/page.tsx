import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { COOKIE_NAMES } from "@zenwork/shared";
import { prisma } from "@zenwork/db";
import { getBoard, getMembers } from "@/lib/services";
import { KanbanBoard } from "@/components/org/kanban";

export default async function ProjectBoardDetailPage({
  params,
}: {
  params: Promise<{ slug: string; projectId: string; boardId: string }>;
}) {
  const { slug, projectId, boardId } = await params;

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

  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      projectId,
      deletedAt: null,
      organization: {
        slug,
        memberships: { some: { userId, isActive: true } },
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      organizationId: true,
    },
  });

  if (!board) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!project) redirect("/login");

  const [fullBoard, members, membership] = await Promise.all([
    getBoard(board.id),
    getMembers(board.organizationId),
    prisma.membership.findFirst({
      where: { organizationId: board.organizationId, userId, role: { in: ["OWNER", "ADMIN", "MEMBER"] } },
    }),
  ]);

  const columns = (fullBoard?.columns || []).map((col) => ({
    id: col.id,
    name: col.name,
    color: col.color,
    cards: col.cards.map((card) => ({
      id: card.id,
      title: card.title,
      description: card.description,
      dueDate: card.dueDate ? new Date(card.dueDate).toISOString() : null,
      assignee: card.assignee,
      checklists: card.checklists.map((cl: { id: string; title: string; items: Array<{ id: string; text: string; isChecked: boolean }> }) => ({
        id: cl.id,
        title: cl.title,
        items: cl.items,
      })),
    })),
  }));

  const projectBase = `/organizations/${slug}/projects/${project.id}`;

  return (
    <>
      <div className="dash-toolbar" style={{ marginBottom: 18 }}>
        <div>
          <div className="crumb">
            <Link href={projectBase}>{project.name}</Link>
            <span>/</span>
            <Link href={`${projectBase}/boards`}>Tablero</Link>
            <span>/</span>
            <span>{board.name}</span>
          </div>
          <header className="dash-header" style={{ marginBottom: 0 }}>
            <h1>{board.name}</h1>
            <p>{board.description || "Arrastra las tarjetas para moverlas."}</p>
          </header>
        </div>
      </div>

      <KanbanBoard
        slug={slug}
        boardId={board.id}
        columns={columns}
        members={members}
        canEdit={!!membership}
      />
    </>
  );
}