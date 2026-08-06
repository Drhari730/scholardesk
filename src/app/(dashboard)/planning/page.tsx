"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Plane,
  Mic2,
  Presentation,
  Palmtree,
  CalendarDays,
  MapPin,
  X,
  AlertTriangle,
  Check,
} from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { DialogRoot, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { PageTransition, ScrollReveal } from "@/components/ui/motion";
import { useFetch, apiPost, apiPatch, apiDelete } from "@/lib/hooks";
import { formatDate } from "@/lib/utils";
import { EVENT_TYPES, EVENT_STATUSES, getStatusMeta } from "@/lib/constants";
import { parseChecklist, type ChecklistItem } from "@/lib/checklists";

interface ScheduleConflict {
  type: string;
  message: string;
  severity: string;
}

interface AcademicEvent {
  id: string;
  title: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  venue: string | null;
  organizer: string | null;
  hostInstitution: string | null;
  description: string | null;
  prepNotes: string | null;
  travelMode: string | null;
  travelDetails: string | null;
  accommodation: string | null;
  presentationTitle: string | null;
  honorarium: string | null;
  notes: string | null;
  checklist: string | null;
}

const TYPE_ICONS: Record<string, typeof Plane> = {
  CONFERENCE: Presentation,
  GUEST_LECTURE: Mic2,
  TRAVEL: Plane,
  LEAVE: Palmtree,
  WORKSHOP: CalendarDays,
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function PlanningPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [filter, setFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [defaultType, setDefaultType] = useState("CONFERENCE");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [createConflicts, setCreateConflicts] = useState<ScheduleConflict[]>([]);

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const { data: events, loading, refetch } = useFetch<AcademicEvent[]>(
    `/api/academic-events?month=${monthKey}${filter !== "ALL" ? `&type=${filter}` : ""}`
  );
  const { data: conflicts } = useFetch<ScheduleConflict[]>("/api/conflicts");

  const calendarDays = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = first.getDay();
    const days: Array<{ date: Date | null; iso: string }> = [];
    for (let i = 0; i < startPad; i++) days.push({ date: null, iso: "" });
    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(year, month, d);
      days.push({ date, iso: date.toISOString().split("T")[0] });
    }
    return days;
  }, [year, month]);

  function eventsOnDay(iso: string) {
    return events?.filter((e) => {
      const start = e.startDate.split("T")[0];
      const end = e.endDate?.split("T")[0] ?? start;
      return iso >= start && iso <= end;
    }) ?? [];
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  }

  function openForm(type: string, date?: string) {
    setDefaultType(type);
    setSelectedDate(date ?? new Date().toISOString().split("T")[0]);
    setShowForm(true);
  }

  async function createEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const result = await apiPost("/api/academic-events", {
      ...Object.fromEntries(fd),
      startDate: fd.get("startDate") + "T09:00:00",
      endDate: fd.get("endDate") ? fd.get("endDate") + "T18:00:00" : null,
      sendEmail: fd.get("sendEmail") === "on",
      remindEmail: fd.get("remindEmail") === "on",
    });
    if (result.conflicts?.length) {
      setCreateConflicts(result.conflicts);
    } else {
      setCreateConflicts([]);
      setShowForm(false);
    }
    refetch();
  }

  async function toggleChecklistItem(eventId: string, items: ChecklistItem[], itemId: string) {
    const updated = items.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    await apiPatch(`/api/academic-events/${eventId}`, { checklist: updated });
    refetch();
  }

  async function updateStatus(id: string, status: string) {
    await apiPatch(`/api/academic-events/${id}`, { status, sendEmail: true });
    refetch();
  }

  async function deleteEvent(id: string) {
    if (!confirm("Delete this event?")) return;
    await apiDelete(`/api/academic-events/${id}`);
    refetch();
  }

  const upcoming = events?.filter((e) => new Date(e.startDate) >= today).slice(0, 8) ?? [];

  return (
    <PageTransition>
      <PageHeader
        title="Month Planning"
        description="Conferences, guest lectures, travel, and leave — plan and prepare in one place."
        action={
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.slice(0, 4).map((t) => (
              <Button key={t.value} size="sm" variant="outline" onClick={() => openForm(t.value)}>
                <Plus className="h-3 w-3" /> {t.label}
              </Button>
            ))}
          </div>
        }
      />

      {conflicts && conflicts.length > 0 && (
        <div className="mb-6 space-y-2">
          {conflicts.map((c, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm ${
                c.severity === "critical"
                  ? "border border-red-200 bg-red-50 text-red-800"
                  : "border border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {c.message}
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {["ALL", ...EVENT_TYPES.map((t) => t.value)].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              filter === f ? "bg-teal-700 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {f === "ALL" ? "All" : EVENT_TYPES.find((t) => t.value === f)?.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
            <CardTitle className="text-base">
              {MONTH_NAMES[month]} {year}
            </CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}>
                Today
              </Button>
              <Button size="sm" variant="ghost" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (!day.date) return <div key={`empty-${i}`} className="min-h-[72px]" />;
                const dayEvents = eventsOnDay(day.iso);
                const isToday = day.iso === today.toISOString().split("T")[0];
                return (
                  <button
                    key={day.iso}
                    onClick={() => openForm("CONFERENCE", day.iso)}
                    className={`min-h-[72px] rounded-xl border p-1.5 text-left transition-all hover:border-teal-300 hover:bg-teal-50/50 ${
                      isToday ? "border-teal-500 bg-teal-50 ring-1 ring-teal-200" : "border-slate-100 bg-white"
                    }`}
                  >
                    <span className={`text-xs font-semibold ${isToday ? "text-teal-700" : "text-slate-700"}`}>
                      {day.date.getDate()}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map((ev) => {
                        const meta = getStatusMeta(EVENT_TYPES, ev.type);
                        return (
                          <div key={ev.id} className={`truncate rounded px-1 text-[10px] ${meta.color}`}>
                            {ev.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <p className="text-[10px] text-slate-400">+{dayEvents.length - 2} more</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="skeleton h-32 rounded-xl" />
              ) : !upcoming.length ? (
                <p className="text-sm text-slate-400">No upcoming events. Click a date or add one above.</p>
              ) : (
                upcoming.map((ev, idx) => {
                  const typeMeta = getStatusMeta(EVENT_TYPES, ev.type);
                  const statusMeta = getStatusMeta(EVENT_STATUSES, ev.status);
                  const Icon = TYPE_ICONS[ev.type] ?? CalendarDays;
                  return (
                    <ScrollReveal key={ev.id} delay={idx * 0.04}>
                      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <div className="flex items-start gap-2">
                          <div className={`rounded-lg p-1.5 ${typeMeta.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{ev.title}</p>
                            <p className="text-xs text-slate-400">
                              {formatDate(ev.startDate)}
                              {ev.endDate && ev.endDate !== ev.startDate && ` – ${formatDate(ev.endDate)}`}
                            </p>
                            {ev.location && (
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                                <MapPin className="h-3 w-3" /> {ev.location}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-1">
                              <Badge className={typeMeta.color}>{typeMeta.label}</Badge>
                              <Badge className={statusMeta.color}>{statusMeta.label}</Badge>
                            </div>
                          </div>
                          <button onClick={() => deleteEvent(ev.id)} className="text-slate-300 hover:text-red-500">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <Select
                          value={ev.status}
                          onChange={(e) => updateStatus(ev.id, e.target.value)}
                          className="mt-2 text-xs"
                        >
                          {EVENT_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </Select>
                        {(() => {
                          const items = parseChecklist(ev.checklist);
                          if (!items.length) return null;
                          const done = items.filter((i) => i.done).length;
                          return (
                            <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-2">
                              <p className="mb-2 text-xs font-medium text-slate-600">
                                Prep checklist ({done}/{items.length})
                              </p>
                              <div className="space-y-1">
                                {items.map((item) => (
                                  <label key={item.id} className="flex items-center gap-2 text-xs">
                                    <button
                                      type="button"
                                      onClick={() => toggleChecklistItem(ev.id, items, item.id)}
                                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                                        item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"
                                      }`}
                                    >
                                      {item.done && <Check className="h-3 w-3" />}
                                    </button>
                                    <span className={item.done ? "text-slate-400 line-through" : "text-slate-700"}>
                                      {item.label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </ScrollReveal>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {!loading && events && events.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">All Events — {MONTH_NAMES[month]} {year}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((ev, idx) => {
              const typeMeta = getStatusMeta(EVENT_TYPES, ev.type);
              const statusMeta = getStatusMeta(EVENT_STATUSES, ev.status);
              const Icon = TYPE_ICONS[ev.type] ?? CalendarDays;
              return (
                <ScrollReveal key={ev.id} delay={idx * 0.03}>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`rounded-xl p-2 ${typeMeta.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-900">{ev.title}</h3>
                            <Badge className={statusMeta.color}>{statusMeta.label}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatDate(ev.startDate)}
                            {ev.endDate && ` → ${formatDate(ev.endDate)}`}
                          </p>
                          {ev.hostInstitution && <p className="text-xs text-slate-400">{ev.hostInstitution}</p>}
                          {ev.presentationTitle && (
                            <p className="mt-2 text-sm text-slate-600">Talk: {ev.presentationTitle}</p>
                          )}
                          {ev.prepNotes && (
                            <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">{ev.prepNotes}</p>
                          )}
                          {ev.travelDetails && (
                            <p className="mt-1 text-xs text-sky-700">Travel: {ev.travelDetails}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      )}

      {!loading && !events?.length && (
        <EmptyState
          title="Start planning your month"
          description="Add conference invitations, guest lectures, travel plans, and leave days."
        />
      )}

      <DialogRoot open={showForm} onOpenChange={setShowForm}>
        <DialogContent title="Add Planning Event">
          <form onSubmit={createEvent} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div>
              <Label>Event Type</Label>
              <Select name="type" defaultValue={defaultType} className="mt-1">
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input name="title" required className="mt-1" placeholder="e.g. IAPSM Conference 2026" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input name="startDate" type="date" required defaultValue={selectedDate ?? ""} className="mt-1" />
              </div>
              <div>
                <Label>End Date</Label>
                <Input name="endDate" type="date" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select name="status" defaultValue="INVITED" className="mt-1">
                  {EVENT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Location / City</Label>
                <Input name="location" className="mt-1" placeholder="e.g. Bengaluru" />
              </div>
            </div>
            <div>
              <Label>Venue / Institution</Label>
              <Input name="venue" className="mt-1" placeholder="Conference hall or university name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Organizer / Host</Label>
                <Input name="organizer" className="mt-1" />
              </div>
              <div>
                <Label>Host Institution</Label>
                <Input name="hostInstitution" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Presentation / Lecture Title</Label>
              <Input name="presentationTitle" className="mt-1" />
            </div>
            <div>
              <Label>Preparation Notes</Label>
              <Textarea name="prepNotes" className="mt-1" placeholder="Slides, materials, dress code, etc." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Travel Mode</Label>
                <Select name="travelMode" className="mt-1">
                  <option value="">None</option>
                  <option value="FLIGHT">Flight</option>
                  <option value="TRAIN">Train</option>
                  <option value="BUS">Bus</option>
                  <option value="CAR">Car</option>
                </Select>
              </div>
              <div>
                <Label>Honorarium / Fee</Label>
                <Input name="honorarium" className="mt-1" placeholder="If applicable" />
              </div>
            </div>
            <div>
              <Label>Travel Details</Label>
              <Textarea name="travelDetails" className="mt-1" placeholder="Flight numbers, booking ref, itinerary" />
            </div>
            <div>
              <Label>Accommodation</Label>
              <Input name="accommodation" className="mt-1" placeholder="Hotel name, check-in/out" />
            </div>
            <div>
              <Label>Description / Notes</Label>
              <Textarea name="notes" className="mt-1" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="sendEmail" defaultChecked />
              Email me when this event is added
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="remindEmail" defaultChecked />
              Remind me 7 days and 1 day before
            </label>
            {createConflicts.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium">Schedule conflicts detected:</p>
                <ul className="mt-1 list-inside list-disc">
                  {createConflicts.map((c, i) => <li key={i}>{c.message}</li>)}
                </ul>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => { setShowForm(false); setCreateConflicts([]); }}>
                  Save anyway & close
                </Button>
              </div>
            )}
            <Button type="submit" className="w-full">Save Event</Button>
          </form>
        </DialogContent>
      </DialogRoot>
    </PageTransition>
  );
}
