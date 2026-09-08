import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { COOKIE_NAMES } from "@zenwork/shared";
import { NotificationsCenterClient } from "@/components/org/notifications-center-client";

export default async function NotificationsPage({
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

  const [org, user] = await Promise.all([
    prisma.organization.findFirst({
      where: {
        slug,
        memberships: { some: { userId, isActive: true } },
        deletedAt: null,
      },
      select: { id: true, name: true, slug: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    }),
  ]);

  if (!org || !user) redirect("/login");

  const [notifications, pendingInvites] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.invitation.findMany({
      where: {
        email: user.email.toLowerCase(),
        status: "PENDING",
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        invitedBy: { select: { id: true, name: true } },
      },
    }),
  ]);

  const inviteNotifications = pendingInvites.map((inv) => ({
    id: `inv-${inv.id}`,
    type: "invite",
    title: "Invitación a organización",
    message: `${inv.invitedBy?.name || "Un administrador"} te invitó a unirte a "${inv.organization.name}" como ${inv.role}.`,
    data: { invitationId: inv.id, organizationSlug: inv.organization.slug },
    readAt: null,
    createdAt: inv.createdAt.toISOString(),
  }));

  const standardNotifications = notifications.map((n) => {
    let parsedData: Record<string, unknown> = {};
    try {
      parsedData = JSON.parse(n.data || "{}");
    } catch {
      parsedData = {};
    }
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      data: parsedData,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    };
  });

  const allNotifications = [...inviteNotifications, ...standardNotifications];

  return (
    <NotificationsCenterClient
      initialNotifications={allNotifications}
      slug={slug}
      orgName={org.name}
    />
  );
}
