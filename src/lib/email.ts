import nodemailer from "nodemailer";
import getDb from "./db";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Converts HTML email to plain text fallback.
 * Emails with both HTML and text parts score better with spam filters.
 */
function htmlToPlainText(html: string): string {
  return html
    // Replace <br> and block-level tags with newlines
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<\/(td|th)>/gi, "\t")
    // Extract link text with URL
    .replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    // Remove remaining HTML tags
    .replace(/<[^>]+>/g, "")
    // Decode common HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&nbsp;/g, " ")
    // Clean up whitespace
    .replace(/[ \t]+/g, " ")
    .replace(/\n /g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
    const fromAddress = process.env.EMAIL_FROM || "wedding@yourdomain.com";
    const senderName = process.env.EMAIL_SENDER_NAME || "Chris & Candice";
    const replyTo = process.env.EMAIL_REPLY_TO;

    await transporter.sendMail({
      from: `"${senderName}" <${fromAddress}>`,
      ...(replyTo && { replyTo }),
      ...options,
      // Auto-generate plain text from HTML for better spam scores
      text: options.text || htmlToPlainText(options.html),
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return false;
  }
}

/**
 * Escapes HTML special characters to prevent XSS
 * Returns empty string for null/undefined values
 */
function escapeHtml(unsafe: string | null | undefined): string {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderTemplate(
  templateHtml: string,
  variables: Record<string, string>
): string {
  let rendered = templateHtml;
  for (const [key, value] of Object.entries(variables)) {
    // Escape HTML in variables unless they are explicitly marked as safe HTML sections
    const escapedValue = key.endsWith("_section") || key.endsWith("_html")
      ? value
      : escapeHtml(value);
    rendered = rendered.replace(new RegExp(`{{${key}}}`, "g"), escapedValue);
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
  if (!guest || !guest.email || !guest.name || !guest.token) return false;

  const template = db
    .prepare("SELECT * FROM email_templates WHERE slug = ?")
    .get(templateSlug) as Record<string, string> | undefined;
  if (!template || !template.body_html || !template.subject) return false;

  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const variables: Record<string, string> = {
    guest_name: guest.name,
    rsvp_link: `${baseUrl}/rsvp/${guest.token}`,
    upload_link: `${baseUrl}/upload`,
    home_link: baseUrl,
    invite_code: guest.token,
    ...extraVars,
  };

  // Inject photo challenges if guest has any assigned
  const challenges = db
    .prepare(
      "SELECT pc.text FROM guest_challenges gc JOIN photo_challenges pc ON pc.id = gc.challenge_id WHERE gc.guest_id = ?"
    )
    .all(guestId) as { text: string }[];

  if (challenges.length > 0) {
    variables.photo_challenges = challenges
      .map((c) => `<li style="margin-bottom: 6px;">📸 ${escapeHtml(c.text)}</li>`)
      .join("");
    variables.photo_challenges_section = `
      <div style="margin: 24px 0; padding: 20px; background: #f8f8f8; border-radius: 8px;">
        <p style="font-weight: bold; margin-bottom: 12px;">Your Photo Challenges</p>
        <ul style="list-style: none; padding: 0; margin: 0;">${variables.photo_challenges}</ul>
        <p style="font-size: 13px; color: #888; margin-top: 12px;">
          Snap these at the wedding! Upload your photos at <a href="${escapeHtml(baseUrl)}/upload">${escapeHtml(baseUrl)}/upload</a> or scan the QR code at the venue.
        </p>
      </div>`;
  } else {
    variables.photo_challenges = "";
    variables.photo_challenges_section = "";
  }

  const html = renderTemplate(template.body_html, variables);
  const subject = renderTemplate(template.subject, variables);

  const success = await sendEmail({ to: guest.email, subject, html });

  db.prepare(
    "INSERT INTO email_log (guest_id, template_slug, status) VALUES (?, ?, ?)"
  ).run(guestId, templateSlug, success ? "sent" : "failed");

  return success;
}
