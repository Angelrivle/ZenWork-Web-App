import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { COOKIE_NAMES } from "@zenwork/shared";
import { ProfileClient } from "@/components/org/profile-client";

export default async function ProfilePage({
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
      include: {
        memberships: {
          where: { userId, isActive: true },
          select: { role: true },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        timezone: true,
        language: true,
        createdAt: true,
        twoFactorConfig: {
          select: { enabled: true },
        },
        accounts: {
          select: {
            id: true,
            provider: true,
            providerEmail: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  if (!org || !user) redirect("/login");

  const userRole = org.memberships[0]?.role || "MEMBER";

  return (
    <ProfileClient
      initialUser={{
        ...user,
        createdAt: user.createdAt.toISOString(),
        accounts: user.accounts.map((acc) => ({
          ...acc,
          createdAt: acc.createdAt.toISOString(),
        })),
      }}
      slug={slug}
      orgName={org.name}
      userRole={userRole}
    />
  );
}
