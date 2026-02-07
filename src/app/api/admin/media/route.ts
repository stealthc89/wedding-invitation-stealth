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

  const files = fs.readdirSync(MEDIA_DIR).map((name) => ({
    name,
    path: `/media/${name}`,
    size: fs.statSync(path.join(MEDIA_DIR, name)).size,
  }));

  return NextResponse.json(files);
}
