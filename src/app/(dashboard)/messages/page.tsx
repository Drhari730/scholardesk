"use client";

import { useMemo, useState } from "react";
import { MessageSquare, Send, Trash2, Loader2, Plus, ArrowLeft, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { DialogRoot, DialogContent } from "@/components/ui/dialog";
import { PageTransition } from "@/components/ui/motion";
import { useFetch, apiPost, apiDelete } from "@/lib/hooks";
import { formatDateTime } from "@/lib/utils";

interface Msg {
  id: string;
  personId: string | null;
  direction: string;
  fromName: string;
  fromEmail: string | null;
  fromRole: string | null;
  subject: string | null;
  body: string;
  isRead: boolean;
  createdAt: string;
  person: { id: string; name: string; email: string | null; role: string } | null;
}

interface Person {
  id: string;
  name: string;
  email: string | null;
  role: string;
}

interface Conversation {
  key: string;
  personId: string | null;
  name: string;
  role: string | null;
  email: string | null;
  messages: Msg[];
  lastAt: string;
  unread: number;
}

export default function MessagesPage() {
  const { data, loading, refetch } = useFetch<{ messages: Msg[]; unread: number }>("/api/messages");
  const { data: people } = useFetch<Person[]>("/api/people");

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

  const [showCompose, setShowCompose] = useState(false);
  const [composeIds, setComposeIds] = useState<Set<string>>(new Set());
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeSending, setComposeSending] = useState(false);
  const [composeMsg, setComposeMsg] = useState("");

  const conversations = useMemo<Conversation[]>(() => {
    const msgs = data?.messages ?? [];
    const map = new Map<string, Conversation>();
    for (const m of msgs) {
      const key = m.personId ?? `noperson:${m.fromEmail ?? m.fromName}`;
      let c = map.get(key);
      if (!c) {
        c = {
          key,
          personId: m.personId,
          name: m.person?.name ?? m.fromName,
          role: m.person?.role ?? m.fromRole ?? null,
          email: m.person?.email ?? m.fromEmail ?? null,
          messages: [],
          lastAt: m.createdAt,
          unread: 0,
        };
        map.set(key, c);
      }
      c.messages.push(m);
      if (m.createdAt > c.lastAt) c.lastAt = m.createdAt;
      if (m.direction === "INBOUND" && !m.isRead) c.unread += 1;
    }
    return Array.from(map.values()).sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
  }, [data]);

  const shown = filter === "unread" ? conversations.filter((c) => c.unread > 0) : conversations;
  const selected = conversations.find((c) => c.key === selectedKey) ?? null;

  async function openConversation(c: Conversation) {
    setSelectedKey(c.key);
    setReplyBody("");
    if (c.unread > 0 && c.personId) {
      await apiPost("/api/messages/mark-read", { personId: c.personId });
      refetch();
    }
  }

  async function sendReply() {
    if (!selected?.personId || !replyBody.trim() || sending) return;
    setSending(true);
    try {
      await apiPost("/api/messages/send", { personId: selected.personId, body: replyBody });
      setReplyBody("");
      refetch();
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(id: string) {
    if (!confirm("Delete this message?")) return;
    await apiDelete(`/api/messages/${id}`);
    refetch();
  }

  async function sendCompose(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (composeIds.size === 0 || !composeBody.trim() || composeSending) return;
    setComposeSending(true);
    setComposeMsg("");
    try {
      const res = await apiPost("/api/messages/send", {
        personIds: Array.from(composeIds),
        subject: composeSubject,
        body: composeBody,
      });
      setComposeMsg(`Sent to ${res.sent} of ${res.total}${res.failed?.length ? ` — ${res.failed.length} had no email` : ""}.`);
      setComposeBody("");
      setComposeSubject("");
      setComposeIds(new Set());
      refetch();
      setTimeout(() => setShowCompose(false), 900);
    } catch {
      setComposeMsg("Could not send — please try again.");
    } finally {
      setComposeSending(false);
    }
  }

  function toggleCompose(id: string) {
    setComposeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const emailPeople = (people ?? []).filter((p) => p.email);
  const unread = data?.unread ?? 0;

  return (
    <PageTransition>
      <PageHeader
        title="Messages"
        description="Two-way conversations with your students and team members."
        action={
          <Button onClick={() => { setShowCompose(true); setComposeMsg(""); }}>
            <Plus className="h-4 w-4" /> New Message
          </Button>
        }
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
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="font-medium text-slate-700">No messages yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Start a conversation with <strong>New Message</strong>, or wait for a team member to write from their portal.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* Conversation list */}
          <div className={`space-y-2 ${selected ? "hidden lg:block" : ""}`}>
            {shown.map((c) => (
              <button
                key={c.key}
                onClick={() => openConversation(c)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  selected?.key === c.key
                    ? "border-teal-300 bg-teal-50"
                    : c.unread > 0
                    ? "border-teal-100 bg-teal-50/40 hover:bg-teal-50"
                    : "border-slate-100 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 truncate">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate font-medium text-slate-800">{c.name}</span>
                  </span>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white">
                      {c.unread}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {c.messages[c.messages.length - 1]?.direction === "OUTBOUND" ? "You: " : ""}
                  {c.messages[c.messages.length - 1]?.body}
                </p>
              </button>
            ))}
          </div>

          {/* Thread */}
          <div className={selected ? "" : "hidden lg:block"}>
            {!selected ? (
              <Card className="hidden h-full lg:flex">
                <CardContent className="flex flex-1 items-center justify-center p-8 text-sm text-slate-400">
                  Select a conversation to read and reply.
                </CardContent>
              </Card>
            ) : (
              <Card className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-4">
                  <div className="flex items-center gap-2">
                    <button className="lg:hidden" onClick={() => setSelectedKey(null)} aria-label="Back">
                      <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </button>
                    <div>
                      <p className="font-semibold text-slate-900">{selected.name}</p>
                      <p className="text-xs text-slate-400">
                        {selected.role ? selected.role.replace(/_/g, " ") : ""}
                        {selected.email ? ` · ${selected.email}` : ""}
                      </p>
                    </div>
                  </div>
                </div>

                <CardContent className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: "55vh" }}>
                  {selected.messages.map((m) => {
                    const outbound = m.direction === "OUTBOUND";
                    return (
                      <div key={m.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                        <div className={`group max-w-[80%] rounded-2xl px-4 py-2.5 ${
                          outbound ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-800"
                        }`}>
                          {m.subject && (
                            <p className={`mb-1 text-xs font-semibold ${outbound ? "text-teal-50" : "text-slate-600"}`}>
                              {m.subject}
                            </p>
                          )}
                          <p className="whitespace-pre-line text-sm">{m.body}</p>
                          <div className={`mt-1 flex items-center gap-2 text-[10px] ${outbound ? "text-teal-100/80" : "text-slate-400"}`}>
                            <span>{outbound ? "You" : m.fromName}</span>
                            <span>·</span>
                            <span>{formatDateTime(m.createdAt)}</span>
                            <button
                              onClick={() => deleteMessage(m.id)}
                              className="opacity-0 transition-opacity group-hover:opacity-100"
                              aria-label="Delete message"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>

                {selected.personId ? (
                  <div className="border-t border-slate-100 p-3">
                    <div className="flex items-end gap-2">
                      <Textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        rows={2}
                        placeholder={`Reply to ${selected.name}…`}
                        className="min-h-[44px] flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            sendReply();
                          }
                        }}
                      />
                      <Button onClick={sendReply} disabled={sending || !replyBody.trim()} className="gap-1">
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send
                      </Button>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">Emails {selected.name} and adds to this thread. ⌘/Ctrl+Enter to send.</p>
                  </div>
                ) : (
                  <div className="border-t border-slate-100 p-3 text-xs text-slate-400">
                    This message isn&apos;t linked to a person on file, so you can&apos;t reply from here — reply by email instead.
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Compose dialog */}
      <DialogRoot open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent title="New Message">
          <form onSubmit={sendCompose} className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <Label>To ({composeIds.size} selected)</Label>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-teal-700 hover:underline"
                  onClick={() =>
                    setComposeIds((prev) =>
                      prev.size === emailPeople.length ? new Set() : new Set(emailPeople.map((p) => p.id))
                    )
                  }
                >
                  <Users className="h-3 w-3" /> {composeIds.size === emailPeople.length ? "Clear all" : "Select all"}
                </button>
              </div>
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                {emailPeople.length === 0 ? (
                  <p className="p-2 text-xs text-slate-400">No people with an email address yet. Add them in People.</p>
                ) : (
                  emailPeople.map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                      <input type="checkbox" checked={composeIds.has(p.id)} onChange={() => toggleCompose(p.id)} />
                      <span className="text-sm text-slate-700">{p.name}</span>
                      <span className="text-xs text-slate-400">{p.role.replace(/_/g, " ")}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div>
              <Label>Subject (optional)</Label>
              <Input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} className="mt-1" maxLength={200} />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={composeBody} onChange={(e) => setComposeBody(e.target.value)} required rows={5} className="mt-1" maxLength={5000} placeholder="Type your message…" />
            </div>
            {composeMsg && <p className="text-xs text-teal-700">{composeMsg}</p>}
            <Button type="submit" disabled={composeSending || composeIds.size === 0 || !composeBody.trim()} className="w-full gap-2">
              {composeSending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <><Send className="h-4 w-4" /> Send to {composeIds.size || ""} {composeIds.size === 1 ? "person" : "people"}</>}
            </Button>
          </form>
        </DialogContent>
      </DialogRoot>
    </PageTransition>
  );
}
