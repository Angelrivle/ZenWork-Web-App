import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { COOKIE_NAMES } from "@zenwork/shared";
import { prisma } from "@zenwork/db";
import { getMessages, getMembers } from "@/lib/services";
import { ChatPanel } from "@/components/org/chat";

export default async function ChatPage({
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

  const [messages, membership, members] = await Promise.all([
    getMessages(org.id, 150),
    prisma.membership.findFirst({
      where: { organizationId: org.id, userId, role: { in: ["OWNER", "ADMIN", "MEMBER"] } },
    }),
    getMembers(org.id),
  ]);

  return (
    <>
      <div className="crumb">
        <Link href={`/organizations/${slug}`}>{org.name}</Link>
        <span>/</span>
        <span>Chat</span>
      </div>
      <header className="dash-header" style={{ marginBottom: 20 }}>
        <h1>Chat de {org.name}</h1>
        <p>Comunicación en tiempo real con tu equipo.</p>
      </header>

      <ChatPanel
        slug={slug}
        currentUserId={userId}
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