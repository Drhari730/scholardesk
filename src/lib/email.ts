import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const FROM_EMAIL =
  process.env.EMAIL_FROM ?? "ScholarDesk <onboarding@resend.dev>";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://scholardesk-production-55cf.up.railway.app";

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export function getFromDomain(): string | null {
  const match = FROM_EMAIL.match(/@([a-zA-Z0-9.-]+)>?$/);
  return match?.[1] ?? null;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function getReplyToEmail(): Promise<string | undefined> {
  if (process.env.REPLY_TO_EMAIL) return process.env.REPLY_TO_EMAIL;
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  if (settings?.email) return settings.email;
  const fromMatch = FROM_EMAIL.match(/<([^>]+)>/);
  return fromMatch?.[1];
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; content: string }>;
  category?: "team" | "task" | "reminder" | "planning" | "digest" | "backup";
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments,
  category,
}: SendEmailParams) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", to);
    return { success: false, reason: "not_configured" };
  }

  const replyTo = await getReplyToEmail();
  const plainText = text ?? htmlToPlainText(html);

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
      text: plainText,
      replyTo,
      headers: {
        "X-Entity-Ref-ID": `scholardesk-${category ?? "general"}-${Date.now()}`,
      },
      tags: category ? [{ name: "category", value: category }] : undefined,
      attachments,
    });

    if (error) {
      console.error("[email] Send failed:", error);
      return { success: false, reason: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error("[email] Exception:", err);
    return { success: false, reason: String(err) };
  }
}

export async function getDomainDeliverabilityStatus() {
  if (!resend) {
    return { configured: false, domain: getFromDomain(), status: "not_configured" as const };
  }

  const domainName = getFromDomain();
  if (!domainName) {
    return { configured: true, domain: null, status: "unknown_from" as const };
  }

  const { data, error } = await resend.domains.list();
  if (error || !data?.data?.length) {
    return {
      configured: true,
      domain: domainName,
      status: "domain_not_in_resend" as const,
      hint: "Add and verify your domain at resend.com/domains",
    };
  }

  const domain = data.data.find((d) => d.name === domainName);
  if (!domain) {
    return {
      configured: true,
      domain: domainName,
      status: "domain_not_in_resend" as const,
      hint: `Verify ${domainName} in your Resend dashboard`,
    };
  }

  const detail = await resend.domains.get(domain.id);
  const records = detail.data?.records ?? [];

  return {
    configured: true,
    domain: domainName,
    status: detail.data?.status ?? domain.status,
    spfVerified: records.some((r) => r.record === "SPF" && r.status === "verified"),
    dkimVerified: records.some((r) => r.record === "DKIM" && r.status === "verified"),
    replyTo: await getReplyToEmail(),
    from: FROM_EMAIL,
  };
}

function baseTemplate(
  content: string,
  branding?: { name?: string; title?: string; signature?: string | null }
) {
  const name = branding?.name ?? "Dr. Hari Prakash";
  const title = branding?.title ?? "Assistant Professor, Public Health";
  const signature = branding?.signature;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f8f6f2;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f2;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#0f5c5c,#0d9488);padding:28px 32px;">
            <p style="margin:0;color:#d4a853;font-size:12px;letter-spacing:2px;text-transform:uppercase;">ScholarDesk</p>
            <p style="margin:8px 0 0;color:#ffffff;font-size:20px;font-weight:600;">${name}</p>
            <p style="margin:4px 0 0;color:#99f6e4;font-size:13px;">${title}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${content}
            ${signature ? `<p style="margin:24px 0 0;color:#64748b;font-size:13px;border-top:1px solid #e2e8f0;padding-top:16px;white-space:pre-line;">${signature}</p>` : ""}
          </td>
        </tr>
        <tr>
          <td style="background:#f1f5f9;padding:20px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
              Sent via <a href="${APP_URL}" style="color:#0d9488;">ScholarDesk</a> · MSRUAS, Bengaluru
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function getEmailBranding() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  return {
    name: settings?.userName ?? "Dr. Hari Prakash",
    title: settings?.userTitle ?? "Assistant Professor, Public Health",
    signature: settings?.emailSignature ?? null,
  };
}

