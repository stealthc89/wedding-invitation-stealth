import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import getDb from "@/lib/db";

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

  const upsert = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?"
  );

  for (const [key, value] of Object.entries(updates)) {
    upsert.run(key, String(value), String(value));
  }

  return NextResponse.json({ success: true });
}
