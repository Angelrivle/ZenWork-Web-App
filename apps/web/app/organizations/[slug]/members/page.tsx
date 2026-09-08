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
    <div className="w-full">
      {/* Top Header Stitch */}
      <div className="w-full bg-surface-container-low px-space-xl py-space-md flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b border-outline-variant/20">
        <div className="flex flex-col gap-space-2xs min-w-0">
          <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-outline uppercase tracking-wider">
            <Link href={`/organizations/${slug}`} className="hover:text-on-surface">
              {org.name}
            </Link>
            <span>/</span>
            <span className="text-on-surface font-medium">Miembros</span>
            <span className="ml-space-xs px-space-xs py-space-2xs bg-surface-container font-code text-label-sm text-primary">
              {slug.toUpperCase()}
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-none mt-space-2xs">
            Miembros de {org.name}
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-2xl mt-space-2xs">
            Administra quién tiene acceso a esta organización y qué rol tiene asignado.
            {canManage
              ? ` Eres ${myRole === "OWNER" ? "propietario" : "administrador"}.`
              : " Solo lectura."}
          </p>
        </div>
      </div>

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
    </div>
  );
}