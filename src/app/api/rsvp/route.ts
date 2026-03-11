import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { sendTemplateEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { v4 as uuidv4 } from "uuid";

// GET /api/rsvp?token=xxx — fetch guest info by token
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  // Rate limit: 200 requests per 15 minutes per invitation token
  const rateLimit = checkRateLimit(`token:${token}`, { maxRequests: 200, windowMs: 15 * 60 * 1000 });

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
  try {
    const { token, email, attending, plus_one_attending, plus_one_names, plus_one_meal_preference, plus_one_dietary_notes, meal_preference, dietary_notes } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    // Rate limit: 10 submissions per hour per invitation token
    const rateLimit = checkRateLimit(`token:${token}`, { maxRequests: 10, windowMs: 60 * 60 * 1000 });

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

    // Create guest records for each companion (plus-one)
    if (attending && finalPlusOneCount > 0 && finalPlusOneNames) {
      try {
        const companionNames = JSON.parse(finalPlusOneNames) as string[];
        const companionMeals = finalPlusOneMealPreference ? JSON.parse(finalPlusOneMealPreference) as string[] : [];
        const companionDietary = finalPlusOneDietaryNotes ? JSON.parse(finalPlusOneDietaryNotes) as string[] : [];

        const insertCompanion = db.prepare(
          `INSERT INTO guests (token, name, email, is_plus_one, linked_to_guest_id, rsvp_status, attending, meal_preference, dietary_notes, is_grooms_guest)
           VALUES (?, ?, ?, 1, ?, 'responded', 1, ?, ?, ?)`
        );

        for (let i = 0; i < companionNames.length && i < finalPlusOneCount; i++) {
          const companionName = companionNames[i]?.trim();
          if (companionName) {
            insertCompanion.run(
              uuidv4(),
              companionName,
              null, // Companions don't have their own email
              guest.id,
              companionMeals[i] || "no_preference",
              companionDietary[i] || null,
              guest.is_grooms_guest ?? 0
            );
          }
        }
      } catch (error) {
        console.error("Failed to create companion guest records:", error);
        // Don't fail the RSVP if companion creation fails
      }
    }

    // Assign balanced photo challenges if attending
    let assignedChallenges: string[] = [];
    if (attending) {
      // Get one challenge from each category to ensure variety across different parts of the day
      const categories = ["CHURCH_CEREMONY", "ARRIVAL_SOCIAL", "FOOD_SPEECHES", "DANCE_FLOOR", "LATE_NIGHT"];
      const selected: { id: number; text: string }[] = [];

      for (const category of categories) {
        // Get the least-assigned challenge from this category
        const challenge = db
          .prepare(`
            SELECT
              pc.id,
              pc.text,
              COUNT(gc.id) as assignment_count
            FROM photo_challenges pc
            LEFT JOIN guest_challenges gc ON pc.id = gc.challenge_id
            WHERE pc.category = ?
            GROUP BY pc.id, pc.text
            ORDER BY assignment_count ASC, RANDOM()
            LIMIT 1
          `)
          .get(category) as { id: number; text: string; assignment_count: number } | undefined;

        if (challenge) {
          selected.push({ id: challenge.id, text: challenge.text });
        }
      }

      if (selected.length > 0) {
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
