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
  category?: "team" | "task" | "reminder" | "planning" | "digest" | "backup" | "message" | "publication" | "project";
  replyTo?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments,
  category,
  replyTo: replyToOverride,
}: SendEmailParams) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", to);
    return { success: false, reason: "not_configured" };
  }

  const replyTo = replyToOverride ?? (await getReplyToEmail());
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

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function attachmentSharedEmail(params: {
  memberName: string;
  itemTitle: string;
  itemType: string;
  filename: string;
  supervisorName?: string;
}) {
  const supervisor = params.supervisorName ?? "Dr. Hari Prakash";
  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear <strong>${params.memberName}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      ${supervisor} shared a new file on <strong>${params.itemTitle}</strong> (${params.itemType}):
    </p>
    <div style="background:#f0fdfa;border-left:4px solid #0d9488;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0;color:#0f5c5c;font-size:16px;font-weight:600;">📎 ${escapeHtml(params.filename)}</p>
    </div>
    <p style="margin:0 0 16px;text-align:center;">
      <a href="${APP_URL}/portal/login" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:600;">
        Open Portal &amp; Download
      </a>
    </p>
    <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
      Sign in to your Team Portal to download this file.
    </p>
  `;
  return {
    subject: `New file shared: ${params.filename}`,
    html: baseTemplate(content),
  };
}

export function taskStatusUpdateEmail(params: {
  memberName: string;
  taskTitle: string;
  projectTitle?: string | null;
  statusLabel: string;
  supervisorName?: string;
}) {
  const projectLine = params.projectTitle
    ? `<p style="margin:0 0 8px;color:#64748b;font-size:13px;">Project: ${escapeHtml(params.projectTitle)}</p>`
    : "";
  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Hello <strong>${escapeHtml(params.supervisorName ?? "Dr. Hari Prakash")}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      <strong>${escapeHtml(params.memberName)}</strong> updated a task status in ScholarDesk:
    </p>
    <div style="background:#f0fdfa;border-left:4px solid #0d9488;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#0f5c5c;font-size:16px;font-weight:600;">${escapeHtml(params.taskTitle)}</p>
      ${projectLine}
      <p style="margin:0;color:#0d9488;font-size:14px;font-weight:600;">Status: ${escapeHtml(params.statusLabel)}</p>
    </div>
    <p style="margin:0 0 16px;text-align:center;">
      <a href="${APP_URL}/research" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:600;">
        View in Dashboard
      </a>
    </p>
  `;
  return {
    subject: `Task update: ${params.taskTitle} — ${params.statusLabel}`,
    html: baseTemplate(content),
  };
}

