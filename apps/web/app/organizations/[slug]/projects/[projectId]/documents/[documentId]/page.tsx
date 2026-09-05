import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { COOKIE_NAMES } from "@zenwork/shared";
import { prisma } from "@zenwork/db";
import { getDocument } from "@/lib/services";
import { DocEditor } from "@/components/org/doc-editor";

export default async function ProjectDocumentDetailPage({
  params,
}: {
  params: Promise<{ slug: string; projectId: string; documentId: string }>;
}) {
  const { slug, projectId, documentId } = await params;

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

  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      projectId,
      deletedAt: null,
      organization: {
        slug,
        memberships: { some: { userId, isActive: true } },
      },
    },
    select: {
      id: true,
      title: true,
      content: true,
      organizationId: true,
    },
  });

  if (!doc) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!project) redirect("/login");

  const [fullDoc, membership] = await Promise.all([
    getDocument(doc.id),
    prisma.membership.findFirst({
      where: { organizationId: doc.organizationId, userId, role: { in: ["OWNER", "ADMIN", "MEMBER"] } },
    }),
  ]);

  const children = fullDoc?.children || [];
  const projectBase = `/organizations/${slug}/projects/${project.id}`;

  return (
    <>
      <div className="crumb" style={{ maxWidth: 820, margin: "0 auto 12px" }}>
        <Link href={projectBase}>{project.name}</Link>
        <span>/</span>
        <Link href={`${projectBase}/documents`}>Documentos</Link>
      </div>

      <DocEditor
        slug={slug}
        documentId={doc.id}
        initialTitle={doc.title}
        initialContent={fullDoc?.content}
        canEdit={!!membership}
      />

      {children.length > 0 && (
        <div style={{ maxWidth: 820, margin: "24px auto 0" }}>
          <div className="panel-title">Subpáginas</div>
          <div className="dash-list">
            {children.map((child) => (
              <Link
                className="dash-item"
                href={`${projectBase}/documents/${child.id}`}
                key={child.id}
              >
                <div className="dash-item-icon">{child.icon || "📄"}</div>
                <div className="dash-item-body">
                  <h3>{child.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}