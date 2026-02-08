import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import getDb from "@/lib/db";

const MEDIA_DIR = path.join(process.cwd(), "public", "media");
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

// Curated slideshow order - tells a romantic love story journey
const CURATED_ORDER = [
  // Start with romantic Venice - elegant, timeless love
  "/media/venice-gondola-romantic-moment.webp",
  "/media/venice-basilica-couple-kiss.webp",
  "/media/venice-dock-couple-portrait.webp",
  "/media/venice-gondola-narrow-canal.webp",
  "/media/venice-gondola-rialto-bridge.webp",

  // City lights and celebration - Singapore nights
  "/media/singapore-marina-bay-sands-professional.webp",
  "/media/istanbul-bridge-night.webp",
  "/media/singapore-skyline-upside-down.webp",

  // Tropical paradise and adventure - Bali
  "/media/bali-temple-jumping-reflection.webp",
  "/media/bali-heart-swing-frame.webp",
  "/media/waterfall-tropical-jungle.webp",

  // Beach adventures - water and sun
  "/media/kayaking-couple-selfie.webp",
  "/media/beach-cliffs-upside-down.webp",
  "/media/jet-ski-couple-ocean.webp",
  "/media/jet-ski-waving-solo.webp",

  // Underwater exploration - diving deep together
  "/media/scuba-diving-couple-underwater-heart.webp",

  // Ancient wonders - Egypt
  "/media/egypt-pyramids-camels-couple.webp",
  "/media/desert-sand-dunes-upside-down.webp",

  // Winter romance - snow and mountains
  "/media/snow-mountains-sunset-cuddle.webp",
  "/media/skiing-couple-mountain-slopes.webp",
  "/media/ski-resort-ipsa-sign-couple.webp",
  "/media/snow-mountains-golden-hour.webp",

  // Fun adventures together
  "/media/boxing-ring-couple.webp",
  "/media/bar-upside-down-selfie.webp",

  // Grand finale - elegant and artistic
  "/media/palace-grand-staircase-upside-down.webp",
  "/media/palace-ornate-ceiling-upside-down.webp",
  "/media/purple-tunnel-solo.webp",
];

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

  // Use curated order - only include photos that actually exist
  if (!fs.existsSync(MEDIA_DIR)) {
    return NextResponse.json([]);
  }

  const existingFiles = new Set(fs.readdirSync(MEDIA_DIR));
  const curatedPhotos = CURATED_ORDER.filter((photoPath) => {
    const filename = path.basename(photoPath);
    return existingFiles.has(filename);
  });

  // If we have curated photos, use them; otherwise fall back to alphabetical scan
  if (curatedPhotos.length > 0) {
    return NextResponse.json(curatedPhotos);
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

  return NextResponse.json(photos);
}
