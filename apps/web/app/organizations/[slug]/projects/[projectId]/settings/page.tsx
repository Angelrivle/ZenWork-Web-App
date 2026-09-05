import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { COOKIE_NAMES } from "@zenwork/shared";
import { prisma } from "@zenwork/db";
import { ProjectSettingsManager } from "@/components/org/project-settings-client";

export default async function ProjectSettingsPage({
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
      organization: { slug, memberships: { some: { userId, isActive: true } } },
    },
    include: {
      organization: {
        select: {
          name: true,
          memberships: {
            where: { userId, isActive: true },
            select: { role: true },
          },
        },
      },
    },
  });

  if (!project) redirect(`/organizations/${slug}`);

  const [types, statuses, labels] = await Promise.all([
    prisma.issueType.findMany({ where: { projectId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.issueStatus.findMany({ where: { projectId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.label.findMany({ where: { projectId }, orderBy: { name: "asc" } }),
  ]);

  const myRole = project.organization.memberships[0]?.role || "GUEST";
  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  return (
    <>
      <div className="crumb">
        <Link href={`/organizations/${slug}`}>{project.organization.name}</Link>
        <span>/</span>
        <Link href={`/organizations/${slug}/projects`}>Proyectos</Link>
        <span>/</span>
        <Link href={`/organizations/${slug}/projects/${projectId}`}>{project.name}</Link>
        <span>/</span>
        <span>Opciones</span>
      </div>
      <header className="dash-header" style={{ marginBottom: 16 }}>
        <h1>Opciones de {project.name}</h1>
        <p>
          {project.key} · {project.status === "ACTIVE" ? "Activo" : "Archivado"} · Creado el{" "}
          {project.createdAt.toLocaleDateString("es-ES")}
        </p>
      </header>

      <ProjectSettingsManager
        slug={slug}
        projectId={projectId}
        initial={{
          name: project.name,
          key: project.key,
          description: project.description,
          status: project.status,
        }}
        types={types.map((t) => ({ id: t.id, name: t.name, color: t.color, icon: t.icon, isDefault: t.isDefault }))}
        statuses={statuses.map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color,
          category: s.category,
          sortOrder: s.sortOrder,
          isDefault: s.isDefault,
        }))}
        labels={labels.map((l) => ({ id: l.id, name: l.name, color: l.color }))}
        canManage={canManage}
      />
    </>
  );
}