import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { COOKIE_NAMES } from "@zenwork/shared";
import { prisma } from "@zenwork/db";

interface DueItem {
  id: string;
  title: string;
  type: "issue" | "card";
  dueDate: string;
  href: string;
  sub: string;
}

function fmt(date: Date) {
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function TareasPage({
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
    select: { id: true, name: true },
  });

  if (!org) redirect("/login");

  const [issues, cards] = await Promise.all([
    prisma.issue.findMany({
      where: {
        project: { organizationId: org.id },
        deletedAt: null,
        dueDate: { not: null },
      },
      select: {
        id: true,
        title: true,
        number: true,
        dueDate: true,
        status: { select: { name: true, color: true, category: true } },
        project: { select: { id: true, name: true, key: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.boardCard.findMany({
      where: {
        column: { board: { organizationId: org.id } },
        deletedAt: null,
        dueDate: { not: null },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        column: {
          select: {
            name: true,
            color: true,
            board: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const cardsWithChecklists = await prisma.boardCard.findMany({
    where: {
      column: { board: { organizationId: org.id } },
      deletedAt: null,
      checklists: { some: {} },
    },
    select: {
      id: true,
      title: true,
      checklists: {
        include: { items: true },
      },
      column: { select: { board: { select: { id: true, name: true } } } },
    },
    take: 20,
  });

  const dueItems: DueItem[] = [
    ...issues.map((i) => {
      const d = new Date(i.dueDate!);
      return {
        id: `i-${i.id}`,
        title: `${i.title}`,
        type: "issue" as const,
        dueDate: d.toISOString(),
        href: `/organizations/${slug}/projects/${i.project.id}/issues/${i.id}`,
        sub: `${i.project.key}-${i.number} · ${i.status.name}`,
      };
    }),
    ...cards.map((c) => {
      const d = new Date(c.dueDate!);
      return {
        id: `c-${c.id}`,
        title: c.title,
        type: "card" as const,
        dueDate: d.toISOString(),
        href: `/organizations/${slug}/boards/${c.column.board.id}`,
        sub: `${c.column.board.name} · ${c.column.name}`,
      };
    }),
  ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7 = new Date(today);
  in7.setDate(in7.getDate() + 7);

  const overdue = dueItems.filter((i) => new Date(i.dueDate) < today);
  const upcoming = dueItems.filter((i) => {
    const d = new Date(i.dueDate);
    return d >= today && d <= in7;
  });
  const later = dueItems.filter((i) => new Date(i.dueDate) > in7);

  function group(title: string, items: DueItem[], accent?: string) {
    return (
      <div className="task-group" key={title}>
        <h3>
          {title} <span className="count">{items.length}</span>
        </h3>
        {items.length === 0 ? (
          <p style={{ color: "var(--text-3)", fontSize: 13.5, margin: "0 0 8px" }}>Nada por aquí.</p>
        ) : (
          items.map((item) => {
            return (
              <Link className="task-row" href={item.href} key={item.id}>
                <span
                  className="badge"
                  style={{
                    background: item.type === "issue" ? "var(--brand-soft)" : "var(--success-soft)",
                    color: item.type === "issue" ? "var(--link)" : "var(--success)",
                  }}
                >
                  {item.type === "issue" ? "ISSUE" : "TARJETA"}
                </span>
                <span className="title">{item.title}</span>
                <span style={{ color: "var(--text-3)", fontSize: 12 }}>{item.sub}</span>
                <span className="due">
                  {fmt(new Date(item.dueDate))}
                </span>
              </Link>
            );
          })
        )}
      </div>
    );
  }

  return (
    <>
      <div className="crumb">
        <Link href={`/organizations/${slug}`}>{org.name}</Link>
        <span>/</span>
        <span>Vencimientos</span>
      </div>
      <header className="dash-header" style={{ marginBottom: 24 }}>
        <h1>Vencimientos</h1>
        <p>
          Fechas límite de issues y tarjetas de todos los proyectos de {org.name}, y el
          progreso de las checklists de las tarjetas del tablero.
        </p>
      </header>

      {overdue.length > 0 &&
        <div className={overdue.length ? "task-group" : ""} style={{ marginBottom: 26 }}>
          <h3 style={{ color: "var(--error)" }}>
            Vencidas <span className="count">{overdue.length}</span>
          </h3>
          <div className="task-group">
            {overdue.map((item) => (
              <Link className="task-row" href={item.href} key={item.id}>
                <span
                  className="badge"
                  style={{
                    background: item.type === "issue" ? "var(--brand-soft)" : "var(--success-soft)",
                    color: item.type === "issue" ? "var(--link)" : "var(--success)",
                  }}
                >
                  {item.type === "issue" ? "ISSUE" : "TARJETA"}
                </span>
                <span className="title">{item.title}</span>
                <span style={{ color: "var(--text-3)", fontSize: 12 }}>{item.sub}</span>
                <span className="due over">{fmt(new Date(item.dueDate))}</span>
              </Link>
            ))}
          </div>
        </div>
      }

      {group("Próximas (7 días)", upcoming)}
      {group("Más adelante", later)}

      <div className="task-group">
        <h3>
          Listas de tareas en tarjetas <span className="count">{cardsWithChecklists.length}</span>
        </h3>
        {cardsWithChecklists.length === 0 ? (
          <p style={{ color: "var(--text-3)", fontSize: 13.5, margin: 0 }}>
            Aún no hay checklists en las tarjetas.
          </p>
        ) : (
          <div className="dash-list">
            {cardsWithChecklists.map((card) => {
              const all = card.checklists.flatMap((l) => l.items);
              const done = all.filter((i) => i.isChecked).length;
              const pct = all.length ? Math.round((done / all.length) * 100) : 0;
              return (
                <Link
                  className="dash-item"
                  href={`/organizations/${slug}/boards/${card.column.board.id}`}
                  key={card.id}
                >
                  <span className="task-progress">
                    <span className="bar" style={{ width: 60 }}>
                      <i style={{ width: `${pct}%` }} />
                    </span>
                    {pct}%
                  </span>
                  <div className="dash-item-body">
                    <h3>{card.title}</h3>
                    <p>
                      {done}/{all.length} hechas · {card.column.board.name}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}