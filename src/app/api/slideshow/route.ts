import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import getDb from "@/lib/db";
import { CURATED_PHOTOS } from "@/lib/slideshow-photos";

const MEDIA_DIR = path.join(process.cwd(), "public", "media");
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

// Cache headers - photo list rarely changes
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
};

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
        return NextResponse.json(photos, { headers: CACHE_HEADERS });
      }
    } catch {
      // Fall through to curated list
    }
  }

  // Check filesystem
  if (!fs.existsSync(MEDIA_DIR)) {
    return NextResponse.json([]);
  }

  const existingFiles = new Set(fs.readdirSync(MEDIA_DIR));

  // Start with curated photos that still exist on disk (preserves story order)
  const curatedPhotos = CURATED_PHOTOS.filter((photoPath) =>
    existingFiles.has(path.basename(photoPath))
  );

  // Append any files in the media dir not already in the curated list
  const curatedSet = new Set(CURATED_PHOTOS.map((p) => path.basename(p)));
  const extraPhotos = [...existingFiles]
    .filter((name) => {
      const ext = path.extname(name).toLowerCase();
      return IMAGE_EXTENSIONS.includes(ext) && name !== ".gitkeep" && !curatedSet.has(name);
    })
    .sort()
    .map((name) => `/media/${name}`);

  return NextResponse.json([...curatedPhotos, ...extraPhotos], { headers: CACHE_HEADERS });
}
