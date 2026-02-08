import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";
import { Storage } from "@google-cloud/storage";

const storage = new Storage();
const BACKUP_BUCKET = process.env.BACKUP_BUCKET || `${process.env.PROJECT_ID || "wedding"}-wedding-backups`;
const DB_PATH = path.join(process.cwd(), "data", "wedding.db");

// POST /api/admin/db-backup — create database backup
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
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
          type: "manual",
        },
      },
    });

    return NextResponse.json({
      success: true,
      backup: backupName,
      size: dbBuffer.length,
    });
  } catch (error) {
    console.error("[DB Backup] Failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backup failed" },
      { status: 500 }
    );
  }
}

// GET /api/admin/db-backup — list available backups
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const bucket = storage.bucket(BACKUP_BUCKET);
    const [files] = await bucket.getFiles({ prefix: "wedding-db-" });

    const backups = files
      .map((file) => ({
        name: file.name,
        size: parseInt(file.metadata.size || "0"),
        created: file.metadata.timeCreated,
        type: file.metadata.metadata?.type || "manual",
      }))
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    return NextResponse.json({ backups });
  } catch (error) {
    console.error("[DB Backup] List failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list backups" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/db-backup — restore from backup
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { backupName } = await req.json();

    if (!backupName) {
      return NextResponse.json({ error: "Backup name required" }, { status: 400 });
    }

    // Download backup from GCS
    const bucket = storage.bucket(BACKUP_BUCKET);
    const file = bucket.file(backupName);
    const [buffer] = await file.download();

    // Create a backup of current database before restoring
    const currentBackup = `wedding-db-pre-restore-${new Date().toISOString().replace(/[:.]/g, "-")}.db`;
    const currentDbBuffer = await fs.readFile(DB_PATH);
    await bucket.file(currentBackup).save(currentDbBuffer, {
      metadata: {
        contentType: "application/x-sqlite3",
        metadata: {
          timestamp: new Date().toISOString(),
          type: "pre-restore",
        },
      },
    });

    // Restore the backup
    await fs.writeFile(DB_PATH, buffer);

    return NextResponse.json({
      success: true,
      restored: backupName,
      preRestoreBackup: currentBackup,
    });
  } catch (error) {
    console.error("[DB Backup] Restore failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Restore failed" },
      { status: 500 }
    );
  }
}
