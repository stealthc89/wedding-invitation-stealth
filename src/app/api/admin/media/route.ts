import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import path from "path";
import fs from "fs";

const MEDIA_DIR = path.join(process.cwd(), "public", "media");

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Sanitize filename
    const ext = path.extname(file.name).toLowerCase();
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm"];
    if (!allowed.includes(ext)) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 }
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

    if (!fs.existsSync(MEDIA_DIR)) {
      fs.mkdirSync(MEDIA_DIR, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(MEDIA_DIR, safeName), buffer);

    return NextResponse.json({ success: true, filename: safeName });
  } catch (error) {
    console.error("Media upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!fs.existsSync(MEDIA_DIR)) {
    return NextResponse.json([]);
  }

  const files = fs
    .readdirSync(MEDIA_DIR)
    .filter((name) => name !== ".gitkeep")
    .map((name) => {
      const stat = fs.statSync(path.join(MEDIA_DIR, name));
      return {
        name,
        path: `/media/${name}`,
        size: stat.size,
        modified: stat.mtime.toISOString(),
      };
    });

  return NextResponse.json(files);
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { filename } = await req.json();
    if (!filename || filename.includes("..") || filename.includes("/")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const filePath = path.join(MEDIA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    fs.unlinkSync(filePath);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Media delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
