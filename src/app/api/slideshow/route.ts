import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import getDb from "@/lib/db";

const MEDIA_DIR = path.join(process.cwd(), "public", "media");
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

// Curated slideshow order - tells a romantic love story journey
const CURATED_ORDER = [
  // Start with romantic Venice - elegant, timeless love
  "/media/venice-gondola-romantic-moment.jpeg",
  "/media/venice-basilica-couple-kiss.jpeg",
  "/media/venice-dock-couple-portrait.jpeg",
  "/media/venice-gondola-narrow-canal.jpeg",
  "/media/venice-gondola-rialto-bridge.jpeg",

  // City lights and celebration - Singapore nights
  "/media/singapore-marina-bay-sands-professional.jpeg",
  "/media/istanbul-bridge-night.jpeg",
  "/media/singapore-skyline-upside-down.jpeg",

  // Tropical paradise and adventure - Bali
  "/media/bali-temple-jumping-reflection.jpeg",
  "/media/bali-heart-swing-frame.jpeg",
  "/media/waterfall-tropical-jungle.jpeg",

  // Beach adventures - water and sun
  "/media/kayaking-couple-selfie.jpeg",
  "/media/beach-cliffs-upside-down.jpeg",
  "/media/jet-ski-couple-ocean.jpeg",
  "/media/jet-ski-waving-solo.jpeg",

  // Underwater exploration - diving deep together
  "/media/scuba-diving-couple-underwater-heart.jpeg",

  // Ancient wonders - Egypt
  "/media/egypt-pyramids-camels-couple.jpeg",
  "/media/desert-sand-dunes-upside-down.jpeg",

  // Winter romance - snow and mountains
  "/media/snow-mountains-sunset-cuddle.jpeg",
  "/media/skiing-couple-mountain-slopes.jpeg",
  "/media/ski-resort-ipsa-sign-couple.jpeg",
  "/media/snow-mountains-golden-hour.jpeg",

  // Fun adventures together
  "/media/boxing-ring-couple.jpeg",
  "/media/bar-upside-down-selfie.jpeg",

  // Grand finale - elegant and artistic
  "/media/palace-grand-staircase-upside-down.jpeg",
  "/media/palace-ornate-ceiling-upside-down.jpeg",
  "/media/purple-tunnel-solo.jpeg",
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
