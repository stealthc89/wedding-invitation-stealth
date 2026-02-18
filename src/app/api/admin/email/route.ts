import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import getDb from "@/lib/db";
import { sendTemplateEmail } from "@/lib/email";

// POST /api/admin/email — send emails to guests
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guestIds, templateSlug, extraVars } = await req.json();

  if (!templateSlug) {
    return NextResponse.json({ error: "Template slug required" }, { status: 400 });
  }

  const db = getDb();
  let targets: number[] = guestIds || [];

  // If no specific guest IDs, send to all matching guests based on template type
  if (targets.length === 0) {
    if (templateSlug === "reminder") {
      const guests = db
        .prepare("SELECT id FROM guests WHERE rsvp_status = 'pending' AND email != ''")
        .all() as { id: number }[];
      targets = guests.map((g) => g.id);
    } else if (templateSlug === "invitation") {
      const guests = db
        .prepare(
          "SELECT g.id FROM guests g WHERE g.email != '' AND NOT EXISTS (SELECT 1 FROM email_log e WHERE e.guest_id = g.id AND e.template_slug = 'invitation')"
        )
        .all() as { id: number }[];
      targets = guests.map((g) => g.id);
    } else if (templateSlug === "itinerary") {
      const guests = db
        .prepare("SELECT id FROM guests WHERE attending = 1 AND email != ''")
        .all() as { id: number }[];
      targets = guests.map((g) => g.id);
    } else if (templateSlug === "photo_challenge_reminder") {
      // Send to attending guests who have photo challenges assigned
      const guests = db
        .prepare(`
          SELECT DISTINCT g.id
          FROM guests g
          INNER JOIN guest_challenges gc ON g.id = gc.guest_id
          WHERE g.attending = 1 AND g.email != ''
        `)
        .all() as { id: number }[];
      targets = guests.map((g) => g.id);
    }
  }

  let sent = 0;
  let failed = 0;
  const markSent = db.prepare("UPDATE guests SET invite_sent = 1 WHERE id = ? AND invite_sent = 0");
  for (const guestId of targets) {
    const success = await sendTemplateEmail(guestId, templateSlug, extraVars || {});
    if (success) {
      sent++;
      markSent.run(guestId);
    } else {
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, total: targets.length });
}

// GET /api/admin/email — get email log
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const logs = db
    .prepare(
      `SELECT e.*, g.name as guest_name, g.email as guest_email
       FROM email_log e
       LEFT JOIN guests g ON g.id = e.guest_id
       ORDER BY e.sent_at DESC
       LIMIT 200`
    )
    .all();

  return NextResponse.json(logs);
}
