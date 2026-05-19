import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import * as XLSX from "xlsx";

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare("SELECT guest_name, table_number, table_name FROM seating ORDER BY table_number, guest_name")
    .all();
  const count = (db.prepare("SELECT COUNT(*) as n FROM seating").get() as { n: number }).n;
  const floorPlan = (db.prepare("SELECT value FROM settings WHERE key = 'seating_floor_plan'").get() as { value: string } | undefined)?.value ?? null;
  const tables = db.prepare("SELECT DISTINCT table_number, table_name FROM seating ORDER BY table_number").all() as { table_number: string; table_name: string }[];
  return NextResponse.json({ count, rows, floorPlan, tables });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

  const db = getDb();
  const insert = db.prepare(
    "INSERT INTO seating (guest_name, table_number, table_name) VALUES (?, ?, ?)"
  );

  // Find column names dynamically (case-insensitive)
  const findCol = (row: Record<string, unknown>, ...candidates: string[]) => {
    const keys = Object.keys(row);
    for (const c of candidates) {
      const match = keys.find((k) => k.toLowerCase().includes(c.toLowerCase()));
      if (match) return match;
    }
    return null;
  };

  let imported = 0;
  const clearFirst = formData.get("replace") === "true";

  db.transaction(() => {
    if (clearFirst) db.prepare("DELETE FROM seating").run();

    for (const row of rows) {
      const nameCol = findCol(row, "Guest Name", "name");
      const tableNumCol = findCol(row, "Table Number", "table number", "table_number");
      const tableNameCol = findCol(row, "Table Name", "table name", "table_name");

      const name = nameCol ? String(row[nameCol] ?? "").trim() : "";
      const tableNum = tableNumCol ? String(row[tableNumCol] ?? "").trim() : "";
      const tableName = tableNameCol ? String(row[tableNameCol] ?? "").trim() : "";

      if (name && tableNum) {
        insert.run(name, tableNum, tableName);
        imported++;
      }
    }
  })();

  return NextResponse.json({ imported });
}

export async function DELETE() {
  const db = getDb();
  db.prepare("DELETE FROM seating").run();
  return NextResponse.json({ ok: true });
}
