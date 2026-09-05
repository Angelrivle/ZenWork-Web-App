import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { COOKIE_NAMES } from "@zenwork/shared";
import { prisma } from "@zenwork/db";
import { getMessages, getMembers } from "@/lib/services";
import { ChatPanel } from "@/components/org/chat";

export default async function ProjectChatPage({
  params,
}: {
  params: Promise<{ slug: string; projectId: string }>;
}) {
  const { slug, projectId } = await params;

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

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
      organization: {
        slug,
        memberships: { some: { userId, isActive: true } },
      },
    },
    select: { id: true, name: true, organizationId: true },
  });

  if (!project) redirect("/login");

  const [messages, membership, members] = await Promise.all([
    getMessages(project.organizationId, 150, project.id),
    prisma.membership.findFirst({
      where: { organizationId: project.organizationId, userId, role: { in: ["OWNER", "ADMIN", "MEMBER"] } },
    }),
    getMembers(project.organizationId),
  ]);

  const projectBase = `/organizations/${slug}/projects/${project.id}`;

  return (
    <>
      <div className="crumb">
        <Link href={projectBase}>{project.name}</Link>
        <span>/</span>
        <span>Chat</span>
      </div>
      <header className="dash-header" style={{ marginBottom: 20 }}>
        <h1>Chat de {project.name}</h1>
        <p>Comunicación en tiempo real con tu equipo.</p>
      </header>

      <ChatPanel
        slug={slug}
        currentUserId={userId}
        projectId={project.id}
        initialMessages={messages.map((m) => ({
          id: m.id,
          content: m.content,
          parentId: m.parentId,
          createdAt: m.createdAt.toISOString(),
          author: m.author,
        }))}
        members={members.map((m) => ({
          id: m.id,
          name: m.name,
          avatar: m.avatar,
          role: m.role,
        }))}
        canSend={!!membership}
      />
    </>
  );
}