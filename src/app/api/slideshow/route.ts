import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import getDb from "@/lib/db";

const MEDIA_DIR = path.join(process.cwd(), "public", "media");
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

// GET /api/slideshow — public endpoint, returns photo paths for the slideshow
export async function GET() {
  const db = getDb();

  // Check if admin has configured specific slideshow photos via settings
  const setting = db
    .prepare("SELECT value FROM settings WHERE key = 'slideshow_photos'")
    .get() as { value: string } | undefined;

  if (setting?.value) {
    try {
      const photos = JSON.parse(setting.value) as string[];
      if (Array.isArray(photos) && photos.length > 0) {
        return NextResponse.json(photos);
      }
    } catch {
      // Fall through to directory scan
    }
  }

  // Fallback: scan public/media/ for image files
  if (!fs.existsSync(MEDIA_DIR)) {
    return NextResponse.json([]);
  }

  const photos = fs
    .readdirSync(MEDIA_DIR)
    .filter((name) => {
      const ext = path.extname(name).toLowerCase();
      return IMAGE_EXTENSIONS.includes(ext) && name !== ".gitkeep";
    })
    .sort()
    .map((name) => `/media/${name}`);

  return NextResponse.json(photos);
}
