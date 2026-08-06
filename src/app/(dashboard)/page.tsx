"use client";

import {
  FlaskConical,
  ClipboardList,
  BookOpen,
  GraduationCap,
  Bell,
  Users,
  AlertTriangle,
  Calendar,
  ExternalLink,
  Rocket,
  Sparkles,
  Plane,
  Mic2,
} from "lucide-react";
import Link from "next/link";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion";
import { DonutChartCard, PieChartCard } from "@/components/charts/chart-cards";
import { useFetch } from "@/lib/hooks";
import { formatDate, formatDateTime } from "@/lib/utils";
import { getDailyQuote, getGreeting, formatWelcomeDate } from "@/lib/quotes";
import {
  getStatusMeta,
  PUBLICATION_STATUSES,
  TASK_STATUSES,
  PROJECT_STATUSES,
  EXAM_STATUSES,
  EVENT_TYPES,
  EVENT_STATUSES,
} from "@/lib/constants";

interface DashboardData {
  stats: {
    activeProjects: number;
    pendingTasks: number;
    totalPublications: number;
    upcomingExams: number;
    overdueReminders: number;
    people: number;
    courses: number;
    monthEvents: number;
  };
  recentPublications: Array<{
    id: string;
    title: string;
    journal: string | null;
    status: string;
  }>;
  upcomingExams: Array<{
    id: string;
    title: string;
    examDate: string;
    course: { code: string; name: string };
  }>;
  upcomingReminders: Array<{
    id: string;
    title: string;
    dueDate: string;
    person: { name: string } | null;
  }>;
  recentProjects: Array<{
    id: string;
    title: string;
    status: string;
    members: Array<{ person: { name: string } }>;
  }>;
  pubStatusCounts: Array<{ status: string; _count: number }>;
  taskStatusCounts: Array<{ status: string; _count: number }>;
  projectStatusCounts: Array<{ status: string; _count: number }>;
  examStatusCounts: Array<{ status: string; _count: number }>;
  upcomingPlanning: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    startDate: string;
    endDate: string | null;
    location: string | null;
  }>;
}

interface PortfolioData {
  personalSite: string;
  profile: { name: string; title: string; publications: number; tools: number };
  projects: Array<{
    name: string;
    category: string;
    status: string;
    description: string;
    link: string;
  }>;
}

const statusBadge: Record<string, string> = {
  live: "bg-emerald-100 text-emerald-700",
  development: "bg-amber-100 text-amber-700",
  prototype: "bg-violet-100 text-violet-700",
  planned: "bg-slate-100 text-slate-600",
};

