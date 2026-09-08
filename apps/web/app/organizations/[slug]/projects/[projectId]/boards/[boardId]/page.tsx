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
    <div className="w-full">
      {/* Sub-header & Board Action Bar */}
      <section className="border-b border-outline-variant/30 bg-surface-dim px-space-xl py-space-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="space-y-space-2xs min-w-0">
            <nav className="flex items-center gap-space-xs font-label-sm text-label-sm text-outline">
              <Link href={`/organizations/${slug}`} className="hover:text-on-surface">
                {slug}
              </Link>
              <span>/</span>
              <Link href={projectBase} className="hover:text-on-surface truncate">
                {project.name}
              </Link>
              <span>/</span>
              <span className="text-primary font-medium">Tablero Kanban</span>
            </nav>
            <div className="flex items-baseline gap-space-md flex-wrap">
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                {board.name}
              </h1>
              <div className="flex items-center gap-space-xs font-code text-label-sm text-outline bg-surface-container px-space-sm py-space-2xs border border-outline-variant/40">
                <span className="text-on-surface font-semibold">{project.name}</span>
                <span className="text-outline-variant">•</span>
                <span className="text-primary">Directo</span>
                <span className="text-outline-variant">•</span>
                <span>{columns.reduce((s, c) => s + c.cards.length, 0)} tarjetas</span>
              </div>
            </div>
            {board.description && (
              <p className="font-body-sm text-body-sm text-outline mt-space-2xs max-w-2xl">
                {board.description}
              </p>
            )}
          </div>
        </div>
      </section>

      <KanbanBoard
        slug={slug}
        boardId={board.id}
        columns={columns}
        members={members}
        canEdit={!!membership}
      />
    </div>
  );
}