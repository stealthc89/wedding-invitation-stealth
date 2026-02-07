import nodemailer from "nodemailer";
import getDb from "./db";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

function getTransporter() {
  // Supports any SMTP provider: Resend, SES, Gmail, Mailgun, etc.
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.resend.com",
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: process.env.SMTP_SECURE !== "false",
    auth: {
      user: process.env.SMTP_USER || "resend",
      pass: process.env.SMTP_PASS || "",
    },
  });
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!process.env.SMTP_PASS) {
    console.log("[Email] SMTP not configured. Would send to:", options.to);
    console.log("[Email] Subject:", options.subject);
    return true; // Don't fail if email not configured
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "wedding@yourdomain.com",
      ...options,
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return false;
  }
}

export function renderTemplate(
  templateHtml: string,
  variables: Record<string, string>
): string {
  let rendered = templateHtml;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return rendered;
}

export async function sendTemplateEmail(
  guestId: number,
  templateSlug: string,
  extraVars: Record<string, string> = {}
): Promise<boolean> {
  const db = getDb();

  const guest = db
    .prepare("SELECT * FROM guests WHERE id = ?")
    .get(guestId) as Record<string, string> | undefined;
  if (!guest || !guest.email) return false;

  const template = db
    .prepare("SELECT * FROM email_templates WHERE slug = ?")
    .get(templateSlug) as Record<string, string> | undefined;
  if (!template) return false;

  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const variables: Record<string, string> = {
    guest_name: guest.name,
    rsvp_link: `${baseUrl}/rsvp/${guest.token}`,
    ...extraVars,
  };

  const html = renderTemplate(template.body_html, variables);
  const subject = renderTemplate(template.subject, variables);

  const success = await sendEmail({ to: guest.email, subject, html });

  db.prepare(
    "INSERT INTO email_log (guest_id, template_slug, status) VALUES (?, ?, ?)"
  ).run(guestId, templateSlug, success ? "sent" : "failed");

  return success;
}
