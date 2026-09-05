import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { COOKIE_NAMES } from "@zenwork/shared";
import { prisma } from "@zenwork/db";
import { getMembers } from "@/lib/services";
import { IssueEditor } from "@/components/org/issue-page";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ slug: string; projectId: string; issueId: string }>;
}) {
  const { slug, projectId, issueId } = await params;

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

  const issue = await prisma.issue.findFirst({
    where: {
      id: issueId,
      projectId,
      project: {
        organization: {
          slug,
          memberships: { some: { userId, isActive: true } },
        },
      },
      deletedAt: null,
    },
    select: {
      id: true,
      number: true,
      title: true,
      description: true,
      priority: true,
      storyPoints: true,
      dueDate: true,
      type: { select: { id: true, name: true, color: true } },
      status: { select: { id: true, name: true, color: true } },
      assignee: { select: { id: true, name: true, avatar: true } },
      creator: { select: { id: true, name: true, avatar: true } },
      project: { select: { key: true, organizationId: true } },
      comments: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!issue) redirect("/login");

  const [statuses, members] = await Promise.all([
    prisma.issueStatus.findMany({
      where: { projectId },
      select: { id: true, name: true, color: true },
      orderBy: { sortOrder: "asc" },
    }),
    getMembers(issue.project.organizationId),
  ]);

  return (
    <IssueEditor
      slug={slug}
      projectId={projectId}
      issueId={issue.id}
      projectKey={issue.project.key}
      issue={{
        ...issue,
        dueDate: issue.dueDate ? issue.dueDate.toISOString() : null,
        comments: issue.comments.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        })),
      }}
      statuses={statuses}
      members={members}
      canEdit
    />
  );
}