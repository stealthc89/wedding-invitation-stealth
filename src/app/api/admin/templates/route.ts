import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import getDb from "@/lib/db";

// GET /api/admin/templates — list all email templates
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const templates = db.prepare("SELECT * FROM email_templates ORDER BY id").all();
  return NextResponse.json(templates);
}

// PUT /api/admin/templates — update a template
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, subject, body_html } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Template ID required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare(
    "UPDATE email_templates SET subject = COALESCE(?, subject), body_html = COALESCE(?, body_html), updated_at = datetime('now') WHERE id = ?"
  ).run(subject, body_html, id);

  const template = db.prepare("SELECT * FROM email_templates WHERE id = ?").get(id);
  return NextResponse.json(template);
}
