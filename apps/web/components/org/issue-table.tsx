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
    <tbody>
      {rows.map((issue) => (
        <tr key={issue.id} onClick={() => router.push(`${basePath}/${issue.id}`)}>
          <td>
            <span className="issue-key">
              {projectKey}-{issue.number}
            </span>
            <span style={{ fontWeight: 600 }}>{issue.title}</span>
          </td>
          <td>
            <span className="badge dot" style={{ color: issue.status.color }}>
              {issue.status.name}
            </span>
          </td>
          <td>{PRIORITY_LABEL[issue.priority] || issue.priority}</td>
          <td>{issue.assignee?.name || "—"}</td>
          <td style={{ color: "var(--text-3)" }}>
            {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString("es-ES") : "—"}
          </td>
          <td>{issue.storyPoints ?? "—"}</td>
        </tr>
      ))}
    </tbody>
  );
}