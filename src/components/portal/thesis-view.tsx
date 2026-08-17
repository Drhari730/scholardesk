"use client";

import { GraduationCap, CalendarDays, CheckCircle2, Circle, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { DEGREES, THESIS_STATUSES, MILESTONE_STATUSES } from "@/lib/constants";

type Milestone = { id: string; title: string; start: string; end: string; status: string };

interface Thesis {
  title: string;
  degree: string;
  status: string;
  startDate: string | null;
  expectedEndDate: string | null;
  milestones: string | null;
}

function pick<T extends { value: string }>(list: readonly T[], v: string): T {
  return list.find((x) => x.value === v) ?? list[0];
}

function parseMs(raw: string | null): Milestone[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p.filter((m) => m && m.title && m.start && m.end) : [];
  } catch {
    return [];
  }
}

function StatusIcon({ status }: { status: string }) {
  if (status === "DONE") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "IN_PROGRESS") return <Clock className="h-4 w-4 text-blue-500" />;
  if (status === "DELAYED") return <AlertTriangle className="h-4 w-4 text-orange-500" />;
  return <Circle className="h-4 w-4 text-slate-300" />;
}

export function ThesisView({ thesis }: { thesis: Thesis }) {
  const ms = parseMs(thesis.milestones).sort((a, b) => (a.start < b.start ? -1 : 1));
  const done = ms.filter((m) => m.status === "DONE").length;
  const progress = ms.length ? Math.round((done / ms.length) * 100) : 0;
  const deg = pick(DEGREES, thesis.degree);
  const st = pick(THESIS_STATUSES, thesis.status);

  return (
    <section>
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-slate-800">
        <GraduationCap className="h-5 w-5 text-teal-600" /> My Thesis
      </h2>
      <p className="mb-3 text-xs text-slate-500">Your thesis progress and milestones, tracked with your supervisor.</p>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={deg.color}>{deg.label}</Badge>
            <Badge className={st.color}>{st.label}</Badge>
          </div>
          <p className="mt-2 font-medium text-slate-900">{thesis.title}</p>
          {(thesis.startDate || thesis.expectedEndDate) && (
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
              <CalendarDays className="h-3.5 w-3.5" />
              {thesis.startDate ? formatDate(thesis.startDate) : "—"} → {thesis.expectedEndDate ? formatDate(thesis.expectedEndDate) : "—"}
            </p>
          )}

          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>Overall progress</span>
              <span>{progress}% · {done}/{ms.length} milestones</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {ms.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
              {ms.map((m) => {
                const mm = pick(MILESTONE_STATUSES, m.status);
                return (
                  <div key={m.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5"><StatusIcon status={m.status} /></span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${m.status === "DONE" ? "text-slate-400 line-through" : "text-slate-700"}`}>
                        {m.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDate(m.start)} → {formatDate(m.end)}
                      </p>
                    </div>
                    <Badge className={`${mm.color} shrink-0`}>{mm.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
