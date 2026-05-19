import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DB_DIR || path.join(process.cwd(), "data");
const MENU_PATH = path.join(DATA_DIR, "menu.jpg");
const MENU_PDF_TMP = "/tmp/menu-upload.pdf";

export async function GET() {
  const exists = fs.existsSync(MENU_PATH);
  return NextResponse.json({
    hasMenu: exists,
    url: exists ? `/api/admin/menu/image?t=${Date.now()}` : null,
  });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    fs.writeFileSync(MENU_PDF_TMP, buffer);
    try {
      execSync(
        `magick -density 200 "${MENU_PDF_TMP}[0]" -quality 95 -background white -flatten "${MENU_PATH}"`,
        { timeout: 30000 }
      );
    } catch {
      execSync(
        `convert -density 200 "${MENU_PDF_TMP}[0]" -quality 95 -background white -flatten "${MENU_PATH}"`,
        { timeout: 30000 }
      );
    }
    fs.unlinkSync(MENU_PDF_TMP);
  } else {
    fs.writeFileSync(MENU_PATH, buffer);
  }

  return NextResponse.json({ ok: true, url: `/api/admin/menu/image?t=${Date.now()}` });
}

export async function DELETE() {
  if (fs.existsSync(MENU_PATH)) fs.unlinkSync(MENU_PATH);
  return NextResponse.json({ ok: true });
}
