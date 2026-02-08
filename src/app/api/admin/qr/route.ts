import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import QRCode from "qrcode";

// GET /api/admin/qr — generate QR code for the upload page
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const uploadUrl = `${baseUrl}/upload`;
  const format = req.nextUrl.searchParams.get("format") || "svg";

  if (format === "png") {
    const pngBuffer = await QRCode.toBuffer(uploadUrl, {
      type: "png",
      width: 1024,
      margin: 2,
      color: { dark: "#2d2d2d", light: "#ffffff" },
    });
    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": "attachment; filename=wedding-photo-upload-qr.png",
      },
    });
  }

  // Default: SVG
  const svg = await QRCode.toString(uploadUrl, {
    type: "svg",
    width: 512,
    margin: 2,
    color: { dark: "#2d2d2d", light: "#ffffff" },
  });

  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml" },
  });
}
