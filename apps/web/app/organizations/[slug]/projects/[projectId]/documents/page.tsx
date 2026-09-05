import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { COOKIE_NAMES } from "@zenwork/shared";
import { prisma } from "@zenwork/db";
import { getDocuments } from "@/lib/services";
import { CreateDocumentButton } from "@/components/org/create-document";

export default async function ProjectDocumentsPage({
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

  const documents = await getDocuments(project.organizationId, project.id);
  const icons = ["📄", "📘", "🗂️", "📝", "🧭", "⭐"];
  const projectBase = `/organizations/${slug}/projects/${project.id}`;

  return (
    <>
      <div className="dash-toolbar">
        <div>
          <div className="crumb">
            <Link href={projectBase}>{project.name}</Link>
            <span>/</span>
            <span>Documentos</span>
          </div>
          <header className="dash-header" style={{ marginBottom: 0 }}>
            <h1>Documentos</h1>
            <p>Base de conocimiento colaborativa de {project.name}.</p>
          </header>
        </div>
        <div className="actions">
          <CreateDocumentButton slug={slug} projectId={project.id} />
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="empty-state">No hay documentos todavía. Crea el primero.</div>
      ) : (
        <div className="doc-list">
          {documents.map((d, i) => (
            <Link
              className="doc-card"
              href={`${projectBase}/documents/${d.id}`}
              key={d.id}
            >
              <div className="doc-icon">{d.icon || icons[i % icons.length]}</div>
              <h3>{d.title}</h3>
              <p>
                {d.isPublished ? "Publicado" : "Borrador"} ·{" "}
                {new Date(d.updatedAt).toLocaleDateString("es-ES")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}