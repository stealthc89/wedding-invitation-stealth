import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT table_number, table_name, x_pct, y_pct FROM seating_table_map").all();
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const { table_number, table_name, x_pct, y_pct } = await request.json();
  if (!table_number || x_pct == null || y_pct == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const db = getDb();
  db.prepare(
    `INSERT INTO seating_table_map (table_number, table_name, x_pct, y_pct)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(table_number) DO UPDATE SET table_name=excluded.table_name, x_pct=excluded.x_pct, y_pct=excluded.y_pct`
  ).run(table_number, table_name ?? "", x_pct, y_pct);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const table = request.nextUrl.searchParams.get("table");
  if (!table) return NextResponse.json({ error: "table required" }, { status: 400 });
  const db = getDb();
  db.prepare("DELETE FROM seating_table_map WHERE table_number = ?").run(table);
  return NextResponse.json({ ok: true });
}
