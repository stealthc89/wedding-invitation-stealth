import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DB_DIR || path.join(process.cwd(), "data");
const MENU_PATH = path.join(DATA_DIR, "menu.jpg");

export async function GET() {
  if (!fs.existsSync(MENU_PATH)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const buffer = fs.readFileSync(MENU_PATH);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
