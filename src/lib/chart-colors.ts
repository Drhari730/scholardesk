export const CHART_PALETTE = [
  "#0D9488", // teal
  "#F59E0B", // amber
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F97316", // orange
  "#6366F1", // indigo
  "#14B8A6", // cyan
  "#EF4444", // red
] as const;

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94A3B8",
  SUBMITTED: "#3B82F6",
  UNDER_REVIEW: "#F59E0B",
  REVISION_REQUESTED: "#F97316",
  RESUBMITTED: "#8B5CF6",
  ACCEPTED: "#10B981",
  REJECTED: "#EF4444",
  PUBLISHED: "#0D9488",
  TODO: "#94A3B8",
  IN_PROGRESS: "#3B82F6",
  DELAYED: "#F59E0B",
  BLOCKED: "#EF4444",
  COMPLETED: "#10B981",
  IDEA: "#8B5CF6",
  PLANNING: "#6366F1",
  ACTIVE: "#0D9488",
  ON_HOLD: "#F59E0B",
  ARCHIVED: "#64748B",
  PLANNED: "#3B82F6",
  QP_READY: "#F59E0B",
  CONDUCTED: "#8B5CF6",
  GRADING: "#F97316",
};

export function colorForStatus(status: string, index = 0): string {
  return STATUS_COLORS[status] ?? CHART_PALETTE[index % CHART_PALETTE.length];
}
