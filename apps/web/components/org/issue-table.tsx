"use client";

import { useRouter } from "next/navigation";

export interface IssueRow {
  id: string;
  number: number;
  title: string;
  priority: string;
  storyPoints: number | null;
  dueDate: string | null;
  status: { name: string; color: string };
  assignee: { name: string } | null;
}

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
  BLOCKER: "Bloqueante",
};

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "URGENT":
    case "CRITICAL":
    case "BLOCKER":
      return (
        <div className="flex items-center gap-space-xs text-error font-semibold">
          <span className="material-symbols-outlined text-[16px]">priority_high</span>
          <span className="font-code text-label-sm uppercase">
            {PRIORITY_LABEL[priority] || priority}
          </span>
        </div>
      );
    case "HIGH":
      return (
        <div className="flex items-center gap-space-xs text-error">
          <span className="material-symbols-outlined text-[16px]">keyboard_double_arrow_up</span>
          <span className="font-code text-label-sm uppercase">Alta</span>
        </div>
      );
    case "LOW":
      return (
        <div className="flex items-center gap-space-xs text-outline">
          <span className="material-symbols-outlined text-[16px]">keyboard_arrow_down</span>
          <span className="font-code text-label-sm uppercase">Baja</span>
        </div>
      );
    case "MEDIUM":
    default:
      return (
        <div className="flex items-center gap-space-xs text-secondary">
          <span className="material-symbols-outlined text-[16px]">equal</span>
          <span className="font-code text-label-sm uppercase">Media</span>
        </div>
      );
  }
}

export function IssueTableBody({
  rows,
  projectKey,
  basePath,
}: {
  rows: IssueRow[];
  projectKey: string;
  basePath: string;
}) {
  const router = useRouter();
  return (
    <tbody className="divide-y divide-outline-variant/20 font-body-sm text-body-sm">
      {rows.map((issue) => (
        <tr
          key={issue.id}
          className="hover:bg-surface-container-high transition-colors group cursor-pointer"
          onClick={() => router.push(`${basePath}/${issue.id}`)}
        >
          <td className="py-space-sm px-space-md font-code text-label-sm text-primary font-medium">
            {projectKey}-{issue.number}
          </td>
          <td className="py-space-sm px-space-md text-on-surface font-body-md text-body-md font-medium group-hover:text-primary transition-colors">
            {issue.title}
          </td>
          <td className="py-space-sm px-space-md">
            <span
              className="inline-flex items-center px-space-xs py-space-2xs bg-surface-container border border-outline-variant/40 font-code text-label-sm text-outline uppercase tracking-wider"
              style={issue.status.color ? { borderColor: issue.status.color, color: issue.status.color } : {}}
            >
              {issue.status.name}
            </span>
          </td>
          <td className="py-space-sm px-space-md">{getPriorityBadge(issue.priority)}</td>
          <td className="py-space-sm px-space-md">
            {issue.assignee ? (
              <div className="flex items-center gap-space-xs">
                <div className="w-5 h-5 bg-primary-container text-on-primary font-code text-label-sm flex items-center justify-center font-semibold">
                  {issue.assignee.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-on-surface truncate">{issue.assignee.name}</span>
              </div>
            ) : (
              <span className="text-outline font-code text-label-sm">Sin asignar</span>
            )}
          </td>
          <td className="py-space-sm px-space-md font-code text-label-sm text-outline">
            {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString("es-ES") : "—"}
          </td>
          <td className="py-space-sm px-space-md font-code text-label-sm text-outline">
            {issue.storyPoints ?? "—"}
          </td>
        </tr>
      ))}
    </tbody>
  );
}