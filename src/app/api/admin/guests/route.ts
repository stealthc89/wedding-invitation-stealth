import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import getDb from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import * as XLSX from "xlsx";
import { logAdminAction } from "@/lib/audit-log";

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
        plus_one_allowed: g.plus_one_allowed || 0,
        rsvp_status: g.rsvp_status,
        attending: g.attending === 1 ? "yes" : g.attending === 0 ? "no" : "",
        plus_one_attending: g.plus_one_attending || 0,
        plus_one_names: g.plus_one_names || "",
        meal_preference: g.meal_preference || "",
        dietary_notes: g.dietary_notes || "",
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

  // CSV or Excel upload
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    let records: Record<string, string>[];
    const fileName = file.name?.toLowerCase() || "";

    try {
      if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        // Excel file — parse with xlsx
        const buffer = Buffer.from(await file.arrayBuffer());
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        records = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
      } else {
        // CSV file
        const text = await file.text();
        records = parse(text, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      }
    } catch {
      return NextResponse.json({ error: "Invalid file format. Upload a CSV or Excel (.xlsx) file." }, { status: 400 });
    }

    // Simple email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const insert = db.prepare(
      "INSERT INTO guests (token, name, email, plus_one_allowed) VALUES (?, ?, ?, ?)"
    );
    const insertMany = db.transaction((rows: Record<string, string>[]) => {
      let count = 0;
      let skipped = 0;
      for (const row of rows) {
        const name = row.name || row.Name;
        const email = (row.email || row.Email || "").trim();
        const plusOneRaw = row.plus_one_allowed || row["Plus One"] || row.plus_one || "0";
        if (!name) continue;

        // Validate email: allow empty, but validate if provided
        if (email && !emailRegex.test(email)) {
          console.warn(`[CSV Import] Skipping row with invalid email: ${email} (guest: ${name})`);
          skipped++;
          continue;
        }

        // Parse both legacy boolean strings ("yes"/"true") and numeric values (0-10)
        const plusOneLower = String(plusOneRaw).toLowerCase().trim();
        let plusOneCount = 0;
        if (["yes", "true", "1"].includes(plusOneLower)) {
          plusOneCount = 1; // Legacy boolean format
        } else {
          plusOneCount = Math.max(0, Math.min(parseInt(plusOneRaw) || 0, 10));
        }

        try {
          insert.run(
            uuidv4(),
            name.trim(),
            email,
            plusOneCount
          );
          count++;
        } catch (error) {
          // Skip rows that violate constraints (e.g., duplicate emails)
          console.warn(`[CSV Import] Skipped row due to constraint violation: ${name} (${email})`);
          skipped++;
        }
      }
      return { count, skipped };
    });

    const result = insertMany(records);
    return NextResponse.json({
      success: true,
      imported: result.count,
      ...(result.skipped > 0 && { skipped: result.skipped, message: `${result.skipped} row(s) skipped due to invalid email addresses` })
    });
  }

  // Single guest add
  const { name, email, plus_one_allowed, is_under_10 } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Validate email if provided
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmedEmail = (email || "").trim();
  if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const token = uuidv4();

  try {
    db.prepare(
      "INSERT INTO guests (token, name, email, plus_one_allowed, is_under_10) VALUES (?, ?, ?, ?, ?)"
    ).run(token, name, trimmedEmail, plus_one_allowed || 0, is_under_10 ? 1 : 0);

    const guest = db.prepare("SELECT * FROM guests WHERE token = ?").get(token);
    return NextResponse.json(guest, { status: 201 });
  } catch (error) {
    // Handle SQLite constraint violations
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json(
        { error: "A guest with this email already exists" },
        { status: 409 }
      );
    }
    throw error;
  }
}

// PUT /api/admin/guests — update guest
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, name, email, plus_one_allowed, is_under_10, rsvp_status, attending, plus_one_attending, meal_preference, dietary_notes } =
    await req.json();
  if (!id) {
    return NextResponse.json({ error: "Guest ID required" }, { status: 400 });
  }

  // Validate email if provided
  if (email !== undefined && email !== null && email !== "") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
  }

  const db = getDb();

  // Validate plus_one_allowed range (0-10)
  const validatedPlusOne = plus_one_allowed !== undefined
    ? Math.max(0, Math.min(plus_one_allowed, 10))
    : null;

  db.prepare(
    `UPDATE guests SET
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      plus_one_allowed = COALESCE(?, plus_one_allowed),
      is_under_10 = COALESCE(?, is_under_10),
      rsvp_status = COALESCE(?, rsvp_status),
      attending = COALESCE(?, attending),
      plus_one_attending = COALESCE(?, plus_one_attending),
      meal_preference = COALESCE(?, meal_preference),
      dietary_notes = COALESCE(?, dietary_notes),
      updated_at = datetime('now')
    WHERE id = ?`
  ).run(name, email, validatedPlusOne, is_under_10 !== undefined ? (is_under_10 ? 1 : 0) : null, rsvp_status, attending !== undefined ? (attending ? 1 : 0) : null, plus_one_attending !== undefined ? plus_one_attending : null, meal_preference, dietary_notes, id);

  const guest = db.prepare("SELECT * FROM guests WHERE id = ?").get(id);
  return NextResponse.json(guest);
}

// DELETE /api/admin/guests — remove guest
export async function DELETE(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Guest ID required" }, { status: 400 });
  }

  const db = getDb();

  // Get guest info before deleting for audit log
  const guest = db.prepare("SELECT name, email FROM guests WHERE id = ?").get(id) as { name: string; email: string } | undefined;

  try {
    db.prepare("DELETE FROM guests WHERE id = ?").run(id);

    logAdminAction({
      action: "delete_guest",
      email: session.email,
      resource: "guest",
      resourceId: id,
      details: { guestName: guest?.name, guestEmail: guest?.email },
      success: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logAdminAction({
      action: "delete_guest",
      email: session.email,
      resource: "guest",
      resourceId: id,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