export default function DashboardPage() {
  const { data, loading } = useFetch<DashboardData>("/api/dashboard");
  const { data: portfolio } = useFetch<PortfolioData>("/api/portfolio");
  const { data: conflicts } = useFetch<Array<{ message: string; severity: string }>>("/api/conflicts");

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const pubChart = data.pubStatusCounts.map((p) => ({
    name: getStatusMeta(PUBLICATION_STATUSES, p.status).label,
    value: p._count,
    status: p.status,
  }));

  const taskChart = data.taskStatusCounts.map((t) => ({
    name: getStatusMeta(TASK_STATUSES, t.status).label,
    value: t._count,
    status: t.status,
  }));

  const projectChart = data.projectStatusCounts.map((p) => ({
    name: getStatusMeta(PROJECT_STATUSES, p.status).label,
    value: p._count,
    status: p.status,
  }));

  const examChart = data.examStatusCounts.map((e) => ({
    name: getStatusMeta(EXAM_STATUSES, e.status).label,
    value: e._count,
    status: e.status,
  }));

  const liveTools = portfolio?.projects.filter((p) => p.status === "live").length ?? 0;
  const quote = getDailyQuote();
  const greeting = getGreeting();
  const todayStr = formatWelcomeDate();

  return (
    <PageTransition>
      <FadeIn>
        <div className="mb-8 overflow-hidden rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-800 via-teal-700 to-teal-900 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-widest text-amber-300/80">{todayStr}</p>
              <h1 className="mt-2 font-serif text-2xl font-semibold sm:text-3xl">
                {greeting}, Dr. Hari Prakash
              </h1>
              <p className="mt-1 text-teal-100/80">Your unified academic command center</p>
            </div>
            <blockquote className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <Sparkles className="mb-2 h-4 w-4 text-amber-300" />
              <p className="text-sm italic leading-relaxed text-teal-50">&ldquo;{quote.text}&rdquo;</p>
              <footer className="mt-2 text-xs text-amber-200/70">— {quote.author}</footer>
            </blockquote>
          </div>
        </div>
      </FadeIn>

      <PageHeader
        title="Dashboard Overview"
        description={`${data.stats.monthEvents} events planned this month · research, teaching, publications`}
        action={
          <div className="flex gap-2">
            <Link
              href="/planning"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-teal-950 hover:bg-amber-400"
            >
              <Calendar className="h-4 w-4" />
              Month Planning
            </Link>
            <Link
              href="/calendar"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              <ExternalLink className="h-4 w-4" />
              Calendar
            </Link>
          </div>
        }
      />

      {conflicts && conflicts.length > 0 && (
        <FadeIn>
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-red-800">
              <AlertTriangle className="h-4 w-4" /> Schedule conflicts detected
            </p>
            <ul className="space-y-1 text-sm text-red-700">
              {conflicts.slice(0, 3).map((c, i) => <li key={i}>• {c.message}</li>)}
            </ul>
            <Link href="/planning" className="mt-2 inline-block text-xs font-medium text-red-800 underline">
              Review in Month Planning →
            </Link>
          </div>
        </FadeIn>
      )}

      {data.stats.overdueReminders > 0 && (
        <FadeIn>
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm">
              You have <strong>{data.stats.overdueReminders}</strong> overdue reminder
              {data.stats.overdueReminders > 1 ? "s" : ""}.{" "}
              <Link href="/reminders" className="font-medium underline">View reminders</Link>
            </p>
          </div>
        </FadeIn>
      )}

      <StaggerContainer className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <StatCard label="Active Projects" value={data.stats.activeProjects} icon={FlaskConical} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Pending Tasks" value={data.stats.pendingTasks} icon={ClipboardList} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Publications" value={data.stats.totalPublications} icon={BookOpen} trend={`${portfolio?.profile.publications ?? 43}+ on personal site`} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="This Month" value={data.stats.monthEvents} icon={Calendar} trend="Conferences, travel, leave" />
        </StaggerItem>
      </StaggerContainer>

      {data.upcomingPlanning.length > 0 && (
        <FadeIn className="mb-8">
          <Card className="border-indigo-100">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Upcoming — Conferences, Lectures & Travel</CardTitle>
              <Link href="/planning" className="text-sm font-medium text-teal-700 hover:underline">
                View month planner →
              </Link>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.upcomingPlanning.map((ev) => {
                const typeMeta = getStatusMeta(EVENT_TYPES, ev.type);
                const statusMeta = getStatusMeta(EVENT_STATUSES, ev.status);
                const Icon = ev.type === "GUEST_LECTURE" ? Mic2 : ev.type === "TRAVEL" ? Plane : Calendar;
                return (
                  <div key={ev.id} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    <div className={`rounded-lg p-2 ${typeMeta.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{ev.title}</p>
                      <p className="text-xs text-slate-500">{formatDate(ev.startDate)}</p>
                      {ev.location && <p className="text-xs text-slate-400">{ev.location}</p>}
                      <div className="mt-1 flex gap-1">
                        <Badge className={typeMeta.color}>{typeMeta.label}</Badge>
                        <Badge className={statusMeta.color}>{statusMeta.label}</Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </FadeIn>
      )}

      <div className="mb-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <FadeIn delay={0.05}>
          <DonutChartCard
            title="Publication Pipeline"
            description="Manuscript status breakdown"
            data={pubChart}
          />
        </FadeIn>
        <FadeIn delay={0.1}>
          <PieChartCard
            title="Task Distribution"
            description="Research & teaching tasks"
            data={taskChart}
          />
        </FadeIn>
        <FadeIn delay={0.15}>
          <DonutChartCard
            title="Research Projects"
            description="By project phase"
            data={projectChart}
            innerRadius={50}
            outerRadius={80}
          />
        </FadeIn>
        <FadeIn delay={0.2}>
          <PieChartCard
            title="Exam Lifecycle"
            description="Exam planning & grading"
            data={examChart}
          />
        </FadeIn>
      </div>

      {portfolio && (
        <FadeIn delay={0.22} className="mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-teal-700" />
                  Your Digital Health Portfolio
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Tools & projects from your personal website — Onco Care, Prama AI, VEDA, Sangam & more
                </p>
              </div>
              <a
                href={portfolio.personalSite}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
              >
                Personal site <ExternalLink className="h-3 w-3" />
              </a>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {portfolio.projects.slice(0, 6).map((project) => (
                  <a
                    key={project.name}
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 transition-all hover:border-teal-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-800 group-hover:text-teal-800">
                        {project.name}
                      </h3>
                      <Badge className={statusBadge[project.status] ?? statusBadge.planned}>
                        {project.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-teal-600">{project.category}</p>
                    <p className="mt-2 line-clamp-2 text-xs text-slate-500">{project.description}</p>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <FadeIn delay={0.25} className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-teal-700" />
                Upcoming Reminders
              </CardTitle>
              <Link href="/reminders" className="text-xs text-teal-700 hover:underline">View all</Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.upcomingReminders.length === 0 ? (
                <p className="text-sm text-slate-400">No upcoming reminders</p>
              ) : (
                data.upcomingReminders.map((r) => (
                  <div key={r.id} className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
                    <p className="text-sm font-medium text-slate-800">{r.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDateTime(r.dueDate)}
                      {r.person && ` · ${r.person.name}`}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.3} className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-teal-700" />
                Active Research
              </CardTitle>
              <Link href="/research" className="text-xs text-teal-700 hover:underline">View all</Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.recentProjects.length === 0 ? (
                <p className="text-sm text-slate-400">No projects yet</p>
              ) : (
                data.recentProjects.map((p) => {
                  const meta = getStatusMeta(PROJECT_STATUSES, p.status);
                  return (
                    <div key={p.id} className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
                      <p className="text-sm font-medium text-slate-800">{p.title}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge className={meta.color}>{meta.label}</Badge>
                        <span className="text-xs text-slate-400">
                          {p.members.length} member{p.members.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.35} className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-teal-700" />
                Recent Publications
              </CardTitle>
              <Link href="/publications" className="text-xs text-teal-700 hover:underline">View all</Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.recentPublications.map((p) => {
                const meta = getStatusMeta(PUBLICATION_STATUSES, p.status);
                return (
                  <div key={p.id} className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
                    <p className="line-clamp-1 text-sm font-medium text-slate-800">{p.title}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge className={meta.color}>{meta.label}</Badge>
                      {p.journal && <span className="text-xs text-slate-400">{p.journal}</span>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