export function taskAssignedEmail(params: {
  assigneeName: string;
  taskTitle: string;
  projectTitle?: string;
  dueDate?: string;
  description?: string;
}) {
  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear <strong>${params.assigneeName}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      Dr. Hari Prakash has assigned you a new research task:
    </p>
    <div style="background:#f0fdfa;border-left:4px solid #0d9488;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#0f5c5c;font-size:18px;font-weight:600;">${params.taskTitle}</p>
      ${params.projectTitle ? `<p style="margin:0 0 8px;color:#64748b;font-size:14px;">Project: ${params.projectTitle}</p>` : ""}
      ${params.dueDate ? `<p style="margin:0 0 8px;color:#64748b;font-size:14px;">Due: ${params.dueDate}</p>` : ""}
      ${params.description ? `<p style="margin:8px 0 0;color:#475569;font-size:14px;">${params.description}</p>` : ""}
    </div>
    <p style="margin:0;color:#475569;font-size:14px;">Please complete this task by the due date. Contact Dr. Hari Prakash if you have questions.</p>
  `;
  return {
    subject: `New Task Assigned: ${params.taskTitle}`,
    html: baseTemplate(content),
  };
}

export function projectInviteEmail(params: {
  memberName: string;
  projectTitle: string;
  role: string;
  description?: string;
}) {
  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear <strong>${params.memberName}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      You have been added to a research project by Dr. Hari Prakash:
    </p>
    <div style="background:#f0fdfa;border-left:4px solid #0d9488;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#0f5c5c;font-size:18px;font-weight:600;">${params.projectTitle}</p>
      <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Your role: ${params.role}</p>
      ${params.description ? `<p style="margin:8px 0 0;color:#475569;font-size:14px;">${params.description}</p>` : ""}
    </div>
    <p style="margin:0;color:#475569;font-size:14px;">You may receive task assignments related to this project. Please stay in touch with Dr. Hari Prakash regarding your responsibilities.</p>
  `;
  return {
    subject: `Added to Research Project: ${params.projectTitle}`,
    html: baseTemplate(content),
  };
}

export function reminderEmail(params: {
  recipientName: string;
  title: string;
  message?: string;
  dueDate: string;
}) {
  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear <strong>${params.recipientName}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      This is a reminder from Dr. Hari Prakash:
    </p>
    <div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#92400e;font-size:18px;font-weight:600;">${params.title}</p>
      <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Due: ${params.dueDate}</p>
      ${params.message ? `<p style="margin:8px 0 0;color:#475569;font-size:14px;">${params.message}</p>` : ""}
    </div>
    <p style="margin:0;color:#475569;font-size:14px;">Please take action before the deadline. Contact Dr. Hari Prakash if you need assistance.</p>
  `;
  return {
    subject: `Reminder: ${params.title}`,
    html: baseTemplate(content),
  };
}

export function welcomePersonEmail(params: {
  name: string;
  role: string;
  supervisorName?: string;
  institution?: string;
  replyEmail?: string;
}) {
  const supervisor = params.supervisorName ?? "Dr. Hari Prakash";
  const institution = params.institution ?? "MSRUAS, Bengaluru";
  const replyEmail = params.replyEmail ?? "your supervisor";

  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear <strong>${params.name}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      ${supervisor} has added you to the ScholarDesk research team at <strong>${institution}</strong> as a <strong>${params.role}</strong>.
    </p>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Through ScholarDesk you may receive task assignments, publication updates, and deadline reminders related to your research work.
    </p>
    <p style="margin:0;color:#475569;font-size:14px;">
      If you have questions, reply to this email or contact ${supervisor} at
      <a href="mailto:${replyEmail}" style="color:#0d9488;">${replyEmail}</a>.
    </p>
  `;
  return {
    subject: `ScholarDesk team update — ${params.name} (${params.role})`,
    html: baseTemplate(content),
  };
}

