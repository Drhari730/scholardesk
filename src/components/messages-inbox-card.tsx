"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/lib/hooks";
import { formatDateTime } from "@/lib/utils";

interface PortalMessage {
  id: string;
  fromName: string;
  fromRole: string | null;
  subject: string | null;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export function MessagesInboxCard() {
  const { data } = useFetch<{ messages: PortalMessage[]; unread: number }>("/api/messages");
  const messages = data?.messages ?? [];
  if (messages.length === 0) return null;

  const unread = data?.unread ?? 0;

  return (
    <Card className={`mb-8 ${unread > 0 ? "border-teal-200" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-teal-700" />
          Messages from your team
          {unread > 0 && <Badge className="bg-amber-500 text-teal-950">{unread} new</Badge>}
        </CardTitle>
        <Link href="/messages" className="text-xs font-medium text-teal-700 hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {messages.slice(0, 3).map((m) => (
          <Link
            key={m.id}
            href="/messages"
            className={`rounded-xl border p-3 transition-colors hover:border-teal-200 ${
              m.isRead ? "border-slate-100 bg-slate-50/50" : "border-teal-100 bg-teal-50/40"
            }`}
          >
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-slate-800">{m.fromName}</p>
              {!m.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />}
            </div>
            {m.subject && <p className="mt-0.5 truncate text-xs font-medium text-slate-600">{m.subject}</p>}
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{m.body}</p>
            <p className="mt-1.5 text-xs text-slate-400">{formatDateTime(m.createdAt)}</p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
