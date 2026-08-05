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
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion";
import { useFetch } from "@/lib/hooks";
import { formatDate, formatDateTime } from "@/lib/utils";
import { getStatusMeta, PUBLICATION_STATUSES, TASK_STATUSES } from "@/lib/constants";

interface DashboardData {
  stats: {
    activeProjects: number;
    pendingTasks: number;
    totalPublications: number;
    upcomingExams: number;
    overdueReminders: number;
    people: number;
    courses: number;
  };
  recentPublications: Array<{
    id: string;
    title: string;
    journal: string | null;
    status: string;
    updatedAt: string;
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
    isCompleted: boolean;
    person: { name: string } | null;
  }>;
  pubStatusCounts: Array<{ status: string; _count: number }>;
  taskStatusCounts: Array<{ status: string; _count: number }>;
}

const CHART_COLORS = ["#0f5c5c", "#d4a853", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function DashboardPage() {
  const { data, loading } = useFetch<DashboardData>("/api/dashboard");

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
    count: p._count,
  }));

  const taskChart = data.taskStatusCounts.map((t) => ({
    name: getStatusMeta(TASK_STATUSES, t.status).label,
    count: t._count,
  }));

  return (
    <PageTransition>
      <PageHeader
        title="Welcome back, Dr. Hari Prakash"
        description="Your unified academic command center — research, teaching, and publications at a glance."
      />

      {data.stats.overdueReminders > 0 && (
        <FadeIn>
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm">
              You have <strong>{data.stats.overdueReminders}</strong> overdue reminder
              {data.stats.overdueReminders > 1 ? "s" : ""}.{" "}
              <Link href="/reminders" className="font-medium underline">
                View reminders
              </Link>
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
          <StatCard label="Courses" value={data.stats.courses} icon={GraduationCap} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Team Members" value={data.stats.people} icon={Users} />
        </StaggerItem>
      </StaggerContainer>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle>Publication Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              {pubChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={pubChart}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {pubChart.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-sm text-slate-400">No publications yet</p>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.15}>
          <Card>
            <CardHeader>
              <CardTitle>Task Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {taskChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={taskChart}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {taskChart.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-sm text-slate-400">No tasks yet</p>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <FadeIn delay={0.2} className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-teal-700" />
                Upcoming Reminders
              </CardTitle>
              <Link href="/reminders" className="text-xs text-teal-700 hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.upcomingReminders.length === 0 ? (
                <p className="text-sm text-slate-400">No upcoming reminders</p>
              ) : (
                data.upcomingReminders.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5"
                  >
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

        <FadeIn delay={0.25} className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-teal-700" />
                Upcoming Exams
              </CardTitle>
              <Link href="/exams" className="text-xs text-teal-700 hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.upcomingExams.length === 0 ? (
                <p className="text-sm text-slate-400">No upcoming exams</p>
              ) : (
                data.upcomingExams.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5"
                  >
                    <p className="text-sm font-medium text-slate-800">{e.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {e.course.code} · {formatDate(e.examDate)}
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
                <BookOpen className="h-4 w-4 text-teal-700" />
                Recent Publications
              </CardTitle>
              <Link href="/publications" className="text-xs text-teal-700 hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.recentPublications.length === 0 ? (
                <p className="text-sm text-slate-400">No publications yet</p>
              ) : (
                data.recentPublications.map((p) => {
                  const meta = getStatusMeta(PUBLICATION_STATUSES, p.status);
                  return (
                    <div
                      key={p.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5"
                    >
                      <p className="line-clamp-1 text-sm font-medium text-slate-800">
                        {p.title}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge className={meta.color}>{meta.label}</Badge>
                        {p.journal && (
                          <span className="text-xs text-slate-400">{p.journal}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
