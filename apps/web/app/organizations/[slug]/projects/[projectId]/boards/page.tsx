import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { COOKIE_NAMES } from "@zenwork/shared";
import { prisma } from "@zenwork/db";
import { getBoards } from "@/lib/services";
import { CreateBoardButton } from "@/components/org/create-board";

export default async function ProjectBoardsPage({
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
    select: { id: true, name: true, key: true, organizationId: true },
  });

  if (!project) redirect("/login");

  let boards = await getBoards(project.organizationId, project.id);
  
  // Si no hay tableros, crear el primer tablero automáticamente para entrar directo
  if (boards.length === 0) {
    const defaultBoard = await createBoard(project.organizationId, {
      name: "Tablero Principal",
      description: `Tablero de tarjetas y tareas de ${project.name}`,
      projectId: project.id,
    });
    redirect(`/organizations/${slug}/projects/${project.id}/boards/${defaultBoard.id}`);
  }

  // Redirigir directamente al primer tablero para no mostrar cards intermedias
  redirect(`/organizations/${slug}/projects/${project.id}/boards/${boards[0].id}`);
}