export function portalInviteEmail(params: {
  name: string;
  email: string;
  pin: string;
  supervisorName?: string;
  portalUrl?: string;
  magicLoginUrl?: string;
}) {
  const supervisor = params.supervisorName ?? "Dr. Hari Prakash";
  const portalUrl = params.portalUrl ?? `${APP_URL}/portal/login`;
  const loginUrl = params.magicLoginUrl ?? portalUrl;

  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Hi <strong>${params.name}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      ${supervisor} has enabled your <strong>ScholarDesk Team Portal</strong>. Click below to sign in and view your tasks, projects, and publications.
    </p>
    <p style="margin:0 0 24px;text-align:center;">
      <a href="${loginUrl}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:12px;font-size:16px;font-weight:600;">
        Click to Login &amp; View Your Tasks
      </a>
    </p>
    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Or sign in manually</p>
      <p style="margin:0 0 4px;color:#475569;font-size:14px;">Portal: <a href="${portalUrl}" style="color:#0d9488;">${portalUrl}</a></p>
      <p style="margin:0 0 4px;color:#475569;font-size:14px;">Email: <strong>${params.email}</strong></p>
      <p style="margin:0;color:#475569;font-size:14px;">PIN: <strong>${params.pin}</strong></p>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
      This login link is valid for 90 days. Contact ${supervisor} if you need help.
    </p>
  `;
  return {
    subject: `Your ScholarDesk portal is ready — click to login`,
    html: baseTemplate(content),
  };
}

export function projectCreatedEmail(params: {
  memberName: string;
  projectTitle: string;
  aims?: string;
  objectives?: string;
  methodology?: string;
  studyState?: string;
  researchPhase?: string;
  timeline?: string;
}) {
  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear <strong>${params.memberName}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      A new public health research project has been set up on ScholarDesk:
    </p>
    <div style="background:#f0fdfa;border-left:4px solid #0d9488;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#0f5c5c;font-size:18px;font-weight:600;">${params.projectTitle}</p>
      ${params.researchPhase ? `<p style="margin:0 0 8px;color:#64748b;font-size:14px;"><strong>Phase:</strong> ${params.researchPhase}</p>` : ""}
      ${params.studyState ? `<p style="margin:0 0 8px;color:#64748b;font-size:14px;"><strong>State:</strong> ${params.studyState}</p>` : ""}
      ${params.aims ? `<p style="margin:8px 0 0;color:#475569;font-size:14px;"><strong>Aims:</strong> ${params.aims}</p>` : ""}
      ${params.objectives ? `<p style="margin:8px 0 0;color:#475569;font-size:14px;"><strong>Objectives:</strong> ${params.objectives}</p>` : ""}
      ${params.methodology ? `<p style="margin:8px 0 0;color:#475569;font-size:14px;"><strong>Methodology:</strong> ${params.methodology}</p>` : ""}
      ${params.timeline ? `<p style="margin:8px 0 0;color:#475569;font-size:14px;"><strong>Timeline:</strong> ${params.timeline}</p>` : ""}
    </div>
    <p style="margin:0;color:#475569;font-size:14px;">You are part of this project team. Task assignments and updates will follow as the study progresses.</p>
  `;
  return {
    subject: `New Research Project: ${params.projectTitle}`,
    html: baseTemplate(content),
  };
}

export function publicationTeamEmail(params: {
  memberName: string;
  publicationTitle: string;
  role: string;
  journal?: string;
  status?: string;
}) {
  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear <strong>${params.memberName}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      You have been added to a publication team by Dr. Hari Prakash:
    </p>
    <div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#1e3a8a;font-size:18px;font-weight:600;">${params.publicationTitle}</p>
      <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Your role: <strong>${params.role}</strong></p>
      ${params.journal ? `<p style="margin:0 0 8px;color:#64748b;font-size:14px;">Journal: ${params.journal}</p>` : ""}
      ${params.status ? `<p style="margin:0;color:#64748b;font-size:14px;">Current status: ${params.status}</p>` : ""}
    </div>
    <p style="margin:0;color:#475569;font-size:14px;">Please coordinate with the team on manuscript writing, submission, and revisions as needed.</p>
  `;
  return {
    subject: `Publication Team: ${params.publicationTitle}`,
    html: baseTemplate(content),
  };
}

export function publicationStatusEmail(params: {
  memberName: string;
  publicationTitle: string;
  oldStatus: string;
  newStatus: string;
  journal?: string;
  reviewerComments?: string;
}) {
  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear <strong>${params.memberName}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      The publication status has been updated:
    </p>
    <div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#92400e;font-size:18px;font-weight:600;">${params.publicationTitle}</p>
      ${params.journal ? `<p style="margin:0 0 8px;color:#64748b;font-size:14px;">Journal: ${params.journal}</p>` : ""}
      <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Status: <strong>${params.oldStatus}</strong> → <strong>${params.newStatus}</strong></p>
      ${params.reviewerComments ? `<p style="margin:8px 0 0;color:#475569;font-size:14px;"><strong>Reviewer comments:</strong> ${params.reviewerComments}</p>` : ""}
    </div>
    <p style="margin:0;color:#475569;font-size:14px;">Please review and take any required action for your role on this manuscript.</p>
  `;
  return {
    subject: `Publication Update: ${params.publicationTitle} — ${params.newStatus}`,
    html: baseTemplate(content),
  };
}

