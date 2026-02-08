import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { sendTemplateEmail } from "@/lib/email";

// GET /api/rsvp?token=xxx — fetch guest info by token
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const db = getDb();
  const guest = db
    .prepare(
      "SELECT id, name, plus_one_allowed, rsvp_status, attending, plus_one_attending, meal_preference, dietary_notes, responded_at FROM guests WHERE token = ?"
    )
    .get(token);

  if (!guest) {
    return NextResponse.json({ error: "Invalid invitation link" }, { status: 404 });
  }

  // Include RSVP deadline if set
  const deadlineSetting = db.prepare("SELECT value FROM settings WHERE key = 'rsvp_deadline'").get() as { value: string } | undefined;

  // Include assigned photo challenges
  const guestRecord = guest as Record<string, unknown>;
  const challenges = db
    .prepare(
      "SELECT pc.text FROM guest_challenges gc JOIN photo_challenges pc ON pc.id = gc.challenge_id WHERE gc.guest_id = ?"
    )
    .all(guestRecord.id) as { text: string }[];

  return NextResponse.json({
    ...guestRecord,
    rsvp_deadline: deadlineSetting?.value || null,
    challenges: challenges.map((c) => c.text),
  });
}

// POST /api/rsvp — submit RSVP
export async function POST(req: NextRequest) {
  try {
    const { token, attending, plus_one_attending, meal_preference, dietary_notes } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }
    if (typeof attending !== "boolean") {
      return NextResponse.json({ error: "Attendance response required" }, { status: 400 });
    }

    const db = getDb();
    const guest = db.prepare("SELECT * FROM guests WHERE token = ?").get(token) as
      | Record<string, unknown>
      | undefined;

    if (!guest) {
      return NextResponse.json({ error: "Invalid invitation link" }, { status: 404 });
    }

    if (guest.rsvp_status === "responded") {
      return NextResponse.json(
        { error: "RSVP already submitted. Contact the bride or groom to make changes." },
        { status: 409 }
      );
    }

    // Check RSVP deadline
    const deadlineSetting = db.prepare("SELECT value FROM settings WHERE key = 'rsvp_deadline'").get() as { value: string } | undefined;
    if (deadlineSetting?.value) {
      const deadline = new Date(deadlineSetting.value + "T23:59:59");
      if (!isNaN(deadline.getTime()) && new Date() > deadline) {
        return NextResponse.json(
          { error: "The RSVP deadline has passed. Please contact the bride or groom directly." },
          { status: 410 }
        );
      }
    }

    const validMeals = ["vegetarian", "vegan", "pescatarian", "no_preference"];
    const meal = attending && meal_preference && validMeals.includes(meal_preference)
      ? meal_preference
      : attending
        ? "no_preference"
        : null;

    const plusOne = attending && guest.plus_one_allowed && plus_one_attending ? 1 : 0;
    const notes = attending && dietary_notes ? String(dietary_notes).slice(0, 500) : null;

    db.prepare(
      `UPDATE guests SET
        rsvp_status = 'responded',
        attending = ?,
        plus_one_attending = ?,
        meal_preference = ?,
        dietary_notes = ?,
        responded_at = datetime('now'),
        updated_at = datetime('now')
      WHERE token = ?`
    ).run(attending ? 1 : 0, plusOne, meal, notes, token);

    // Assign random photo challenges if attending
    let assignedChallenges: string[] = [];
    if (attending) {
      const allChallenges = db
        .prepare("SELECT id, text FROM photo_challenges")
        .all() as { id: number; text: string }[];

      if (allChallenges.length > 0) {
        // Shuffle and pick 2-3
        const count = Math.min(allChallenges.length, allChallenges.length <= 3 ? allChallenges.length : Math.random() < 0.5 ? 2 : 3);
        const shuffled = allChallenges.sort(() => Math.random() - 0.5).slice(0, count);

        const insertChallenge = db.prepare(
          "INSERT OR IGNORE INTO guest_challenges (guest_id, challenge_id) VALUES (?, ?)"
        );
        for (const c of shuffled) {
          insertChallenge.run(guest.id, c.id);
        }
        assignedChallenges = shuffled.map((c) => c.text);
      }
    }

    // Send confirmation email (fire-and-forget, don't block response)
    if (attending) {
      sendTemplateEmail(guest.id as number, "confirmation").catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: "RSVP submitted successfully",
      challenges: assignedChallenges,
    });
  } catch (error) {
    console.error("RSVP error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
