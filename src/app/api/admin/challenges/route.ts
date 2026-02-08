import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import getDb from "@/lib/db";

// GET /api/admin/challenges — list all challenges
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const challenges = db
    .prepare("SELECT * FROM photo_challenges ORDER BY created_at DESC")
    .all();

  return NextResponse.json(challenges);
}

// POST /api/admin/challenges — create a challenge
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text } = await req.json();
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Challenge text required" }, { status: 400 });
  }

  const trimmedText = text.trim();
  if (trimmedText.length > 200) {
    return NextResponse.json(
      { error: "Challenge text must be 200 characters or less" },
      { status: 400 }
    );
  }

  const db = getDb();
  const result = db
    .prepare("INSERT INTO photo_challenges (text) VALUES (?)")
    .run(trimmedText);

  const challenge = db
    .prepare("SELECT * FROM photo_challenges WHERE id = ?")
    .get(result.lastInsertRowid);

  return NextResponse.json(challenge, { status: 201 });
}

// PUT /api/admin/challenges — update a challenge
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, text } = await req.json();
  if (!id || !text?.trim()) {
    return NextResponse.json({ error: "ID and text required" }, { status: 400 });
  }

  const trimmedText = text.trim();
  if (trimmedText.length > 200) {
    return NextResponse.json(
      { error: "Challenge text must be 200 characters or less" },
      { status: 400 }
    );
  }

  const db = getDb();
  db.prepare("UPDATE photo_challenges SET text = ? WHERE id = ?").run(trimmedText, id);

  const challenge = db
    .prepare("SELECT * FROM photo_challenges WHERE id = ?")
    .get(id);

  return NextResponse.json(challenge);
}

// DELETE /api/admin/challenges — delete a challenge
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("DELETE FROM photo_challenges WHERE id = ?").run(id);

  return NextResponse.json({ success: true });
}