export function projectPhaseUpdateEmail(params: {
  memberName: string;
  projectTitle: string;
  oldPhase: string;
  newPhase: string;
  studyState?: string;
}) {
  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear <strong>${params.memberName}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      A research project has moved to a new phase:
    </p>
    <div style="background:#f0fdfa;border-left:4px solid #0d9488;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#0f5c5c;font-size:18px;font-weight:600;">${params.projectTitle}</p>
      <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Phase: <strong>${params.oldPhase}</strong> → <strong>${params.newPhase}</strong></p>
      ${params.studyState ? `<p style="margin:0;color:#64748b;font-size:14px;">Study state: ${params.studyState}</p>` : ""}
    </div>
    <p style="margin:0;color:#475569;font-size:14px;">Please align your tasks and deliverables with this phase of the study.</p>
  `;
  return {
    subject: `Project Phase Update: ${params.projectTitle}`,
    html: baseTemplate(content),
  };
}

export function planningEventEmail(params: {
  title: string;
  type: string;
  startDate: string;
  endDate?: string;
  location?: string;
  prepNotes?: string;
  isReminder?: boolean;
  daysUntil?: number;
}) {
  const heading = params.isReminder
    ? `Upcoming in ${params.daysUntil} day${params.daysUntil === 1 ? "" : "s"}`
    : "New event added to your planner";
  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear <strong>Dr. Hari Prakash</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">${heading}:</p>
    <div style="background:#eef2ff;border-left:4px solid #6366f1;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#312e81;font-size:18px;font-weight:600;">${params.title}</p>
      <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Type: ${params.type.replace(/_/g, " ")}</p>
      <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Date: ${params.startDate}${params.endDate ? ` – ${params.endDate}` : ""}</p>
      ${params.location ? `<p style="margin:0 0 8px;color:#64748b;font-size:14px;">Location: ${params.location}</p>` : ""}
      ${params.prepNotes ? `<p style="margin:8px 0 0;color:#475569;font-size:14px;">Prep: ${params.prepNotes}</p>` : ""}
    </div>
    <p style="margin:0;color:#475569;font-size:14px;">Open ScholarDesk → Month Planning to review your checklist and preparation notes.</p>
  `;
  return {
    subject: params.isReminder
      ? `Reminder: ${params.title} in ${params.daysUntil} days`
      : `Planned: ${params.title}`,
    html: baseTemplate(content),
  };
}

