import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import getDb from "@/lib/db";

const MEDIA_DIR = path.join(process.cwd(), "public", "media");
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

// Curated slideshow order - tells a story from romantic to adventurous
const CURATED_ORDER = [
  // Venice - romantic gondola rides
  "/media/venice-gondola-ride.jpeg",
  "/media/venice-gondola-canal.jpeg",
  "/media/venice-basilica-kiss.jpeg",
  "/media/venice-dock-sunset.jpeg",
  "/media/venice-gondola-rialto.jpeg",

  // Singapore - city lights and adventures
  "/media/singapore-marina-bay-sands.jpeg",
  "/media/singapore-skyline-night.jpeg",
  "/media/singapore-skyline-luge.jpeg",

  // Bali - tropical paradise
  "/media/bali-temple-gates.jpeg",
  "/media/bali-heart-swing.jpeg",
  "/media/bali-waterfall.jpeg",

  // Thailand - beach adventures
  "/media/thailand-beach-cave.jpeg",
  "/media/thailand-kayak-group.jpeg",

  // Egypt - ancient wonders
  "/media/egypt-pyramids-camels.jpeg",
  "/media/egypt-desert-mountains.jpeg",

  // Winter adventures
  "/media/snow-cuddle-sunset.jpeg",
  "/media/skiing-mountains.jpeg",
  "/media/ski-resort-ipsa-sign.jpeg",
  "/media/snow-cuddle-evening.jpeg",

  // Water sports action
  "/media/jet-ski-action.jpeg",
  "/media/jet-ski-standing.jpeg",

  // Fun activities
  "/media/go-karts-track.jpeg",
  "/media/cote-purple-tunnel.jpeg",
  "/media/new-orleans-bourbon-street.jpeg",
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
