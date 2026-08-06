"use client";

import { useState } from "react";
import { Plus, Mail, Phone } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
} from "@/components/ui/dialog";
import { PageTransition } from "@/components/ui/motion";
import { useFetch, apiPost, apiDelete, apiPatch } from "@/lib/hooks";
import { PERSON_ROLES } from "@/lib/constants";

interface Person {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  department: string | null;
  notes: string | null;
  portalEnabled?: boolean;
  projectMembers: Array<{ project: { title: string } }>;
  _count: { tasks: number };
}

export default function PeoplePage() {
  const { data: people, loading, refetch } = useFetch<Person[]>("/api/people");
  const [showForm, setShowForm] = useState(false);
  const [roleFilter, setRoleFilter] = useState("ALL");

  async function createPerson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await apiPost("/api/people", {
      ...Object.fromEntries(fd),
      sendEmail: fd.get("sendEmail") === "on",
    });
    setShowForm(false);
    refetch();
  }

  async function deletePerson(id: string) {
    if (!confirm("Remove this person?")) return;
    await apiDelete(`/api/people/${id}`);
    refetch();
  }

  async function setPortalAccess(personId: string, pin: string) {
    if (!pin || pin.length < 4) {
      alert("PIN must be at least 4 characters");
      return;
    }
    await apiPost("/api/people/portal", { personId, pin });
    refetch();
  }

  async function disablePortal(personId: string) {
    await apiPost("/api/people/portal", { personId, portalEnabled: false });
    refetch();
  }

  const filtered =
    roleFilter === "ALL"
      ? people
      : people?.filter((p) => p.role === roleFilter);

  const roleLabel = (role: string) =>
    PERSON_ROLES.find((r) => r.value === role)?.label ?? role;

  return (
    <PageTransition>
      <PageHeader
        title="People & Collaborators"
        description="Manage students, colleagues, and research team members."
        action={
          <DialogRoot open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Add Person
              </Button>
            </DialogTrigger>
            <DialogContent title="Add Person">
              <form onSubmit={createPerson} className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input name="name" required className="mt-1" />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select name="role" className="mt-1">
                    {PERSON_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Email</Label>
                    <Input name="email" type="email" className="mt-1" />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input name="phone" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Department</Label>
                  <Input name="department" className="mt-1" />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea name="notes" className="mt-1" />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" name="sendEmail" defaultChecked />
                  Send welcome email (requires email address)
                </label>
                <Button type="submit" className="w-full">Add Person</Button>
              </form>
            </DialogContent>
          </DialogRoot>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setRoleFilter("ALL")}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            roleFilter === "ALL" ? "bg-teal-700 text-white" : "bg-white text-slate-600"
          }`}
        >
          All ({people?.length ?? 0})
        </button>
        {PERSON_ROLES.map((r) => {
          const count = people?.filter((p) => p.role === r.value).length ?? 0;
          if (count === 0) return null;
          return (
            <button
              key={r.value}
              onClick={() => setRoleFilter(r.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                roleFilter === r.value ? "bg-teal-700 text-white" : "bg-white text-slate-600"
              }`}
            >
              {r.label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : !filtered?.length ? (
        <EmptyState
          title="No people added"
          description="Add your students and colleagues to assign tasks and send reminders."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((person) => (
            <Card key={person.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{person.name}</h3>
                    <Badge className="mt-1 bg-teal-50 text-teal-700">
                      {roleLabel(person.role)}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400"
                    onClick={() => deletePerson(person.id)}
                  >
                    ×
                  </Button>
                </div>
                {person.department && (
                  <p className="mt-2 text-xs text-slate-400">{person.department}</p>
                )}
                <div className="mt-3 space-y-1.5">
                  {person.email && (
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {person.email}
                    </p>
                  )}
                  {person.phone && (
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {person.phone}
                    </p>
                  )}
                </div>
                <div className="mt-3 flex gap-3 text-xs text-slate-400">
                  <span>{person._count.tasks} tasks</span>
                  <span>{person.projectMembers.length} projects</span>
                </div>
                {person.email && (
                  <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-2">
                    <p className="text-xs font-medium text-slate-600">Team portal</p>
                    {person.portalEnabled ? (
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs text-emerald-600">Access enabled</span>
                        <button onClick={() => disablePortal(person.id)} className="text-xs text-red-500">Disable</button>
                      </div>
                    ) : (
                      <div className="mt-1 flex gap-1">
                        <Input
                          id={`pin-${person.id}`}
                          type="password"
                          placeholder="Set PIN"
                          className="h-7 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            const el = document.getElementById(`pin-${person.id}`) as HTMLInputElement;
                            setPortalAccess(person.id, el?.value ?? "");
                          }}
                        >
                          Enable
                        </Button>
                      </div>
                    )}
                    <p className="mt-1 text-[10px] text-slate-400">Login at /portal/login</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