export function weeklyDigestEmail(params: {
  userName: string;
  weekRange: string;
  upcomingExams: Array<{ title: string; course: string; date: string }>;
  planningEvents: Array<{ title: string; type: string; date: string }>;
  pendingTasks: Array<{ title: string; project?: string; dueDate?: string }>;
  activePublications: Array<{ title: string; status: string; revision?: string }>;
  overdueReminders: Array<{ title: string; dueDate: string }>;
}) {
  const section = (title: string, items: string) =>
    items
      ? `<div style="margin-bottom:24px;">
          <p style="margin:0 0 12px;color:#0f5c5c;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">${title}</p>
          ${items}
        </div>`
      : "";

  const listItem = (main: string, sub?: string) =>
    `<div style="padding:12px 16px;background:#f8fafc;border-radius:8px;margin-bottom:8px;">
      <p style="margin:0;color:#334155;font-size:14px;font-weight:500;">${main}</p>
      ${sub ? `<p style="margin:4px 0 0;color:#64748b;font-size:13px;">${sub}</p>` : ""}
    </div>`;

  const examsHtml = params.upcomingExams.length
    ? params.upcomingExams.map((e) => listItem(e.title, `${e.course} · ${e.date}`)).join("")
    : `<p style="margin:0;color:#94a3b8;font-size:14px;">No exams this week.</p>`;

  const eventsHtml = params.planningEvents.length
    ? params.planningEvents.map((e) => listItem(e.title, `${e.type} · ${e.date}`)).join("")
    : `<p style="margin:0;color:#94a3b8;font-size:14px;">No planning events this week.</p>`;

  const tasksHtml = params.pendingTasks.length
    ? params.pendingTasks.map((t) => listItem(t.title, [t.project, t.dueDate].filter(Boolean).join(" · "))).join("")
    : `<p style="margin:0;color:#94a3b8;font-size:14px;">No pending tasks.</p>`;

  const pubsHtml = params.activePublications.length
    ? params.activePublications.map((p) => listItem(p.title, `${p.status}${p.revision ? ` · ${p.revision}` : ""}`)).join("")
    : `<p style="margin:0;color:#94a3b8;font-size:14px;">No active manuscripts.</p>`;

  const remindersHtml = params.overdueReminders.length
    ? params.overdueReminders.map((r) => listItem(r.title, `Due: ${r.dueDate}`)).join("")
    : `<p style="margin:0;color:#94a3b8;font-size:14px;">All caught up on reminders.</p>`;

  const content = `
    <p style="margin:0 0 8px;color:#334155;font-size:16px;">Good morning, <strong>${params.userName}</strong>!</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;">Your ScholarDesk weekly summary for <strong>${params.weekRange}</strong>:</p>
    ${section("📅 Upcoming Exams", examsHtml)}
    ${section("🗓 Month Planning", eventsHtml)}
    ${section("📋 Pending Research Tasks", tasksHtml)}
    ${section("📄 Active Manuscripts", pubsHtml)}
    ${section("⏰ Overdue Reminders", remindersHtml)}
    <p style="margin:24px 0 0;color:#475569;font-size:14px;">Open <a href="${APP_URL}" style="color:#0d9488;">ScholarDesk</a> to manage your week ahead.</p>
  `;

  return {
    subject: `ScholarDesk Weekly Digest — ${params.weekRange}`,
    html: baseTemplate(content),
  };
}

export function planningEventConfirmedEmail(params: {
  userName: string;
  title: string;
  type: string;
  startDate: string;
  endDate?: string;
  location?: string;
  venue?: string;
}) {
  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear <strong>${params.userName}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      You marked an invitation as <strong>Confirmed</strong> on ScholarDesk:
    </p>
    <div style="background:#ecfdf5;border-left:4px solid #10b981;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#065f46;font-size:18px;font-weight:600;">${params.title}</p>
      <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Type: ${params.type.replace(/_/g, " ")}</p>
      <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Date: ${params.startDate}${params.endDate ? ` – ${params.endDate}` : ""}</p>
      ${params.location ? `<p style="margin:0 0 8px;color:#64748b;font-size:14px;">Location: ${params.location}</p>` : ""}
      ${params.venue ? `<p style="margin:0;color:#64748b;font-size:14px;">Venue: ${params.venue}</p>` : ""}
    </div>
    <p style="margin:0;color:#475569;font-size:14px;">Review your prep checklist in Month Planning before you travel.</p>
  `;
  return {
    subject: `Confirmed: ${params.title}`,
    html: baseTemplate(content),
  };
}

export function weeklyBackupEmail(params: { userName: string; date: string; recordCounts: Record<string, number> }) {
  const counts = Object.entries(params.recordCounts)
    .map(([k, v]) => `<li style="margin:4px 0;color:#475569;font-size:14px;">${k}: <strong>${v}</strong></li>`)
    .join("");

  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear <strong>${params.userName}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      Your weekly ScholarDesk data backup for <strong>${params.date}</strong> is attached (JSON + Excel).
    </p>
    <div style="background:#f0fdfa;border-left:4px solid #0d9488;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 12px;color:#0f5c5c;font-size:14px;font-weight:600;">Records in this backup:</p>
      <ul style="margin:0;padding-left:20px;">${counts}</ul>
    </div>
    <p style="margin:0;color:#475569;font-size:14px;">Store these files safely. You can also download a fresh backup anytime from Settings.</p>
  `;
  return {
    subject: `ScholarDesk Weekly Backup — ${params.date}`,
    html: baseTemplate(content),
  };
}
