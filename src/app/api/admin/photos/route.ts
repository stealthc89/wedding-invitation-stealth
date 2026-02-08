import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import getDb, { PHOTOS_DIR } from "@/lib/db";
import path from "path";
import fs from "fs";

interface PhotoRow {
  id: number;
  guest_name: string;
  filename: string;
  file_size: number;
  matched_guest_id: number | null;
  uploaded_at: string;
}

// GET /api/admin/photos — list uploaded photos with optional filtering
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const guestName = req.nextUrl.searchParams.get("guest");
  const download = req.nextUrl.searchParams.get("download");

  // Single file download
  if (download) {
    // Prevent path traversal by normalizing and validating the resolved path
    const normalizedFilename = path.normalize(download).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.resolve(PHOTOS_DIR, normalizedFilename);
    const photosDir = path.resolve(PHOTOS_DIR);

    // Ensure the resolved path is within PHOTOS_DIR
    if (!filePath.startsWith(photosDir + path.sep) && filePath !== photosDir) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${path.basename(filePath)}"`,
        },
      });
    }
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Zip download
  if (req.nextUrl.searchParams.get("zip") === "all") {
    const photos = db
      .prepare("SELECT filename FROM photo_uploads ORDER BY uploaded_at DESC")
      .all() as { filename: string }[];

    // Build a simple tar-like concatenation? No — use a proper zip.
    // Since we want to keep deps light, we'll stream individual file data
    // with a simple zip implementation using raw deflate-free zip format.
    const zipParts: Buffer[] = [];
    const centralDir: Buffer[] = [];
    let offset = 0;

    for (const photo of photos) {
      // Validate path even though filename comes from database (defense in depth)
      const normalizedFilename = path.normalize(photo.filename).replace(/^(\.\.(\/|\\|$))+/, '');
      const filePath = path.resolve(PHOTOS_DIR, normalizedFilename);
      const photosDir = path.resolve(PHOTOS_DIR);

      // Ensure the resolved path is within PHOTOS_DIR
      if (!filePath.startsWith(photosDir + path.sep) && filePath !== photosDir) continue;
      if (!fs.existsSync(filePath)) continue;

      const fileData = fs.readFileSync(filePath);
      const nameBuffer = Buffer.from(photo.filename, "utf-8");

      // Local file header
      const localHeader = Buffer.alloc(30 + nameBuffer.length);
      localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
      localHeader.writeUInt16LE(20, 4); // Version needed
      localHeader.writeUInt16LE(0, 6); // Flags
      localHeader.writeUInt16LE(0, 8); // Compression (store)
      localHeader.writeUInt16LE(0, 10); // Mod time
      localHeader.writeUInt16LE(0, 12); // Mod date
      // CRC32 — skip for store method with data descriptor
      localHeader.writeUInt32LE(crc32(fileData), 14);
      localHeader.writeUInt32LE(fileData.length, 18); // Compressed size
      localHeader.writeUInt32LE(fileData.length, 22); // Uncompressed size
      localHeader.writeUInt16LE(nameBuffer.length, 26); // Filename length
      localHeader.writeUInt16LE(0, 28); // Extra field length
      nameBuffer.copy(localHeader, 30);

      // Central directory entry
      const cdEntry = Buffer.alloc(46 + nameBuffer.length);
      cdEntry.writeUInt32LE(0x02014b50, 0); // Central dir signature
      cdEntry.writeUInt16LE(20, 4); // Version made by
      cdEntry.writeUInt16LE(20, 6); // Version needed
      cdEntry.writeUInt16LE(0, 8); // Flags
      cdEntry.writeUInt16LE(0, 10); // Compression
      cdEntry.writeUInt16LE(0, 12); // Mod time
      cdEntry.writeUInt16LE(0, 14); // Mod date
      cdEntry.writeUInt32LE(crc32(fileData), 16);
      cdEntry.writeUInt32LE(fileData.length, 20);
      cdEntry.writeUInt32LE(fileData.length, 24);
      cdEntry.writeUInt16LE(nameBuffer.length, 28);
      cdEntry.writeUInt16LE(0, 30); // Extra field length
      cdEntry.writeUInt16LE(0, 32); // Comment length
      cdEntry.writeUInt16LE(0, 34); // Disk number start
      cdEntry.writeUInt16LE(0, 36); // Internal file attributes
      cdEntry.writeUInt32LE(0, 38); // External file attributes
      cdEntry.writeUInt32LE(offset, 42); // Relative offset
      nameBuffer.copy(cdEntry, 46);

      zipParts.push(localHeader, fileData);
      centralDir.push(cdEntry);
      offset += localHeader.length + fileData.length;
    }

    // End of central directory
    const cdSize = centralDir.reduce((s, b) => s + b.length, 0);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4); // Disk number
    eocd.writeUInt16LE(0, 6); // CD disk number
    eocd.writeUInt16LE(centralDir.length, 8); // Entries on this disk
    eocd.writeUInt16LE(centralDir.length, 10); // Total entries
    eocd.writeUInt32LE(cdSize, 12); // CD size
    eocd.writeUInt32LE(offset, 16); // CD offset
    eocd.writeUInt16LE(0, 20); // Comment length

    const zipBuffer = Buffer.concat([...zipParts, ...centralDir, eocd]);

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=wedding-photos.zip",
      },
    });
  }

  // List photos
  let photos: PhotoRow[];
  if (guestName) {
    photos = db
      .prepare(
        "SELECT * FROM photo_uploads WHERE LOWER(guest_name) LIKE LOWER(?) ORDER BY uploaded_at DESC"
      )
      .all(`%${guestName}%`) as PhotoRow[];
  } else {
    photos = db
      .prepare("SELECT * FROM photo_uploads ORDER BY uploaded_at DESC")
      .all() as PhotoRow[];
  }

  // Get unique guest names for filter dropdown
  const guestNames = db
    .prepare(
      "SELECT DISTINCT guest_name, COUNT(*) as count FROM photo_uploads GROUP BY guest_name ORDER BY count DESC"
    )
    .all() as { guest_name: string; count: number }[];

  return NextResponse.json({ photos, guestNames });
}

// DELETE /api/admin/photos — delete a photo
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
  const photo = db
    .prepare("SELECT filename FROM photo_uploads WHERE id = ?")
    .get(id) as { filename: string } | undefined;

  if (photo) {
    // Validate path even though filename comes from database (defense in depth)
    const normalizedFilename = path.normalize(photo.filename).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.resolve(PHOTOS_DIR, normalizedFilename);
    const photosDir = path.resolve(PHOTOS_DIR);

    // Ensure the resolved path is within PHOTOS_DIR
    if (filePath.startsWith(photosDir + path.sep) || filePath === photosDir) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    db.prepare("DELETE FROM photo_uploads WHERE id = ?").run(id);
  }

  return NextResponse.json({ success: true });
}

// Simple CRC32 implementation for zip files
function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
