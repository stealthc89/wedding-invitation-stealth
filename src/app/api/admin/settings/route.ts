import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import getDb from "@/lib/db";

// Whitelist of allowed setting keys
const ALLOWED_SETTINGS = [
  "rsvp_deadline",      // RSVP deadline date (YYYY-MM-DD)
  "slideshow_photos",   // Comma-separated list of photo IDs for slideshow
] as const;

// GET /api/admin/settings — list all settings
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const settings = db.prepare("SELECT * FROM settings").all() as { key: string; value: string }[];
  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }
  return NextResponse.json(map);
}

// PUT /api/admin/settings — update settings
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updates = await req.json();
  const db = getDb();

  // Validate all keys before updating
  const invalidKeys = Object.keys(updates).filter(key => !ALLOWED_SETTINGS.includes(key as typeof ALLOWED_SETTINGS[number]));
  if (invalidKeys.length > 0) {
    return NextResponse.json(
      { error: `Invalid setting key(s): ${invalidKeys.join(", ")}. Allowed: ${ALLOWED_SETTINGS.join(", ")}` },
      { status: 400 }
    );
  }

  const upsert = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?"
  );

  for (const [key, value] of Object.entries(updates)) {
    upsert.run(key, String(value), String(value));
  }

  return NextResponse.json({ success: true });
}
