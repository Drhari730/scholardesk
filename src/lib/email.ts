import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL =
  process.env.EMAIL_FROM ?? "ScholarDesk <onboarding@resend.dev>";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://scholardesk-production-55cf.up.railway.app";

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", to);
    return { success: false, reason: "not_configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
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

function baseTemplate(content: string) {
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
            <p style="margin:8px 0 0;color:#ffffff;font-size:20px;font-weight:600;">Dr. Hari Prakash</p>
            <p style="margin:4px 0 0;color:#99f6e4;font-size:13px;">Assistant Professor, Public Health</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${content}
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

export function welcomePersonEmail(params: { name: string; role: string }) {
  const content = `
    <p style="margin:0 0 16px;color:#334155;font-size:16px;">Dear <strong>${params.name}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      You have been added to Dr. Hari Prakash's academic team on ScholarDesk as a <strong>${params.role}</strong>.
    </p>
    <p style="margin:0;color:#475569;font-size:14px;">You may receive task assignments and reminders via email. Please ensure you respond promptly to any communications.</p>
  `;
  return {
    subject: `Welcome to Dr. Hari Prakash's Research Team`,
    html: baseTemplate(content),
  };
}
