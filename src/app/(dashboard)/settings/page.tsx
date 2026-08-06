"use client";

import { useState } from "react";
import { Download, Lock, Mail, Save, Settings, User } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { PageTransition, FadeIn } from "@/components/ui/motion";
import { useFetch, apiPatch } from "@/lib/hooks";

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
  planningReminderDays: number;
}

export default function SettingsPage() {
  const { data: settings, loading, refetch } = useFetch<SettingsData>("/api/settings");
  const [saved, setSaved] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"json" | "xlsx">("json");

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
    });
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
                  <Label>Your Email (for planning reminders & copies)</Label>
                  <Input name="email" type="email" defaultValue={settings.email ?? ""} className="mt-1" />
                </div>

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
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.2}>
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
