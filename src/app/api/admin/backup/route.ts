import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { DB_PATH } from "@/lib/db";
import fs from "fs";

// GET /api/admin/backup — download database backup
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dbBuffer = fs.readFileSync(DB_PATH);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return new NextResponse(dbBuffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename=wedding-backup-${timestamp}.db`,
      },
    });
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json({ error: "Failed to create backup" }, { status: 500 });
  }
}
