import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const side = req.nextUrl.searchParams.get("side"); // "groom" | "bride" | null
  const sideClause = side === "groom" ? " AND is_grooms_guest = 1" : side === "bride" ? " AND (is_grooms_guest = 0 OR is_grooms_guest IS NULL)" : "";

  // Only count primary guests (not companions) for invitation metrics
  const totalInvited = (
    db.prepare(`SELECT COUNT(*) as c FROM guests WHERE (is_plus_one = 0 OR is_plus_one IS NULL)${sideClause}`).get() as { c: number } | undefined
  )?.c ?? 0;

  const totalResponded = (
    db.prepare(`SELECT COUNT(*) as c FROM guests WHERE rsvp_status = 'responded' AND (is_plus_one = 0 OR is_plus_one IS NULL)${sideClause}`).get() as {
      c: number;
    } | undefined
  )?.c ?? 0;

  const outstanding = totalInvited - totalResponded;

  const totalAttending = (
    db.prepare(`SELECT COUNT(*) as c FROM guests WHERE attending = 1 AND (is_plus_one = 0 OR is_plus_one IS NULL)${sideClause}`).get() as { c: number } | undefined
  )?.c ?? 0;

  const totalDeclined = (
    db.prepare(`SELECT COUNT(*) as c FROM guests WHERE attending = 0 AND rsvp_status = 'responded' AND (is_plus_one = 0 OR is_plus_one IS NULL)${sideClause}`).get() as {
      c: number;
    } | undefined
  )?.c ?? 0;

  // Count companion guest records for Plus Ones
  const totalPlusOnes = (
    db.prepare(`SELECT COUNT(*) as c FROM guests WHERE is_plus_one = 1${sideClause}`).get() as {
      c: number;
    } | undefined
  )?.c ?? 0;

  const mealBreakdown = db
    .prepare(
      `SELECT meal_preference, COUNT(*) as count FROM guests WHERE attending = 1 AND meal_preference IS NOT NULL${sideClause} GROUP BY meal_preference ORDER BY count DESC`
    )
    .all() as { meal_preference: string; count: number }[];

  // Photo stats
  const totalPhotos = (
    db.prepare("SELECT COUNT(*) as c FROM photo_uploads").get() as { c: number } | undefined
  )?.c ?? 0;

  const photosByGuest = (db
    .prepare(
      "SELECT guest_name, COUNT(*) as count FROM photo_uploads GROUP BY guest_name ORDER BY count DESC LIMIT 10"
    )
    .all() as { guest_name: string; count: number }[] | undefined) ?? [];

  const photosOverTime = (db
    .prepare(
      "SELECT DATE(uploaded_at) as date, COUNT(*) as count FROM photo_uploads GROUP BY DATE(uploaded_at) ORDER BY date"
    )
    .all() as { date: string; count: number }[] | undefined) ?? [];

  // Challenge distribution by category
  const challengesByCategory = (db
    .prepare(
      `SELECT
        pc.category,
        COUNT(DISTINCT pc.id) as total_challenges,
        COUNT(gc.id) as total_assignments
      FROM photo_challenges pc
      LEFT JOIN guest_challenges gc ON pc.id = gc.challenge_id
      WHERE pc.category IS NOT NULL
      GROUP BY pc.category
      ORDER BY pc.category`
    )
    .all() as { category: string; total_challenges: number; total_assignments: number }[] | undefined) ?? [];

  // Total headcount is everyone attending (primary guests + companions)
  const totalHeadcount = (
    db.prepare(`SELECT COUNT(*) as c FROM guests WHERE attending = 1${sideClause}`).get() as { c: number } | undefined
  )?.c ?? 0;

  return NextResponse.json({
    totalInvited,
    totalResponded,
    outstanding,
    totalAttending,
    totalDeclined,
    totalPlusOnes,
    totalHeadcount,
    mealBreakdown,
    totalPhotos,
    photosByGuest,
    photosOverTime,
    challengesByCategory,
  });
}
