"use client";

import { useState } from "react";
import { MessageSquare, Mail, Trash2, Check, Reply } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/ui/motion";
import { useFetch, apiPatch, apiDelete } from "@/lib/hooks";
import { formatDateTime } from "@/lib/utils";

interface PortalMessage {
  id: string;
  fromName: string;
  fromEmail: string | null;
  fromRole: string | null;
  subject: string | null;
  body: string;
  isRead: boolean;
  createdAt: string;
  person: { id: string; name: string; email: string | null; role: string } | null;
}

export default function MessagesPage() {
  const { data, loading, refetch } = useFetch<{ messages: PortalMessage[]; unread: number }>("/api/messages");
  const [filter, setFilter] = useState<"all" | "unread">("all");

  async function markRead(id: string, isRead: boolean) {
    await apiPatch(`/api/messages/${id}`, { isRead });
    refetch();
  }

  async function remove(id: string) {
    if (!confirm("Delete this message?")) return;
    await apiDelete(`/api/messages/${id}`);
    refetch();
  }

  const messages = data?.messages ?? [];
  const filtered = filter === "unread" ? messages.filter((m) => !m.isRead) : messages;
  const unread = data?.unread ?? 0;

  return (
    <PageTransition>
      <PageHeader
        title="Messages"
        description="Messages sent to you by your students and team members from their portal."
      />

      <div className="mb-6 flex gap-2">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              filter === f ? "bg-teal-700 text-white" : "bg-white text-slate-600"
            }`}
          >
            {f}
            {f === "unread" && unread > 0 ? ` (${unread})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : !filtered.length ? (
        <EmptyState
          title={filter === "unread" ? "No unread messages" : "No messages yet"}
          description="When a team member sends you a message from their portal, it will appear here."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <Card
              key={m.id}
              className={m.isRead ? "opacity-80" : "border-teal-200 bg-teal-50/30"}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                        <MessageSquare className="h-4 w-4" />
                      </span>
                      <p className="font-medium text-slate-900">{m.fromName}</p>
                      {m.fromRole && (
                        <Badge className="bg-slate-100 text-slate-600">
                          {m.fromRole.replace(/_/g, " ")}
                        </Badge>
                      )}
                      {!m.isRead && <Badge className="bg-teal-100 text-teal-700">New</Badge>}
                    </div>
                    {m.subject && (
                      <p className="mt-2 text-sm font-semibold text-slate-800">{m.subject}</p>
                    )}
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{m.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>{formatDateTime(m.createdAt)}</span>
                      {m.fromEmail && <span>{m.fromEmail}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    {m.fromEmail && (
                      <a
                        href={`mailto:${m.fromEmail}?subject=${encodeURIComponent(
                          "Re: " + (m.subject ?? "Your message")
                        )}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
                      >
                        <Reply className="h-3.5 w-3.5" /> Reply
                      </a>
                    )}
                    <button
                      onClick={() => markRead(m.id, !m.isRead)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
                    >
                      {m.isRead ? <Mail className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                      {m.isRead ? "Unread" : "Read"}
                    </button>
                    <button
                      onClick={() => remove(m.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
