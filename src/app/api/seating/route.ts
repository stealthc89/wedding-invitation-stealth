import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 2) return NextResponse.json([]);

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT s.guest_name, s.table_number, s.table_name,
              m.x_pct, m.y_pct
       FROM seating s
       LEFT JOIN seating_table_map m ON m.table_number = s.table_number
       WHERE s.guest_name LIKE ? COLLATE NOCASE
       ORDER BY s.guest_name ASC
       LIMIT 10`
    )
    .all(`%${q}%`) as {
    guest_name: string;
    table_number: string;
    table_name: string;
    x_pct: number | null;
    y_pct: number | null;
  }[];

  return NextResponse.json(rows);
}
