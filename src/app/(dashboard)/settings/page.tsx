"use client";

import { useState } from "react";
import { Download, Lock, Mail, Save, Settings, User } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { PageTransition, FadeIn } from "@/components/ui/motion";
import { useFetch, apiPatch } from "@/lib/hooks";
import { useTheme } from "@/components/ui/theme-provider";
import { Upload } from "lucide-react";

interface SettingsData {
  userName: string;
  userTitle: string;
  institution: string | null;
  email: string | null;
  emailOnTask: boolean;
  emailOnPublication: boolean;
  emailOnPlanning: boolean;
  emailOnProject: boolean;
  emailOnDigest: boolean;
  emailOnBackup: boolean;
  emailSignature: string | null;
  darkMode: boolean;
  planningReminderDays: number;
}

export default function SettingsPage() {
  const { data: settings, loading, refetch } = useFetch<SettingsData>("/api/settings");
  const { data: emailStatus } = useFetch<{
    from: string;
    replyTo?: string;
    deliverability?: {
      domain?: string;
      status?: string;
      spfVerified?: boolean;
      dkimVerified?: boolean;
      hint?: string;
    };
  }>("/api/email/status");
  const [saved, setSaved] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"json" | "xlsx">("json");
  const { setTheme } = useTheme();
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await apiPatch("/api/settings", {
      userName: fd.get("userName"),
      userTitle: fd.get("userTitle"),
      institution: fd.get("institution"),
      email: fd.get("email"),
      emailOnTask: fd.get("emailOnTask") === "on",
      emailOnPublication: fd.get("emailOnPublication") === "on",
      emailOnPlanning: fd.get("emailOnPlanning") === "on",
      emailOnProject: fd.get("emailOnProject") === "on",
      emailOnDigest: fd.get("emailOnDigest") === "on",
      emailOnBackup: fd.get("emailOnBackup") === "on",
      emailSignature: fd.get("emailSignature"),
      darkMode: fd.get("darkMode") === "on",
    });
    if (fd.get("darkMode") === "on") setTheme("dark");
    else setTheme("light");
    setSaved(true);
    refetch();
    setTimeout(() => setSaved(false), 3000);
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordMsg("");
    const fd = new FormData(e.currentTarget);
    try {
      await apiPatch("/api/settings", {
        currentPassword: fd.get("currentPassword"),
        newPassword: fd.get("newPassword"),
      });
      setPasswordMsg("Password updated successfully.");
      (e.target as HTMLFormElement).reset();
    } catch {
      setPasswordMsg("Could not update password. Check your current password.");
    }
  }

  async function exportData(format: "json" | "xlsx") {
    setExporting(true);
    setExportFormat(format);
    try {
      const res = await fetch(`/api/settings/export?format=${format}`, { credentials: "include" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scholardesk-backup-${new Date().toISOString().split("T")[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mode", "merge");
    try {
      const res = await fetch("/api/settings/import", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImportMsg(`Imported: ${JSON.stringify(data.stats)}`);
    } catch {
      setImportMsg("Import failed. Use a valid ScholarDesk JSON backup.");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  if (loading || !settings) {
    return <div className="skeleton h-96 rounded-2xl" />;
  }

  return (
    <PageTransition>
      <PageHeader
        title="Settings"
        description="Profile, password, email preferences, and data backup."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-teal-700" /> Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input name="userName" defaultValue={settings.userName} className="mt-1" />
                </div>
                <div>
                  <Label>Title</Label>
                  <Input name="userTitle" defaultValue={settings.userTitle} className="mt-1" />
                </div>
                <div>
                  <Label>Institution</Label>
                  <Input name="institution" defaultValue={settings.institution ?? ""} className="mt-1" />
                </div>
                <div>
                  <Label>Your Email (for planning reminders, copies & reply-to address)</Label>
                  <Input name="email" type="email" defaultValue={settings.email ?? ""} className="mt-1" />
                  <p className="mt-1 text-xs text-slate-500">
                    Team members can reply directly to this address when they receive ScholarDesk emails.
                  </p>
                </div>
                <div>
                  <Label>Email signature (appended to outgoing emails)</Label>
                  <Textarea
                    name="emailSignature"
                    defaultValue={settings.emailSignature ?? ""}
                    className="mt-1"
                    placeholder="Dr. Hari Prakash&#10;Assistant Professor, Public Health&#10;MSRUAS, Bengaluru"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="darkMode" defaultChecked={settings.darkMode} />
                  Dark mode
                </label>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Mail className="h-4 w-4" /> Email notifications
                  </p>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="emailOnTask" defaultChecked={settings.emailOnTask} />
                      Task assignments to team
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="emailOnProject" defaultChecked={settings.emailOnProject} />
                      Project invites & phase updates
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="emailOnPublication" defaultChecked={settings.emailOnPublication} />
                      Publication team & status changes
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="emailOnPlanning" defaultChecked={settings.emailOnPlanning} />
                      Planning events & reminders to me
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="emailOnDigest" defaultChecked={settings.emailOnDigest} />
                      Weekly Monday digest email to me
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="emailOnBackup" defaultChecked={settings.emailOnBackup} />
                      Weekly data backup email (JSON + Excel attached)
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Planning events also send reminders 7 days and 1 day before (when enabled per event).
                  </p>
                </div>

                <Button type="submit" className="gap-2">
                  <Save className="h-4 w-4" />
                  {saved ? "Saved!" : "Save Settings"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </FadeIn>

        <div className="space-y-6">
          <FadeIn delay={0.1}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="h-4 w-4 text-teal-700" /> Change Password
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={changePassword} className="space-y-4">
                  <div>
                    <Label>Current Password</Label>
                    <Input name="currentPassword" type="password" required className="mt-1" />
                  </div>
                  <div>
                    <Label>New Password (min 8 characters)</Label>
                    <Input name="newPassword" type="password" required minLength={8} className="mt-1" />
                  </div>
                  {passwordMsg && (
                    <p className={`text-sm ${passwordMsg.includes("success") ? "text-emerald-600" : "text-red-600"}`}>
                      {passwordMsg}
                    </p>
                  )}
                  <Button type="submit" variant="outline">Update Password</Button>
                </form>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.15}>
            <Card className="border-amber-100 bg-amber-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Download className="h-4 w-4 text-amber-700" /> Backup Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-slate-600">
                  Download a complete backup of all your people, projects, publications,
                  planning events, teaching data, and reminders — as JSON or Excel.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => exportData("json")} disabled={exporting} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    {exporting && exportFormat === "json" ? "Exporting…" : "Download JSON"}
                  </Button>
                  <Button onClick={() => exportData("xlsx")} disabled={exporting} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    {exporting && exportFormat === "xlsx" ? "Exporting…" : "Download Excel"}
                  </Button>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <Upload className="h-4 w-4" />
                    {importing ? "Importing…" : "Import JSON backup"}
                    <input type="file" accept=".json,application/json" className="hidden" onChange={importData} disabled={importing} />
                  </label>
                </div>
                {importMsg && <p className="mt-2 text-sm text-teal-700">{importMsg}</p>}
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.2}>
            <Card className="border-teal-100 bg-teal-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-4 w-4 text-teal-700" /> Email Deliverability
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>
                  Sending from <strong>{emailStatus?.from ?? "—"}</strong>
                  {emailStatus?.replyTo ? (
                    <> · Replies go to <strong>{emailStatus.replyTo}</strong></>
                  ) : (
                    <> · <span className="text-amber-700">Add your email above so replies reach you</span></>
                  )}
                </p>
                {emailStatus?.deliverability?.domain && (
                  <p>
                    Domain <strong>{emailStatus.deliverability.domain}</strong>:{" "}
                    <span className={emailStatus.deliverability.status === "verified" ? "text-emerald-700" : "text-amber-700"}>
                      {emailStatus.deliverability.status}
                    </span>
                    {emailStatus.deliverability.spfVerified !== undefined && (
                      <> · SPF {emailStatus.deliverability.spfVerified ? "✓" : "✗"} · DKIM {emailStatus.deliverability.dkimVerified ? "✓" : "✗"}</>
                    )}
                  </p>
                )}
                <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
                  <li>Ask team members to mark the first email as <strong>Not Spam</strong> in Gmail.</li>
                  <li>Keep your profile email set to your personal/work inbox (not info@).</li>
                  <li>Verify DNS at <a href="https://resend.com/domains" className="text-teal-700 underline" target="_blank" rel="noreferrer">resend.com/domains</a> if emails keep landing in spam.</li>
                </ul>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.25}>
            <Card>
              <CardContent className="flex items-center gap-3 p-4 text-sm text-slate-500">
                <Settings className="h-5 w-5 shrink-0 text-slate-400" />
                <p>
                  ScholarDesk is your private academic suite. Password and data never leave your Railway server.
                </p>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  );
}
