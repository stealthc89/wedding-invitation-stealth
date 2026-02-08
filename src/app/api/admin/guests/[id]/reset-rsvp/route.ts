import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import getDb from "@/lib/db";
import { logAdminAction } from "@/lib/audit-log";

// POST /api/admin/guests/[id]/reset-rsvp — reset guest RSVP to allow re-submission
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid guest ID" }, { status: 400 });
  }

  const db = getDb();

  // Get guest info before resetting for audit log
  const guest = db.prepare("SELECT name, email FROM guests WHERE id = ?").get(id) as
    | { name: string; email: string }
    | undefined;

  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  try {
    // Reset RSVP fields to allow guest to resubmit
    db.prepare(
      `UPDATE guests SET
        rsvp_status = 'pending',
        attending = NULL,
        plus_one_attending = 0,
        plus_one_names = NULL,
        plus_one_meal_preference = NULL,
        plus_one_dietary_notes = NULL,
        meal_preference = NULL,
        dietary_notes = NULL,
        responded_at = NULL,
        updated_at = datetime('now')
      WHERE id = ?`
    ).run(id);

    // Delete companion guest records (plus-ones) created during RSVP
    db.prepare("DELETE FROM guests WHERE is_plus_one = 1 AND linked_to_guest_id = ?").run(id);

    // Clear any photo challenges assigned to this guest
    db.prepare("DELETE FROM guest_challenges WHERE guest_id = ?").run(id);

    logAdminAction({
      action: "reset_rsvp",
      email: session.email,
      resource: "guest",
      resourceId: id,
      details: { guestName: guest.name, guestEmail: guest.email },
      success: true,
    });

    const updatedGuest = db.prepare("SELECT * FROM guests WHERE id = ?").get(id);
    return NextResponse.json({ success: true, guest: updatedGuest });
  } catch (error) {
    logAdminAction({
      action: "reset_rsvp",
      email: session.email,
      resource: "guest",
      resourceId: id,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to reset RSVP" },
      { status: 500 }
    );
  }
}