export function teamInstructionEmail(params: {
  memberName: string;
  projectTitle: string;
  instructions: string;
  supervisorName?: string;
  dueDate?: string;
}) {
  const supervisor = params.supervisorName ?? "Dr. Hari Prakash";
  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear <strong>${params.memberName}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      ${supervisor} has shared instructions for <strong>${params.projectTitle}</strong>:
    </p>
    <div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0;color:#1e3a8a;font-size:15px;line-height:1.6;white-space:pre-line;">${escapeHtml(params.instructions)}</p>
      ${params.dueDate ? `<p style="margin:16px 0 0;color:#64748b;font-size:14px;"><strong>Please complete by:</strong> ${params.dueDate}</p>` : ""}
    </div>
    <p style="margin:0;color:#475569;font-size:14px;">
      Log in to your <a href="${APP_URL}/portal/login" style="color:#0d9488;">Team Portal</a> to view your tasks and project updates.
      Reply to this email if you have questions.
    </p>
  `;
  return {
    subject: `Instructions: ${params.projectTitle}`,
    html: baseTemplate(content),
  };
}

export function portalMessageEmail(params: {
  fromName: string;
  fromEmail?: string | null;
  fromRole?: string | null;
  subject?: string | null;
  body: string;
}) {
  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Hello <strong>Dr. Hari Prakash</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      You have a new message from a team member via the ScholarDesk portal:
    </p>
    <div style="background:#f0fdfa;border-left:4px solid #0d9488;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;color:#0f5c5c;font-size:16px;font-weight:600;">${escapeHtml(params.fromName)}${params.fromRole ? ` · ${escapeHtml(params.fromRole.replace(/_/g, " "))}` : ""}</p>
      ${params.fromEmail ? `<p style="margin:0 0 12px;color:#64748b;font-size:13px;">${escapeHtml(params.fromEmail)}</p>` : ""}
      ${params.subject ? `<p style="margin:0 0 8px;color:#334155;font-size:15px;font-weight:600;">${escapeHtml(params.subject)}</p>` : ""}
      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;white-space:pre-line;">${escapeHtml(params.body)}</p>
    </div>
    <p style="margin:0 0 16px;text-align:center;">
      <a href="${APP_URL}/messages" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:600;">
        View in Dashboard
      </a>
    </p>
    ${params.fromEmail ? `<p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">Reply to this email to respond to ${escapeHtml(params.fromName)} directly.</p>` : ""}
  `;
  return {
    subject: `New portal message from ${params.fromName}${params.subject ? `: ${params.subject}` : ""}`,
    html: baseTemplate(content),
  };
}

export function independenceDayEmail(params: { name: string; supervisorName?: string }) {
  const supervisor = params.supervisorName ?? "Dr. Hari Prakash";
  const content = `
    <style>
      @keyframes idmWave { 0%,100%{transform:rotate(0deg)} 20%{transform:rotate(-12deg)} 60%{transform:rotate(12deg)} }
      @keyframes idmPop { 0%{transform:scale(0.85);opacity:0} 100%{transform:scale(1);opacity:1} }
      @keyframes idmPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
      @keyframes idmShine { 0%{transform:translateX(-120%)} 100%{transform:translateX(320%)} }
      @keyframes idmRise { 0%{opacity:0;transform:translateY(12px)} 100%{opacity:1;transform:translateY(0)} }
      .idm-flag{display:inline-block;animation:idmWave 1.6s ease-in-out infinite;transform-origin:60% 80%}
      .idm-pop{display:inline-block;animation:idmPop .7s cubic-bezier(.2,.8,.2,1) both}
      .idm-pulse{display:inline-block;animation:idmPulse 1.8s ease-in-out infinite}
      .idm-rise{animation:idmRise .8s ease-out both}
      .idm-shine{animation:idmShine 3s ease-in-out infinite}
    </style>
    <div style="position:relative;height:10px;border-radius:6px;overflow:hidden;margin:0 0 22px;">
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,#FF9933 0 33%,#ffffff 33% 66%,#138808 66% 100%);"></div>
      <div class="idm-shine" style="position:absolute;top:0;bottom:0;width:40%;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.75),rgba(255,255,255,0));"></div>
    </div>
    <p style="margin:0 0 8px;text-align:center;font-size:46px;line-height:1;"><span class="idm-flag">🇮🇳</span></p>
    <h1 class="idm-pop" style="margin:0 0 8px;text-align:center;font-size:26px;font-weight:800;color:#0f172a;">Happy 80th Independence Day!</h1>
    <p style="margin:0 0 20px;text-align:center;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#EA580C;font-weight:600;">15 August 2026 &nbsp;•&nbsp; Jai Hind</p>
    <div class="idm-rise">
      <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear <strong>${escapeHtml(params.name)}</strong>,</p>
      <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">
        On this proud day, we celebrate <strong>80 years of freedom</strong>. A nation strong in its unity and its
        diversity, a nation that keeps rising. As one of the world&apos;s fastest growing countries, India moves
        forward on the strength of its people and the promise of its youth.
      </p>
      <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">
        Thank you for being part of this journey of learning, research, and service. May we keep building a
        healthier, wiser, and brighter tomorrow, together.
      </p>
    </div>
    <p style="margin:24px 0 0;text-align:center;font-size:22px;font-weight:800;color:#138808;"><span class="idm-pulse">Jai Hind! 🇮🇳</span></p>
    <p style="margin:12px 0 0;text-align:center;color:#64748b;font-size:14px;">With warm wishes, ${supervisor}</p>
  `;
  return {
    subject: "🇮🇳 Happy 80th Independence Day, Jai Hind!",
    html: baseTemplate(content),
  };
}

export function thesisUpdateEmail(params: {
  recipientName: string;
  actorName: string;
  thesisTitle: string;
  studentName: string;
  summary: string;
  instructions?: string | null;
}) {
  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear <strong>${escapeHtml(params.recipientName)}</strong>,</p>
    <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
      <strong>${escapeHtml(params.actorName)}</strong> updated the thesis timeline:
    </p>
    <div style="background:#f0fdfa;border-left:4px solid #0d9488;border-radius:8px;padding:20px;margin-bottom:20px;">
      <p style="margin:0 0 6px;color:#0f5c5c;font-size:16px;font-weight:600;">${escapeHtml(params.thesisTitle)}</p>
      <p style="margin:0 0 8px;color:#64748b;font-size:13px;">Student: ${escapeHtml(params.studentName)}</p>
      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">${escapeHtml(params.summary)}</p>
    </div>
    ${
      params.instructions
        ? `<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:8px;padding:16px;margin-bottom:20px;">
             <p style="margin:0 0 6px;color:#1e3a8a;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Instructions</p>
             <p style="margin:0;color:#1e3a8a;font-size:14px;line-height:1.6;white-space:pre-line;">${escapeHtml(params.instructions)}</p>
           </div>`
        : ""
    }
    <p style="margin:0;color:#475569;font-size:14px;">Open ScholarDesk to view the full milestone timeline.</p>
  `;
  return {
    subject: `Thesis update: ${params.studentName} — ${params.thesisTitle}`,
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

export function personalProjectAccessEmail(params: {
  name: string;
  supervisorName?: string;
  loginUrl: string;
  hasPortalAccess: boolean;
}) {
  const supervisor = params.supervisorName ?? "Dr. Hari Prakash";
  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear <strong>${escapeHtml(params.name)}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      ${supervisor} has added you to <strong>Personal Projects</strong> on ScholarDesk. You can now create and
      track your own projects — including manuscript writing, journal submission, and review status — right
      from your Team Portal. Everything you create is automatically shared with ${supervisor}.
    </p>
    <div style="background:#f0fdfa;border-left:4px solid #0d9488;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#0f5c5c;font-size:15px;">📁 Create your own manuscript &amp; personal projects</p>
      <p style="margin:0;color:#0f5c5c;font-size:15px;">📊 Track progress by stage — Drafting → Submitted → Under Review → Accepted → Published</p>
    </div>
    <p style="margin:0 0 16px;text-align:center;">
      <a href="${params.loginUrl}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:600;">
        Open Your Portal
      </a>
    </p>
    ${
      params.hasPortalAccess
        ? `<p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">This login link is valid for 90 days.</p>`
        : `<p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">If this is your first time, ${supervisor} will share your portal login (email &amp; PIN) separately so you can sign in.</p>`
    }
  `;
  return {
    subject: `You've been added to Personal Projects on ScholarDesk`,
    html: baseTemplate(content),
  };
}

export function portalMovedEmail(params: {
  name: string;
  magicLoginUrl: string;
  portalUrl: string;
  newUrl: string;
  supervisorName?: string;
}) {
  const supervisor = params.supervisorName ?? "Dr. Hari Prakash";
  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Hi <strong>${escapeHtml(params.name)}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      Your <strong>ScholarDesk Team Portal</strong> has a new home. Please use this address from now on:
    </p>
    <div style="background:#f0fdfa;border-left:4px solid #0d9488;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
      <a href="${params.portalUrl}" style="color:#0f5c5c;font-size:16px;font-weight:600;text-decoration:none;">${escapeHtml(params.newUrl)}</a>
    </div>
    <p style="margin:0 0 24px;text-align:center;">
      <a href="${params.magicLoginUrl}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:12px;font-size:16px;font-weight:600;">
        Click to Sign In
      </a>
    </p>
    <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
      This one-click link is valid for 90 days. <strong>Your existing PIN still works</strong> — you can also sign in
      at ${escapeHtml(params.newUrl)} with your email and PIN. Reply to this email if you need help. — ${supervisor}
    </p>
  `;
  return {
    subject: `Your ScholarDesk portal has moved — new sign-in link`,
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

const PUB_STATUS_COPY: Record<
  string,
  { emoji: string; subject: string; headline: string; border: string; bg: string; heading: string; closing: string }
> = {
  SUBMITTED: {
    emoji: "📨",
    subject: "Submitted",
    headline: "The manuscript has been submitted to the journal.",
    border: "#3b82f6",
    bg: "#eff6ff",
    heading: "#1e3a8a",
    closing: "Now we wait for the editor's initial decision. Fingers crossed!",
  },
  UNDER_REVIEW: {
    emoji: "🔍",
    subject: "Under Review",
    headline: "Good news — the manuscript has entered peer review.",
    border: "#f59e0b",
    bg: "#fffbeb",
    heading: "#92400e",
    closing: "The reviewers are reading our work. We'll share their comments as soon as they arrive.",
  },
  REVISION_REQUESTED: {
    emoji: "✏️",
    subject: "Revision Requested",
    headline: "The journal has requested revisions — action needed.",
    border: "#f97316",
    bg: "#fff7ed",
    heading: "#9a3412",
    closing: "Please review the comments below. Let's turn the revision around promptly and resubmit stronger.",
  },
  RESUBMITTED: {
    emoji: "🔁",
    subject: "Resubmitted",
    headline: "The revised manuscript has been resubmitted.",
    border: "#8b5cf6",
    bg: "#f5f3ff",
    heading: "#5b21b6",
    closing: "Thank you for the revisions. Back to the editor's desk we go.",
  },
  ACCEPTED: {
    emoji: "🎉",
    subject: "Accepted!",
    headline: "Congratulations — our manuscript has been ACCEPTED!",
    border: "#10b981",
    bg: "#ecfdf5",
    heading: "#065f46",
    closing: "Wonderful work by the whole team. 🎊 Enjoy this moment — you earned it. Details on proofs and publication will follow.",
  },
  PUBLISHED: {
    emoji: "🏆",
    subject: "Published!",
    headline: "It's official — our work is PUBLISHED!",
    border: "#0d9488",
    bg: "#f0fdfa",
    heading: "#0f5c5c",
    closing: "Our research is now out in the world and can start making an impact. Congratulations to everyone involved! 🎉",
  },
  REJECTED: {
    emoji: "💪",
    subject: "Not accepted this time",
    headline: "This manuscript wasn't accepted this time.",
    border: "#ef4444",
    bg: "#fef2f2",
    heading: "#991b1b",
    closing: "Every strong paper collects a few rejections. Let's learn from the feedback, regroup, and resubmit to a well-matched journal. Onward.",
  },
  DRAFT: {
    emoji: "📝",
    subject: "Back to Draft",
    headline: "The manuscript has been moved back to draft.",
    border: "#6366f1",
    bg: "#eef2ff",
    heading: "#3730a3",
    closing: "Time to keep polishing. Let's get it submission-ready.",
  },
};

export function publicationStatusEmail(params: {
  memberName: string;
  publicationTitle: string;
  oldStatus: string;
  newStatus: string;
  newStatusValue?: string;
  journal?: string;
  reviewerComments?: string;
}) {
  const c = PUB_STATUS_COPY[params.newStatusValue ?? ""] ?? {
    emoji: "📄",
    subject: params.newStatus,
    headline: `The manuscript status is now ${params.newStatus}.`,
    border: "#0d9488",
    bg: "#f0fdfa",
    heading: "#0f5c5c",
    closing: "Please review and take any required action for your role on this manuscript.",
  };
  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear <strong>${escapeHtml(params.memberName)}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:16px;line-height:1.6;">${c.emoji} ${c.headline}</p>
    <div style="background:${c.bg};border-left:4px solid ${c.border};border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:${c.heading};font-size:18px;font-weight:600;">${escapeHtml(params.publicationTitle)}</p>
      ${params.journal ? `<p style="margin:0 0 8px;color:#64748b;font-size:14px;">Journal: ${escapeHtml(params.journal)}</p>` : ""}
      <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Status: <strong>${escapeHtml(params.oldStatus)}</strong> → <strong>${escapeHtml(params.newStatus)}</strong></p>
      ${params.reviewerComments ? `<p style="margin:8px 0 0;color:#475569;font-size:14px;"><strong>Reviewer comments:</strong> ${escapeHtml(params.reviewerComments)}</p>` : ""}
    </div>
    <p style="margin:0;color:#475569;font-size:15px;line-height:1.6;">${c.closing}</p>
  `;
  return {
    subject: `${c.emoji} ${params.publicationTitle} — ${c.subject}`,
    html: baseTemplate(content),
  };
}

export function directMessageEmail(params: {
  name: string;
  subject?: string | null;
  message: string;
  supervisorName?: string;
}) {
  const supervisor = params.supervisorName ?? "Dr. Hari Prakash";
  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear <strong>${escapeHtml(params.name)}</strong>,</p>
    ${params.subject ? `<p style="margin:0 0 12px;color:#0f5c5c;font-size:16px;font-weight:600;">${escapeHtml(params.subject)}</p>` : ""}
    <div style="background:#f8fafc;border-left:4px solid #0d9488;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0;color:#334155;font-size:15px;line-height:1.7;white-space:pre-line;">${escapeHtml(params.message)}</p>
    </div>
    <p style="margin:0;color:#64748b;font-size:14px;">— ${supervisor}. You can reply directly to this email.</p>
  `;
  return {
    subject: params.subject ? `${params.subject}` : `A message from ${supervisor}`,
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

const PROJECT_STATUS_COPY: Record<
  string,
  { emoji: string; subject: string; headline: string; border: string; bg: string; heading: string; closing: string }
> = {
  IDEA: {
    emoji: "💡",
    subject: "New Idea",
    headline: "A new research idea is taking shape.",
    border: "#8b5cf6",
    bg: "#f5f3ff",
    heading: "#5b21b6",
    closing: "Exciting early days — let's shape the question and scope.",
  },
  PLANNING: {
    emoji: "🗺️",
    subject: "In Planning",
    headline: "The project has moved into planning.",
    border: "#6366f1",
    bg: "#eef2ff",
    heading: "#3730a3",
    closing: "Let's firm up the protocol, timeline, and roles.",
  },
  ACTIVE: {
    emoji: "🚀",
    subject: "Now Active",
    headline: "The project is now active — let's get to work!",
    border: "#14b8a6",
    bg: "#f0fdfa",
    heading: "#0f5c5c",
    closing: "Momentum starts now. Check your tasks and let's move it forward.",
  },
  ON_HOLD: {
    emoji: "⏸️",
    subject: "On Hold",
    headline: "The project has been put on hold for now.",
    border: "#f59e0b",
    bg: "#fffbeb",
    heading: "#92400e",
    closing: "We'll pick this back up soon. No action needed for the moment.",
  },
  COMPLETED: {
    emoji: "✅",
    subject: "Completed!",
    headline: "Congratulations — the project is complete!",
    border: "#22c55e",
    bg: "#ecfdf5",
    heading: "#065f46",
    closing: "Fantastic work by the whole team. 🎉 Thank you for seeing it through.",
  },
  ARCHIVED: {
    emoji: "📦",
    subject: "Archived",
    headline: "The project has been archived.",
    border: "#a8a29e",
    bg: "#f8fafc",
    heading: "#475569",
    closing: "Filed away for reference. Reach out if it needs reviving.",
  },
};

export function projectStatusEmail(params: {
  memberName: string;
  projectTitle: string;
  oldStatus: string;
  newStatus: string;
  newStatusValue?: string;
  studyState?: string;
}) {
  const c = PROJECT_STATUS_COPY[params.newStatusValue ?? ""] ?? {
    emoji: "📁",
    subject: params.newStatus,
    headline: `The project status is now ${params.newStatus}.`,
    border: "#0d9488",
    bg: "#f0fdfa",
    heading: "#0f5c5c",
    closing: "Please align your tasks with this update.",
  };
  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear <strong>${escapeHtml(params.memberName)}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:16px;line-height:1.6;">${c.emoji} ${c.headline}</p>
    <div style="background:${c.bg};border-left:4px solid ${c.border};border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:${c.heading};font-size:18px;font-weight:600;">${escapeHtml(params.projectTitle)}</p>
      <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Status: <strong>${escapeHtml(params.oldStatus)}</strong> → <strong>${escapeHtml(params.newStatus)}</strong></p>
      ${params.studyState ? `<p style="margin:0;color:#64748b;font-size:14px;">Study state: ${escapeHtml(params.studyState)}</p>` : ""}
    </div>
    <p style="margin:0;color:#475569;font-size:15px;line-height:1.6;">${c.closing}</p>
  `;
  return {
    subject: `${c.emoji} ${params.projectTitle} — ${c.subject}`,
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
