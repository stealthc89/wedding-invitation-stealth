import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import getDb, { PHOTOS_DIR } from "@/lib/db";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
];

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
    const skipped: string[] = [];

    for (const file of files) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        skipped.push(`${file.name} (file too large)`);
        console.warn(`[Upload] Skipped oversized file: ${file.name} (${file.size} bytes)`);
        continue;
      }

      // Validate file extension
      const ext = path.extname(file.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        skipped.push(`${file.name} (unsupported format)`);
        continue;
      }

      // Validate MIME type for additional security
      if (file.type && !ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
        skipped.push(`${file.name} (invalid content type)`);
        console.warn(`[Upload] Skipped file with invalid MIME type: ${file.name} (${file.type})`);
        continue;
      }

      // Generate unique filename with collision protection
      let filename: string;
      let filePath: string;
      let attempts = 0;
      do {
        const timestamp = Date.now();
        const uuid = uuidv4().slice(0, 8);
        filename = `${safeName}_${timestamp}_${uuid}${ext}`;
        filePath = path.join(PHOTOS_DIR, filename);
        attempts++;
      } while (fs.existsSync(filePath) && attempts < 5);

      if (attempts >= 5) {
        skipped.push(`${file.name} (filename collision)`);
        console.error(`[Upload] Failed to generate unique filename after 5 attempts: ${file.name}`);
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      db.prepare(
        "INSERT INTO photo_uploads (guest_name, filename, file_size, matched_guest_id) VALUES (?, ?, ?, ?)"
      ).run(guestName, filename, file.size, matchedGuest?.id || null);

      uploaded.push(filename);
    }

    if (uploaded.length === 0) {
      return NextResponse.json(
        {
          error: "No valid photos uploaded. Check file types (JPG, PNG, WebP, HEIC) and size (max 10 MB).",
          ...(skipped.length > 0 && { skipped }),
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      uploaded: uploaded.length,
      message: `${uploaded.length} photo${uploaded.length > 1 ? "s" : ""} uploaded successfully!`,
      ...(skipped.length > 0 && { skipped, warning: `${skipped.length} file(s) skipped` }),
    });
  } catch (error) {
    console.error("[Upload] Upload error:", error);
    // Don't expose internal error details to client
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
