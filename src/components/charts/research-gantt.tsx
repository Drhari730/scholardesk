"use client";

import { RESEARCH_PHASES, getStatusMeta } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

interface Project {
  id: string;
  title: string;
  researchPhase: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
}

export function ResearchGantt({ projects }: { projects: Project[] }) {
  const withDates = projects.filter((p) => p.startDate);
  if (!withDates.length) {
    return (
      <p className="text-sm text-slate-500">
        Add start dates to projects to see the timeline view.
      </p>
    );
  }

  const now = Date.now();
  const starts = withDates.map((p) => new Date(p.startDate!).getTime());
  const ends = withDates.map((p) =>
    p.endDate ? new Date(p.endDate).getTime() : now + 90 * 24 * 60 * 60 * 1000
  );
  const min = Math.min(...starts);
  const max = Math.max(...ends, now);
  const span = max - min || 1;

  return (
    <div className="space-y-3">
      <div className="relative h-2 rounded-full bg-slate-100">
        <div
          className="absolute top-0 h-2 w-0.5 bg-teal-600"
          style={{ left: `${((now - min) / span) * 100}%` }}
          title="Today"
        />
      </div>
      {withDates.map((p) => {
        const start = new Date(p.startDate!).getTime();
        const end = p.endDate ? new Date(p.endDate).getTime() : now + 30 * 24 * 60 * 60 * 1000;
        const left = ((start - min) / span) * 100;
        const width = Math.max(((end - start) / span) * 100, 2);
        const phase = getStatusMeta(RESEARCH_PHASES, p.researchPhase);
        return (
          <div key={p.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-800 truncate pr-2">{p.title}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 ${phase.color}`}>{phase.label}</span>
            </div>
            <div className="relative h-6 rounded-lg bg-slate-50">
              <div
                className="absolute top-1 h-4 rounded-md bg-gradient-to-r from-teal-600 to-teal-400"
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${formatDate(p.startDate!)}${p.endDate ? ` → ${formatDate(p.endDate)}` : ""}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
