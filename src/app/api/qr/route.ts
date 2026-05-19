import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

// GET /api/qr?url=<url>&size=<px> — generate a QR code image for any URL
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  const size = Math.min(Math.max(Number(req.nextUrl.searchParams.get("size")) || 256, 64), 512);

  const pngBuffer = await QRCode.toBuffer(url, {
    type: "png",
    width: size,
    margin: 2,
    color: { dark: "#2d2d2d", light: "#ffffff" },
  });

  return new NextResponse(new Uint8Array(pngBuffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
