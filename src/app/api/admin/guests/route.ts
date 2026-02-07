import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import getDb from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

// GET /api/admin/guests — list all guests
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const format = req.nextUrl.searchParams.get("format");

  const guests = db.prepare("SELECT * FROM guests ORDER BY created_at DESC").all();

  if (format === "csv") {
    const csv = stringify(
      (guests as Record<string, unknown>[]).map((g) => ({
        name: g.name,
        email: g.email,
        plus_one_allowed: g.plus_one_allowed ? "yes" : "no",
        rsvp_status: g.rsvp_status,
        attending: g.attending === 1 ? "yes" : g.attending === 0 ? "no" : "",
        plus_one_attending: g.plus_one_attending ? "yes" : "no",
        meal_preference: g.meal_preference || "",
        responded_at: g.responded_at || "",
      })),
      { header: true }
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=guests.csv",
      },
    });
  }

  return NextResponse.json(guests);
}

// POST /api/admin/guests — add single guest or bulk CSV upload
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";
  const db = getDb();

  // CSV upload
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    let records: Record<string, string>[];

    try {
      records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch {
      return NextResponse.json({ error: "Invalid CSV format" }, { status: 400 });
    }

    const insert = db.prepare(
      "INSERT INTO guests (token, name, email, plus_one_allowed) VALUES (?, ?, ?, ?)"
    );
    const insertMany = db.transaction((rows: Record<string, string>[]) => {
      let count = 0;
      for (const row of rows) {
        const name = row.name || row.Name;
        const email = row.email || row.Email || "";
        const plusOne = row.plus_one_allowed || row["Plus One"] || row.plus_one || "false";
        if (!name) continue;

        insert.run(
          uuidv4(),
          name.trim(),
          email.trim(),
          ["true", "yes", "1"].includes(plusOne.toLowerCase()) ? 1 : 0
        );
        count++;
      }
      return count;
    });

    const count = insertMany(records);
    return NextResponse.json({ success: true, imported: count });
  }

  // Single guest add
  const { name, email, plus_one_allowed } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const token = uuidv4();
  db.prepare(
    "INSERT INTO guests (token, name, email, plus_one_allowed) VALUES (?, ?, ?, ?)"
  ).run(token, name, email || "", plus_one_allowed ? 1 : 0);

  const guest = db.prepare("SELECT * FROM guests WHERE token = ?").get(token);
  return NextResponse.json(guest, { status: 201 });
}

// PUT /api/admin/guests — update guest
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, name, email, plus_one_allowed, rsvp_status, attending, plus_one_attending, meal_preference } =
    await req.json();
  if (!id) {
    return NextResponse.json({ error: "Guest ID required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare(
    `UPDATE guests SET
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      plus_one_allowed = COALESCE(?, plus_one_allowed),
      rsvp_status = COALESCE(?, rsvp_status),
      attending = COALESCE(?, attending),
      plus_one_attending = COALESCE(?, plus_one_attending),
      meal_preference = COALESCE(?, meal_preference),
      updated_at = datetime('now')
    WHERE id = ?`
  ).run(name, email, plus_one_allowed !== undefined ? (plus_one_allowed ? 1 : 0) : null, rsvp_status, attending !== undefined ? (attending ? 1 : 0) : null, plus_one_attending !== undefined ? (plus_one_attending ? 1 : 0) : null, meal_preference, id);

  const guest = db.prepare("SELECT * FROM guests WHERE id = ?").get(id);
  return NextResponse.json(guest);
}

// DELETE /api/admin/guests — remove guest
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Guest ID required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("DELETE FROM guests WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
