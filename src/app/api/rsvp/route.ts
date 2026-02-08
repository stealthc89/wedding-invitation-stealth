import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { sendTemplateEmail } from "@/lib/email";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

// GET /api/rsvp?token=xxx — fetch guest info by token
export async function GET(req: NextRequest) {
  // Rate limit: 30 requests per 15 minutes per IP to prevent token enumeration
  const clientId = getClientIdentifier(req.headers);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 30, windowMs: 15 * 60 * 1000 });

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          "X-RateLimit-Limit": rateLimit.limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": rateLimit.resetAt.toString(),
        }
      }
    );
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const db = getDb();
  const guest = db
    .prepare(
      "SELECT id, name, email, plus_one_allowed, plus_one_names, plus_one_meal_preference, plus_one_dietary_notes, rsvp_status, attending, plus_one_attending, meal_preference, dietary_notes, responded_at FROM guests WHERE token = ?"
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
  // Rate limit: 5 requests per hour per IP to prevent spam
  const clientId = getClientIdentifier(req.headers);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 5, windowMs: 60 * 60 * 1000 });

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many RSVP submissions. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          "X-RateLimit-Limit": rateLimit.limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": rateLimit.resetAt.toString(),
        }
      }
    );
  }

  try {
    const { token, email, attending, plus_one_attending, plus_one_names, plus_one_meal_preference, plus_one_dietary_notes, meal_preference, dietary_notes } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }
    if (typeof attending !== "boolean") {
      return NextResponse.json({ error: "Attendance response required" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email address required" }, { status: 400 });
    }

    // Validate plus one count
    const plusOneCount = typeof plus_one_attending === "number" ? Math.max(0, Math.min(plus_one_attending, 10)) : 0;

    const db = getDb();
    const guest = db.prepare("SELECT * FROM guests WHERE token = ?").get(token) as
      | Record<string, unknown>
      | undefined;

    if (!guest) {
      return NextResponse.json({ error: "Invalid invitation link" }, { status: 404 });
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

    // Cap plus-one count to not exceed the guest's allowed limit
    const finalPlusOneCount = attending && guest.plus_one_allowed
      ? Math.min(plusOneCount, Number(guest.plus_one_allowed))
      : 0;
    const finalPlusOneNames = attending && finalPlusOneCount > 0 && plus_one_names ? plus_one_names : null;
    const finalPlusOneMealPreference = attending && finalPlusOneCount > 0 && plus_one_meal_preference ? plus_one_meal_preference : null;
    const finalPlusOneDietaryNotes = attending && finalPlusOneCount > 0 && plus_one_dietary_notes ? plus_one_dietary_notes : null;
    const notes = attending && dietary_notes ? String(dietary_notes).slice(0, 500) : null;

    // Prevent race condition by checking rsvp_status in the WHERE clause
    const result = db.prepare(
      `UPDATE guests SET
        rsvp_status = 'responded',
        email = ?,
        attending = ?,
        plus_one_attending = ?,
        plus_one_names = ?,
        plus_one_meal_preference = ?,
        plus_one_dietary_notes = ?,
        meal_preference = ?,
        dietary_notes = ?,
        responded_at = datetime('now'),
        updated_at = datetime('now')
      WHERE token = ? AND rsvp_status != 'responded'`
    ).run(email, attending ? 1 : 0, finalPlusOneCount, finalPlusOneNames, finalPlusOneMealPreference, finalPlusOneDietaryNotes, meal, notes, token);

    // Check if update was successful (no rows updated means already responded)
    if (result.changes === 0) {
      return NextResponse.json(
        { error: "RSVP already submitted. Contact the bride or groom to make changes." },
        { status: 409 }
      );
    }

    // Assign balanced photo challenges if attending
    let assignedChallenges: string[] = [];
    if (attending) {
      // Get all challenges with their assignment counts for balanced distribution
      const allChallenges = db
        .prepare(`
          SELECT
            pc.id,
            pc.text,
            COUNT(gc.id) as assignment_count
          FROM photo_challenges pc
          LEFT JOIN guest_challenges gc ON pc.id = gc.challenge_id
          GROUP BY pc.id, pc.text
          ORDER BY assignment_count ASC, RANDOM()
        `)
        .all() as { id: number; text: string; assignment_count: number }[];

      if (allChallenges.length > 0) {
        // Pick 2-3 challenges (favor least-assigned for symmetrical distribution)
        const count = Math.min(
          allChallenges.length,
          allChallenges.length <= 3 ? allChallenges.length : Math.random() < 0.5 ? 2 : 3
        );
        const selected = allChallenges.slice(0, count);

        const insertChallenge = db.prepare(
          "INSERT OR IGNORE INTO guest_challenges (guest_id, challenge_id) VALUES (?, ?)"
        );
        for (const c of selected) {
          insertChallenge.run(guest.id, c.id);
        }
        assignedChallenges = selected.map((c) => c.text);
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
