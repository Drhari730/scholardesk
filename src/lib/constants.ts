export const PROJECT_STATUSES = [
  { value: "IDEA", label: "Idea", color: "bg-violet-100 text-violet-700" },
  { value: "PLANNING", label: "Planning", color: "bg-blue-100 text-blue-700" },
  { value: "ACTIVE", label: "Active", color: "bg-emerald-100 text-emerald-700" },
  { value: "ON_HOLD", label: "On Hold", color: "bg-amber-100 text-amber-700" },
  { value: "COMPLETED", label: "Completed", color: "bg-slate-100 text-slate-700" },
  { value: "ARCHIVED", label: "Archived", color: "bg-gray-100 text-gray-600" },
] as const;

export const TASK_STATUSES = [
  { value: "TODO", label: "To Do", color: "bg-slate-100 text-slate-700" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-blue-100 text-blue-700" },
  { value: "BLOCKED", label: "Blocked", color: "bg-red-100 text-red-700" },
  { value: "COMPLETED", label: "Completed", color: "bg-emerald-100 text-emerald-700" },
] as const;

export const PUBLICATION_STATUSES = [
  { value: "DRAFT", label: "Draft", color: "bg-slate-100 text-slate-700" },
  { value: "SUBMITTED", label: "Submitted", color: "bg-blue-100 text-blue-700" },
  { value: "UNDER_REVIEW", label: "Under Review", color: "bg-amber-100 text-amber-700" },
  { value: "REVISION_REQUESTED", label: "Revision Requested", color: "bg-orange-100 text-orange-700" },
  { value: "RESUBMITTED", label: "Resubmitted", color: "bg-indigo-100 text-indigo-700" },
  { value: "ACCEPTED", label: "Accepted", color: "bg-emerald-100 text-emerald-700" },
  { value: "REJECTED", label: "Rejected", color: "bg-red-100 text-red-700" },
  { value: "PUBLISHED", label: "Published", color: "bg-teal-100 text-teal-700" },
] as const;

export const PERSON_ROLES = [
  { value: "STUDENT", label: "Student" },
  { value: "COLLEAGUE", label: "Colleague" },
  { value: "CO_INVESTIGATOR", label: "Co-Investigator" },
  { value: "RESEARCH_ASSISTANT", label: "Research Assistant" },
  { value: "EXTERNAL", label: "External" },
] as const;

export const EXAM_TYPES = [
  { value: "MIDTERM", label: "Midterm" },
  { value: "FINAL", label: "Final" },
  { value: "QUIZ", label: "Quiz" },
  { value: "ASSIGNMENT", label: "Assignment" },
  { value: "PRACTICAL", label: "Practical" },
] as const;

export const EXAM_STATUSES = [
  { value: "PLANNED", label: "Planned", color: "bg-blue-100 text-blue-700" },
  { value: "QP_READY", label: "QP Ready", color: "bg-amber-100 text-amber-700" },
  { value: "CONDUCTED", label: "Conducted", color: "bg-indigo-100 text-indigo-700" },
  { value: "GRADING", label: "Grading", color: "bg-orange-100 text-orange-700" },
  { value: "COMPLETED", label: "Completed", color: "bg-emerald-100 text-emerald-700" },
] as const;

export const QP_STATUSES = [
  { value: "NOT_STARTED", label: "Not Started", color: "bg-slate-100 text-slate-700" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-blue-100 text-blue-700" },
  { value: "REVIEW", label: "Under Review", color: "bg-amber-100 text-amber-700" },
  { value: "FINALIZED", label: "Finalized", color: "bg-emerald-100 text-emerald-700" },
] as const;

export const PRIORITIES = [
  { value: "LOW", label: "Low", color: "bg-slate-100 text-slate-600" },
  { value: "MEDIUM", label: "Medium", color: "bg-blue-100 text-blue-600" },
  { value: "HIGH", label: "High", color: "bg-orange-100 text-orange-600" },
  { value: "URGENT", label: "Urgent", color: "bg-red-100 text-red-600" },
] as const;

export const RESEARCH_PHASES = [
  { value: "PROTOCOL_DEVELOPMENT", label: "Protocol Development", color: "bg-violet-100 text-violet-700" },
  { value: "ETHICS_APPROVAL", label: "Ethics / IEC Approval", color: "bg-purple-100 text-purple-700" },
  { value: "RECRUITMENT", label: "Participant Recruitment", color: "bg-blue-100 text-blue-700" },
  { value: "DATA_COLLECTION", label: "Data Collection", color: "bg-cyan-100 text-cyan-700" },
  { value: "DATA_ENTRY", label: "Data Entry & Cleaning", color: "bg-sky-100 text-sky-700" },
  { value: "DATA_ANALYSIS", label: "Data Analysis", color: "bg-indigo-100 text-indigo-700" },
  { value: "MANUSCRIPT_WRITING", label: "Manuscript Writing", color: "bg-amber-100 text-amber-700" },
  { value: "SUBMISSION", label: "Journal Submission", color: "bg-orange-100 text-orange-700" },
  { value: "PEER_REVIEW", label: "Peer Review", color: "bg-yellow-100 text-yellow-800" },
  { value: "REVISION", label: "Revision", color: "bg-lime-100 text-lime-800" },
  { value: "DISSEMINATION", label: "Dissemination", color: "bg-emerald-100 text-emerald-700" },
  { value: "COMPLETED", label: "Completed", color: "bg-slate-100 text-slate-700" },
] as const;

export const PUBLICATION_MEMBER_ROLES = [
  { value: "LEAD_AUTHOR", label: "Lead Author" },
  { value: "CO_AUTHOR", label: "Co-Author" },
  { value: "CORRESPONDING_AUTHOR", label: "Corresponding Author" },
  { value: "WRITER", label: "Manuscript Writer" },
  { value: "SUBMITTER", label: "Submitter" },
  { value: "STATISTICIAN", label: "Statistician" },
  { value: "DATA_COLLECTOR", label: "Data Collector" },
  { value: "REVIEW_COORDINATOR", label: "Review Coordinator" },
] as const;

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh",
  "Multi-State", "National", "International",
] as const;

export function getStatusMeta<T extends { value: string; label: string; color?: string }>(
  statuses: readonly T[],
  value: string
): T {
  return statuses.find((s) => s.value === value) ?? statuses[0];
}
