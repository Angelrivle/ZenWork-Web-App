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

  function group(title: string, items: DueItem[], statusColor: string, icon: string) {
    return (
      <div className="space-y-space-sm" key={title}>
        <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/30">
          <div className="flex items-center gap-space-xs">
            <span className={`material-symbols-outlined text-[18px] ${statusColor}`}>{icon}</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-medium">{title}</h2>
            <span className="font-code text-label-sm px-space-xs py-space-2xs bg-surface-container-high text-on-surface-variant ml-space-xs border border-outline-variant/30">
              {items.length}
            </span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="p-space-lg bg-surface border border-outline-variant/20 text-outline font-body-sm text-center flex items-center justify-center gap-space-xs">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>No hay entregas pendientes para este período. Todo al día.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="p-space-md bg-surface hover:bg-surface-container-high border border-outline-variant/30 hover:border-outline-variant/60 transition-all flex flex-col justify-between group shadow-sm"
              >
                <div className="space-y-space-xs">
                  <div className="flex items-center justify-between gap-space-xs">
                    <span
                      className={`font-code text-label-sm px-1.5 py-0.5 uppercase border ${
                        item.type === "issue"
                          ? "bg-primary-container/15 text-primary border-primary/30"
                          : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {item.type === "issue" ? "INCIDENCIA" : "TARJETA TABLERO"}
                    </span>
                    <div className="flex items-center gap-1 font-code text-label-sm text-outline">
                      <span className="material-symbols-outlined text-[14px]">event</span>
                      <span>{fmt(new Date(item.dueDate))}</span>
                    </div>
                  </div>
                  <h3 className="font-body-md text-body-md font-medium text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                </div>
                <div className="pt-space-sm mt-space-sm border-t border-outline-variant/20 flex items-center justify-between text-outline font-label-sm text-label-sm">
                  <span className="truncate">{item.sub}</span>
                  <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Sub-header & Context Layer */}
      <section className="border-b border-outline-variant/30 bg-surface-dim px-space-xl py-space-lg">
        <div className="space-y-space-2xs min-w-0">
          <nav className="flex items-center gap-space-xs font-label-sm text-label-sm text-outline uppercase tracking-wider">
            <Link href={`/organizations/${slug}`} className="hover:text-on-surface">
              {org.name}
            </Link>
            <span>/</span>
            <span className="text-primary font-medium">Control de Entregas y Plazos</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-space-md">
            <div>
              <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                Control de Plazos y Vencimientos
              </h1>
              <p className="font-body-sm text-body-sm text-outline mt-1 max-w-3xl">
                Monitorea de forma centralizada todas las fechas límite de incidencias de proyectos y tarjetas de tableros Kanban en {org.name}.
              </p>
            </div>
            <div className="flex items-center gap-space-sm shrink-0">
              <div className="flex items-center gap-space-xs font-code text-label-sm text-outline bg-surface-container px-space-md py-space-xs border border-outline-variant/40">
                <span className="text-on-surface font-semibold">{dueItems.length}</span>
                <span>compromisos totales</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="p-space-xl max-w-7xl mx-auto space-y-space-2xl">
        {/* Metric Strip de Salud de Plazos */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
          <div className="p-space-md bg-surface border border-outline-variant/30 flex items-center justify-between">
            <div>
              <p className="font-label-sm text-label-sm uppercase tracking-wider text-error">Vencidas</p>
              <p className="font-headline-md text-headline-md font-semibold text-error">{overdue.length}</p>
            </div>
            <span className="material-symbols-outlined text-error text-[28px]">warning</span>
          </div>
          <div className="p-space-md bg-surface border border-outline-variant/30 flex items-center justify-between">
            <div>
              <p className="font-label-sm text-label-sm uppercase tracking-wider text-primary">Próximos 7 días</p>
              <p className="font-headline-md text-headline-md font-semibold text-primary">{upcoming.length}</p>
            </div>
            <span className="material-symbols-outlined text-primary text-[28px]">schedule</span>
          </div>
          <div className="p-space-md bg-surface border border-outline-variant/30 flex items-center justify-between">
            <div>
              <p className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Más adelante</p>
              <p className="font-headline-md text-headline-md font-semibold text-on-surface">{later.length}</p>
            </div>
            <span className="material-symbols-outlined text-outline text-[28px]">calendar_month</span>
          </div>
          <div className="p-space-md bg-surface border border-outline-variant/30 flex items-center justify-between">
            <div>
              <p className="font-label-sm text-label-sm uppercase tracking-wider text-emerald-400">Listas Checklist</p>
              <p className="font-headline-md text-headline-md font-semibold text-emerald-400">{cardsWithChecklists.length}</p>
            </div>
            <span className="material-symbols-outlined text-emerald-400 text-[28px]">checklist</span>
          </div>
        </section>

        {/* Tareas Vencidas */}
        {overdue.length > 0 && (
          <div className="border border-error/40 bg-error/5 p-space-lg space-y-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs text-error font-headline-sm text-headline-sm font-semibold">
                <span className="material-symbols-outlined text-[20px]">error</span>
                <span>Requieren atención inmediata ({overdue.length})</span>
              </div>
              <span className="font-code text-label-sm text-error uppercase">PLAZO EXPIRADO</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
              {overdue.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="p-space-md bg-surface border border-error/30 hover:border-error transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-space-xs">
                    <div className="flex items-center justify-between gap-space-xs">
                      <span className="font-code text-label-sm px-1.5 py-0.5 uppercase bg-error/15 text-error border border-error/30">
                        {item.type === "issue" ? "INCIDENCIA" : "TARJETA"}
                      </span>
                      <span className="font-code text-label-sm text-error font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">event_busy</span>
                        <span>Venció el {fmt(new Date(item.dueDate))}</span>
                      </span>
                    </div>
                    <h3 className="font-body-md text-body-md font-medium text-on-surface group-hover:text-error transition-colors line-clamp-2">
                      {item.title}
                    </h3>
                  </div>
                  <div className="pt-space-sm mt-space-sm border-t border-outline-variant/20 flex items-center justify-between text-outline font-label-sm text-label-sm">
                    <span className="truncate">{item.sub}</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Próximas Entregas */}
        {group("Próximos 7 días", upcoming, "text-primary", "event_upcoming")}

        {/* Entregas Posteriores */}
        {group("Planificadas más adelante", later, "text-outline", "date_range")}

        {/* Checklists y Subtareas */}
        <section className="space-y-space-sm pt-space-md">
          <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/30">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-medium">Progreso de checklists en tableros</h2>
              <span className="font-code text-label-sm px-space-xs py-space-2xs bg-surface-container-high text-on-surface-variant ml-space-xs border border-outline-variant/30">
                {cardsWithChecklists.length}
              </span>
            </div>
          </div>

          {cardsWithChecklists.length === 0 ? (
            <div className="p-space-lg bg-surface border border-outline-variant/20 text-outline font-body-sm text-center">
              Aún no hay listas de tareas o checklists configuradas en las tarjetas del tablero.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-sm">
              {cardsWithChecklists.map((card) => {
                const all = card.checklists.flatMap((l) => l.items);
                const done = all.filter((i) => i.isChecked).length;
                const pct = all.length ? Math.round((done / all.length) * 100) : 0;
                return (
                  <Link
                    className="p-space-md bg-surface hover:bg-surface-container-high border border-outline-variant/30 transition-all flex flex-col justify-between group"
                    href={`/organizations/${slug}/boards/${card.column.board.id}`}
                    key={card.id}
                  >
                    <div className="space-y-space-xs">
                      <div className="flex items-center justify-between text-outline font-label-sm text-label-sm">
                        <span className="truncate">{card.column.board.name}</span>
                        <span className="font-code text-on-surface font-semibold">{pct}%</span>
                      </div>
                      <h3 className="font-body-md text-body-md font-medium text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                        {card.title}
                      </h3>
                    </div>
                    <div className="pt-space-sm mt-space-sm border-t border-outline-variant/20 space-y-1">
                      <div className="h-1.5 w-full bg-surface-container-high overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-label-sm text-label-sm text-outline block text-right">
                        {done} de {all.length} ítems completados
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}