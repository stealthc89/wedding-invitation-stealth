import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import getDb from "@/lib/db";
import { CURATED_PHOTOS } from "@/lib/slideshow-photos";

const MEDIA_DIR = path.join(process.cwd(), "public", "media");
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

// CDN URL for media files (production) or local path (development)
const MEDIA_CDN_URL = process.env.MEDIA_CDN_URL || "";
const USE_CDN = !!MEDIA_CDN_URL;

// Cache headers - photo list rarely changes
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
};

// Convert local path to CDN URL if CDN is enabled
function toCdnUrl(localPath: string): string {
  if (!USE_CDN) return localPath;
  // Extract filename from /media/filename.jpg
  const filename = localPath.replace("/media/", "");
  return `${MEDIA_CDN_URL}/${filename}`;
}

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
        const cdnPhotos = photos.map(toCdnUrl);
        return NextResponse.json(cdnPhotos, { headers: CACHE_HEADERS });
      }
    } catch {
      // Fall through to directory scan
    }
  }

  // In production with CDN, skip filesystem checks and use curated order directly
  if (USE_CDN) {
    const cdnPhotos = CURATED_PHOTOS.map(toCdnUrl);
    return NextResponse.json(cdnPhotos, { headers: CACHE_HEADERS });
  }

  // Development mode: check filesystem
  if (!fs.existsSync(MEDIA_DIR)) {
    return NextResponse.json([]);
  }

  const existingFiles = new Set(fs.readdirSync(MEDIA_DIR));
  const curatedPhotos = CURATED_PHOTOS.filter((photoPath) => {
    const filename = path.basename(photoPath);
    return existingFiles.has(filename);
  });

  // If we have curated photos, use them; otherwise fall back to alphabetical scan
  if (curatedPhotos.length > 0) {
    return NextResponse.json(curatedPhotos, { headers: CACHE_HEADERS });
  }

  // Ultimate fallback: alphabetical scan
  const photos = fs
    .readdirSync(MEDIA_DIR)
    .filter((name) => {
      const ext = path.extname(name).toLowerCase();
      return IMAGE_EXTENSIONS.includes(ext) && name !== ".gitkeep";
    })
    .sort()
    .map((name) => `/media/${name}`);

  return NextResponse.json(photos, { headers: CACHE_HEADERS });
}
