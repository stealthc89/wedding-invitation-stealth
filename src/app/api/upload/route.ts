import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import getDb, { PHOTOS_DIR } from "@/lib/db";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];

function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 50);
}

// POST /api/upload — public photo upload (no auth)
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const guestName = (formData.get("name") as string)?.trim();

    if (!guestName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const files = formData.getAll("photos") as File[];
    if (files.length === 0) {
      return NextResponse.json({ error: "At least one photo is required" }, { status: 400 });
    }

    if (files.length > 20) {
      return NextResponse.json({ error: "Maximum 20 photos per upload" }, { status: 400 });
    }

    const db = getDb();

    // Try to match guest name to an existing guest (case-insensitive, best effort)
    const matchedGuest = db
      .prepare("SELECT id FROM guests WHERE LOWER(name) = LOWER(?)")
      .get(guestName) as { id: number } | undefined;

    const safeName = sanitizeName(guestName);
    const uploaded: string[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        continue; // Skip oversized files silently
      }

      const ext = path.extname(file.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        continue; // Skip unsupported formats
      }

      const timestamp = Date.now();
      const uuid = uuidv4().slice(0, 8);
      const filename = `${safeName}_${timestamp}_${uuid}${ext}`;

      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(path.join(PHOTOS_DIR, filename), buffer);

      db.prepare(
        "INSERT INTO photo_uploads (guest_name, filename, file_size, matched_guest_id) VALUES (?, ?, ?, ?)"
      ).run(guestName, filename, file.size, matchedGuest?.id || null);

      uploaded.push(filename);
    }

    if (uploaded.length === 0) {
      return NextResponse.json(
        { error: "No valid photos uploaded. Check file types (JPG, PNG, WebP, HEIC) and size (max 10 MB)." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      uploaded: uploaded.length,
      message: `${uploaded.length} photo${uploaded.length > 1 ? "s" : ""} uploaded successfully!`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
