import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import getDb from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  const totalInvited = (
    db.prepare("SELECT COUNT(*) as c FROM guests").get() as { c: number } | undefined
  )?.c ?? 0;

  const totalResponded = (
    db.prepare("SELECT COUNT(*) as c FROM guests WHERE rsvp_status = 'responded'").get() as {
      c: number;
    } | undefined
  )?.c ?? 0;

  const outstanding = totalInvited - totalResponded;

  const totalAttending = (
    db.prepare("SELECT COUNT(*) as c FROM guests WHERE attending = 1").get() as { c: number } | undefined
  )?.c ?? 0;

  const totalDeclined = (
    db.prepare("SELECT COUNT(*) as c FROM guests WHERE attending = 0 AND rsvp_status = 'responded'").get() as {
      c: number;
    } | undefined
  )?.c ?? 0;

  const totalPlusOnes = (
    db.prepare("SELECT COALESCE(SUM(plus_one_attending), 0) as c FROM guests WHERE attending = 1").get() as {
      c: number;
    } | undefined
  )?.c ?? 0;

  const mealBreakdown = db
    .prepare(
      "SELECT meal_preference, COUNT(*) as count FROM guests WHERE attending = 1 AND meal_preference IS NOT NULL GROUP BY meal_preference"
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

  return NextResponse.json({
    totalInvited,
    totalResponded,
    outstanding,
    totalAttending,
    totalDeclined,
    totalPlusOnes,
    totalHeadcount: totalAttending + totalPlusOnes,
    mealBreakdown,
    totalPhotos,
    photosByGuest,
    photosOverTime,
  });
}
