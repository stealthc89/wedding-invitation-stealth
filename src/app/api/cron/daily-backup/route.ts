import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { Storage } from "@google-cloud/storage";

const storage = new Storage();
const BACKUP_BUCKET = process.env.BACKUP_BUCKET || `${process.env.PROJECT_ID || "wedding"}-wedding-backups`;
const DB_PATH = path.join(process.cwd(), "data", "wedding.db");

// GET /api/cron/daily-backup — automated daily database backup
export async function GET(req: NextRequest) {
  // Verify request is from Cloud Scheduler (check for specific header or secret)
  const authHeader = req.headers.get("x-cloudscheduler");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName = `wedding-db-${timestamp}.db`;

    // Read database file
    const dbBuffer = await fs.readFile(DB_PATH);

    // Upload to GCS
    const bucket = storage.bucket(BACKUP_BUCKET);
    const file = bucket.file(backupName);
    await file.save(dbBuffer, {
      metadata: {
        contentType: "application/x-sqlite3",
        metadata: {
          timestamp: new Date().toISOString(),
          type: "automated",
        },
      },
    });

    // Clean up old backups (keep only last 7 days)
    const [files] = await bucket.getFiles({ prefix: "wedding-db-" });
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const filesToDelete = files.filter((f) => {
      const created = new Date(f.metadata.timeCreated || 0);
      // Keep manual backups and pre-restore backups indefinitely
      const isManual = f.metadata.metadata?.type !== "automated";
      return !isManual && created < sevenDaysAgo;
    });

    // Delete old automated backups
    await Promise.all(filesToDelete.map((f) => f.delete()));

    console.log(`[Cron] Created backup: ${backupName}, deleted ${filesToDelete.length} old backups`);

    return NextResponse.json({
      success: true,
      backup: backupName,
      size: dbBuffer.length,
      deletedOldBackups: filesToDelete.length,
    });
  } catch (error) {
    console.error("[Cron] Daily backup failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backup failed" },
      { status: 500 }
    );
  }
}
