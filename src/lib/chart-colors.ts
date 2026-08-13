// Vibrant, modern chart palette (no dull greys)
export const CHART_PALETTE = [
  "#14B8A6", // teal
  "#6366F1", // indigo
  "#F59E0B", // amber
  "#EC4899", // pink
  "#8B5CF6", // violet
  "#22C55E", // green
  "#3B82F6", // blue
  "#F97316", // orange
  "#06B6D4", // cyan
  "#F43F5E", // rose
] as const;

// Status colors — kept meaningful (green = good, red = stop) but brightened so
// neutral states no longer render as dull grey slices.
export const STATUS_COLORS: Record<string, string> = {
  // Publications
  DRAFT: "#A78BFA", // violet-400
  SUBMITTED: "#3B82F6",
  UNDER_REVIEW: "#F59E0B",
  REVISION_REQUESTED: "#FB7185", // rose-400
  RESUBMITTED: "#8B5CF6",
  ACCEPTED: "#22C55E",
  REJECTED: "#EF4444",
  PUBLISHED: "#14B8A6",
  // Tasks
  TODO: "#60A5FA", // blue-400 (was grey)
  IN_PROGRESS: "#6366F1",
  DELAYED: "#F59E0B",
  BLOCKED: "#F43F5E",
  COMPLETED: "#22C55E",
  // Projects
  IDEA: "#C084FC", // purple-400
  PLANNING: "#818CF8", // indigo-400
  ACTIVE: "#14B8A6",
  ON_HOLD: "#FBBF24", // amber-400
  ARCHIVED: "#A8A29E", // stone-400 (soft, not slate-grey)
  // Exams
  PLANNED: "#3B82F6",
  QP_READY: "#F59E0B",
  CONDUCTED: "#8B5CF6",
  GRADING: "#F97316",
};

export function colorForStatus(status: string, index = 0): string {
  return STATUS_COLORS[status] ?? CHART_PALETTE[index % CHART_PALETTE.length];
}
