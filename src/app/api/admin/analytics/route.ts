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
    db.prepare("SELECT COUNT(*) as c FROM guests").get() as { c: number }
  ).c;

  const totalResponded = (
    db.prepare("SELECT COUNT(*) as c FROM guests WHERE rsvp_status = 'responded'").get() as {
      c: number;
    }
  ).c;

  const outstanding = totalInvited - totalResponded;

  const totalAttending = (
    db.prepare("SELECT COUNT(*) as c FROM guests WHERE attending = 1").get() as { c: number }
  ).c;

  const totalDeclined = (
    db.prepare("SELECT COUNT(*) as c FROM guests WHERE attending = 0 AND rsvp_status = 'responded'").get() as {
      c: number;
    }
  ).c;

  const totalPlusOnes = (
    db.prepare("SELECT COUNT(*) as c FROM guests WHERE plus_one_attending = 1").get() as {
      c: number;
    }
  ).c;

  const mealBreakdown = db
    .prepare(
      "SELECT meal_preference, COUNT(*) as count FROM guests WHERE attending = 1 AND meal_preference IS NOT NULL GROUP BY meal_preference"
    )
    .all() as { meal_preference: string; count: number }[];

  return NextResponse.json({
    totalInvited,
    totalResponded,
    outstanding,
    totalAttending,
    totalDeclined,
    totalPlusOnes,
    totalHeadcount: totalAttending + totalPlusOnes,
    mealBreakdown,
  });
}
