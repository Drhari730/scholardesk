// Builds a clean, printable Gantt chart in a new window (for IEC submission etc.)

type Milestone = { id: string; title: string; start: string; end: string; status: string };

interface ThesisLike {
  title: string;
  studentName: string;
  degree: string;
  status?: string;
  supervisor?: string | null;
  startDate?: string | null;
  expectedEndDate?: string | null;
  milestones?: string | null;
}

const BAR: Record<string, string> = {
  PLANNED: "#94a3b8",
  IN_PROGRESS: "#3b82f6",
  DONE: "#22c55e",
  DELAYED: "#f97316",
};
const STATUS_LABEL: Record<string, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
  DELAYED: "Delayed",
};

function parseMs(raw?: string | null): Milestone[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p.filter((m) => m && m.title && m.start && m.end) : [];
  } catch {
    return [];
  }
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmt(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function openGanttPrint(thesis: ThesisLike) {
  const ms = parseMs(thesis.milestones).sort((a, b) => (a.start < b.start ? -1 : 1));
  const dates: number[] = [];
  ms.forEach((m) => {
    const a = new Date(m.start).getTime();
    const b = new Date(m.end).getTime();
    if (!isNaN(a)) dates.push(a);
    if (!isNaN(b)) dates.push(b);
  });
  if (thesis.startDate) dates.push(new Date(thesis.startDate).getTime());
  if (thesis.expectedEndDate) dates.push(new Date(thesis.expectedEndDate).getTime());
  const valid = dates.filter((x) => !isNaN(x));
  let min = valid.length ? Math.min(...valid) : Date.now();
  let max = valid.length ? Math.max(...valid) : Date.now() + 30 * 864e5;
  if (min === max) max = min + 30 * 864e5;
  const span = max - min;
  const pct = (t: number) => ((t - min) / span) * 100;

  // month axis
  const months: string[] = [];
  const cur = new Date(new Date(min).getFullYear(), new Date(min).getMonth(), 1);
  while (cur.getTime() <= max) {
    const left = pct(cur.getTime());
    if (left >= 0 && left <= 100) {
      months.push(
        `<div style="position:absolute;left:${left}%;top:0;bottom:0;border-left:1px solid #eef2f7;"><span style="position:absolute;top:0;left:2px;font-size:8px;color:#94a3b8;">${cur.toLocaleDateString(
          "en-IN",
          { month: "short", year: "2-digit" }
        )}</span></div>`
      );
    }
    cur.setMonth(cur.getMonth() + 1);
  }

  const rows = ms
    .map((m) => {
      const a = new Date(m.start).getTime();
      const b = new Date(m.end).getTime();
      const left = pct(a);
      const width = Math.max(pct(b) - left, 1.5);
      const color = BAR[m.status] ?? "#94a3b8";
      return `
      <tr>
        <td style="width:210px;padding:4px 8px;font-size:11px;color:#334155;border-bottom:1px solid #f1f5f9;">${esc(m.title)}</td>
        <td style="padding:4px 0;border-bottom:1px solid #f1f5f9;">
          <div style="position:relative;height:18px;background:#f8fafc;border-radius:3px;">
            <div style="position:absolute;left:${left}%;width:${width}%;top:0;height:18px;background:${color};border-radius:3px;"></div>
          </div>
        </td>
        <td style="width:150px;padding:4px 8px;font-size:9px;color:#64748b;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${fmt(new Date(a))} – ${fmt(new Date(b))}</td>
      </tr>`;
    })
    .join("");

  const legend = Object.keys(BAR)
    .map(
      (k) =>
        `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;font-size:10px;color:#475569;"><span style="width:10px;height:10px;border-radius:2px;background:${BAR[k]};display:inline-block;"></span>${STATUS_LABEL[k]}</span>`
    )
    .join("");

  const degreeLabel = thesis.degree === "PHD" ? "PhD" : "Masters";
  const range =
    (thesis.startDate ? fmt(new Date(thesis.startDate)) : "—") +
    " to " +
    (thesis.expectedEndDate ? fmt(new Date(thesis.expectedEndDate)) : "—");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Thesis Timeline — ${esc(
    thesis.studentName
  )}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;margin:28px;color:#0f172a;}
    .bar-top{height:6px;border-radius:4px;background:linear-gradient(90deg,#FF9933 0 33%,#ffffff 33% 66%,#138808 66% 100%);margin-bottom:16px;}
    h1{font-size:18px;margin:0 0 2px;}
    .meta{font-size:12px;color:#475569;margin:2px 0;}
    table{width:100%;border-collapse:collapse;margin-top:14px;}
    .axis{position:relative;height:14px;margin-left:210px;margin-right:150px;border-bottom:1px solid #e2e8f0;}
    .foot{margin-top:18px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px;}
    @media print{ .noprint{display:none;} body{margin:12mm;} }
  </style></head>
  <body>
    <div class="bar-top"></div>
    <h1>Thesis Timeline (Gantt Chart)</h1>
    <p class="meta"><strong>${esc(thesis.title)}</strong></p>
    <p class="meta">Student: <strong>${esc(thesis.studentName)}</strong> &nbsp;·&nbsp; Programme: ${degreeLabel} &nbsp;·&nbsp; Supervisor: ${esc(
    thesis.supervisor || "Dr. Hari Prakash"
  )}</p>
    <p class="meta">Duration: ${range}</p>
    <div style="margin-top:10px;">${legend}</div>
    <div class="axis">${months.join("")}</div>
    <table>${rows || `<tr><td style="padding:12px;color:#94a3b8;font-size:12px;">No milestones defined.</td></tr>`}</table>
    <p class="foot">Generated on ${fmt(new Date())} via ScholarDesk · scholardesk.drhari.co.in</p>
    <p class="noprint" style="margin-top:16px;"><button onclick="window.print()" style="padding:8px 16px;font-size:13px;border:0;border-radius:8px;background:#0d9488;color:#fff;cursor:pointer;">Print / Save as PDF</button></p>
    <script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>
  </body></html>`;

  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) {
    alert("Please allow pop-ups to download the timeline.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
