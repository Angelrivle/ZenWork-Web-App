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
    <div className="w-full">
      {/* Top Breadcrumb & Project Header Layer (Stitch) */}
      <div className="w-full bg-surface-container-low px-space-2xl pt-space-xl pb-space-lg border-b border-outline-variant/20">
        <div className="max-w-6xl mx-auto flex flex-col gap-space-md">
          {/* Monospaced Breadcrumb Track */}
          <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-outline tracking-wider uppercase">
            <Link href={`/organizations/${slug}`} className="hover:text-on-surface cursor-pointer transition-colors">
              {project.organization.name}
            </Link>
            <span className="text-outline-variant">/</span>
            <Link href={`/organizations/${slug}/projects`} className="hover:text-on-surface cursor-pointer transition-colors">
              Proyectos
            </Link>
            <span className="text-outline-variant">/</span>
            <Link href={`/organizations/${slug}/projects/${projectId}`} className="hover:text-on-surface cursor-pointer transition-colors">
              {project.name}
            </Link>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-medium">Opciones</span>
          </div>

          {/* Master Title & Contextual Meta Badges */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-lg">
            <div className="space-y-space-xs">
              <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                Opciones de {project.name}
              </h1>
              <div className="flex flex-wrap items-center gap-space-sm pt-space-2xs">
                <span className="font-code text-label-sm bg-surface-container-high text-primary px-space-sm py-space-2xs font-medium uppercase">
                  {project.key}
                </span>
                <div className="flex items-center gap-space-2xs bg-surface-container px-space-sm py-space-2xs">
                  <span className="w-1.5 h-1.5 bg-emerald-500 inline-block"></span>
                  <span className="font-label-sm text-label-sm text-on-surface">
                    {project.status === "ACTIVE" ? "Activo" : "Archivado"}
                  </span>
                </div>
                <span className="font-label-sm text-label-sm text-outline flex items-center gap-space-2xs bg-surface-container px-space-sm py-space-2xs">
                  <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                  Creado el {project.createdAt.toLocaleDateString("es-ES")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-space-sm self-start md:self-end">
              <Link
                href={`/organizations/${slug}/projects/${projectId}`}
                className="h-9 px-space-md bg-surface-container-high hover:bg-surface-variant text-on-surface font-body-sm text-body-sm transition-colors flex items-center gap-space-xs border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Volver al proyecto</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
}