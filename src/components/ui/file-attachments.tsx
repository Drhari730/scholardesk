"use client";

import { useState, useEffect } from "react";
import { Paperclip, Upload, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Attachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
}

export function FileAttachments({
  entityType,
  entityId,
  shareable = false,
}: {
  entityType: string;
  entityId: string;
  /** Show team-sharing options for project/publication attachments */
  shareable?: boolean;
}) {
  const [files, setFiles] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [notifyTeam, setNotifyTeam] = useState(true);
  const [lastUploadMsg, setLastUploadMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!entityId) return;
    fetch(`/api/attachments?entityType=${entityType}&entityId=${entityId}`, {
      credentials: "include",
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Could not load attachments");
        return Array.isArray(data) ? data : [];
      })
      .then(setFiles)
      .catch((err) => setError(err.message ?? "Could not load attachments"));
  }, [entityType, entityId]);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setLastUploadMsg("");
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("entityType", entityType);
    fd.append("entityId", entityId);
    if (shareable && notifyTeam) {
      fd.append("notifyTeam", "true");
    }
    try {
      const res = await fetch("/api/attachments", { method: "POST", body: fd, credentials: "include" });
      const att = await res.json();
      if (res.ok) {
        setFiles((prev) => [att, ...prev]);
        if (shareable && notifyTeam && att.emailsSent > 0) {
          setLastUploadMsg(`Uploaded — team notified (${att.emailsSent} email${att.emailsSent === 1 ? "" : "s"})`);
        } else if (shareable) {
          setLastUploadMsg("Uploaded — team can download from their portal");
        } else {
          setLastUploadMsg("File uploaded");
        }
      } else {
        setError(att.error ?? "Upload failed — please try again");
      }
    } catch {
      setError("Upload failed — check your connection and try again");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function remove(id: string) {
    await fetch(`/api/attachments/${id}`, { method: "DELETE", credentials: "include" });
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <Paperclip className="h-3.5 w-3.5" /> Attachments
        </p>
        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
            <Upload className="h-3 w-3" />
            {uploading ? "Uploading…" : "Upload"}
          </span>
          <input type="file" className="hidden" onChange={upload} disabled={uploading} />
        </label>
      </div>
      {shareable && (
        <label className="mb-2 flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={notifyTeam}
            onChange={(e) => setNotifyTeam(e.target.checked)}
          />
          Notify team by email (they can also download in Team Portal)
        </label>
      )}
      {files.length === 0 ? (
        <p className="text-xs text-slate-400">
          PDF, DOC, images up to 15MB
          {shareable ? " · visible to project team in their portal" : ""}
        </p>
      ) : (
        <div className="space-y-1">
          {files.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 text-xs">
              <span className="truncate text-slate-700">{f.filename}</span>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-slate-400">{formatSize(f.size)}</span>
                <a href={`/api/attachments/${f.id}`} className="text-teal-600 hover:text-teal-800">
                  <Download className="h-3.5 w-3.5" />
                </a>
                <button onClick={() => remove(f.id)} className="text-slate-400 hover:text-red-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {lastUploadMsg && <p className="mt-2 text-xs text-teal-700">{lastUploadMsg}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
