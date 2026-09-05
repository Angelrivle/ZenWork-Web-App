import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { COOKIE_NAMES } from "@zenwork/shared";
import { prisma } from "@zenwork/db";
import { getMembers, getInvitations } from "@/lib/services";
import { MembersManager } from "@/components/org/members-client";

export default async function MembersPage({
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
    include: {
      memberships: {
        where: { userId, isActive: true },
        select: { role: true },
      },
    },
  });

  if (!org) redirect("/login");

  const myRole = org.memberships[0]?.role || "GUEST";
  const canManage = myRole === "OWNER" || myRole === "ADMIN";
  const [members, invitations] = await Promise.all([getMembers(org.id), getInvitations(org.id)]);

  return (
    <>
      <div className="crumb">
        <Link href={`/organizations/${slug}`}>{org.name}</Link>
        <span>/</span>
        <span>Miembros</span>
      </div>
      <header className="dash-header" style={{ marginBottom: 20 }}>
        <h1>Miembros de {org.name}</h1>
        <p>
          Administra quién tiene acceso a esta organización y qué rol tiene.
          {canManage ? " Tú eres " + (myRole === "OWNER" ? "propietario" : "administrador") + "." : ""}
        </p>
      </header>

      <MembersManager
        slug={slug}
        orgName={org.name}
        members={members}
        invitations={invitations.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          invitedByName: i.invitedBy?.name,
          createdAt: i.createdAt.toISOString(),
        }))}
        myRole={myRole}
        canManage={canManage}
      />
    </>
  );
}