import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = process.env.DB_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "wedding.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    // Use DELETE journal mode for compatibility with GCS FUSE mounts.
    // WAL mode requires shared-memory files (.shm/.wal) that don't work
    // reliably on network filesystems. DELETE mode is safe with max_instances=1.
    db.pragma("journal_mode = DELETE");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      plus_one_allowed INTEGER DEFAULT 0,
      rsvp_status TEXT DEFAULT 'pending',
      attending INTEGER,
      plus_one_attending INTEGER DEFAULT 0,
      meal_preference TEXT,
      dietary_notes TEXT,
      responded_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER REFERENCES guests(id) ON DELETE CASCADE,
      template_slug TEXT NOT NULL,
      sent_at TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'sent'
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_guests_token ON guests(token);
    CREATE INDEX IF NOT EXISTS idx_guests_rsvp ON guests(rsvp_status);
    CREATE INDEX IF NOT EXISTS idx_email_log_guest ON email_log(guest_id);
    CREATE INDEX IF NOT EXISTS idx_email_log_template ON email_log(template_slug);

    CREATE TABLE IF NOT EXISTS photo_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS guest_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
      challenge_id INTEGER NOT NULL REFERENCES photo_challenges(id) ON DELETE CASCADE,
      UNIQUE(guest_id, challenge_id)
    );

    CREATE TABLE IF NOT EXISTS photo_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_name TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      matched_guest_id INTEGER REFERENCES guests(id) ON DELETE SET NULL,
      uploaded_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_photo_uploads_name ON photo_uploads(guest_name);
    CREATE INDEX IF NOT EXISTS idx_guest_challenges_guest ON guest_challenges(guest_id);
  `);

  // Migration: add dietary_notes column if missing (for existing databases)
  const cols = db.prepare("PRAGMA table_info(guests)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "dietary_notes")) {
    db.exec("ALTER TABLE guests ADD COLUMN dietary_notes TEXT");
  }

  // Migration: add plus_one_names column if missing (for storing JSON array of companion names)
  if (!cols.some((c) => c.name === "plus_one_names")) {
    db.exec("ALTER TABLE guests ADD COLUMN plus_one_names TEXT");
  }

  // Migration: add is_under_10 column if missing (for tracking child guests)
  if (!cols.some((c) => c.name === "is_under_10")) {
    db.exec("ALTER TABLE guests ADD COLUMN is_under_10 INTEGER DEFAULT 0");
  }

  // Seed default email templates if none exist
  const count = db.prepare("SELECT COUNT(*) as c FROM email_templates").get() as { c: number };
  if (count.c === 0) {
    const insert = db.prepare(
      "INSERT INTO email_templates (slug, name, subject, body_html) VALUES (?, ?, ?, ?)"
    );
    insert.run(
      "invitation",
      "RSVP Invitation",
      "You're Invited! Please RSVP",
      `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <h1 style="text-align: center; color: #2d2d2d;">You're Invited</h1>
  <p>Dear {{guest_name}},</p>
  <p>We would be delighted to have you celebrate our special day with us.</p>
  <p>Please let us know if you can attend by clicking the link below:</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{rsvp_link}}" style="background: #2d2d2d; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 4px;">RSVP Now</a>
  </p>
  <p style="color: #888; font-size: 14px;">If the button doesn't work, copy this link: {{rsvp_link}}</p>
</div>`
    );
    insert.run(
      "reminder",
      "RSVP Reminder",
      "Reminder: Please RSVP",
      `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <h1 style="text-align: center; color: #2d2d2d;">Gentle Reminder</h1>
  <p>Dear {{guest_name}},</p>
  <p>We haven't heard from you yet! We'd love to know if you can join us.</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{rsvp_link}}" style="background: #2d2d2d; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 4px;">RSVP Now</a>
  </p>
  <p style="color: #888; font-size: 14px;">If the button doesn't work, copy this link: {{rsvp_link}}</p>
</div>`
    );
    insert.run(
      "itinerary",
      "Event Itinerary",
      "Your Event Itinerary",
      `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <h1 style="text-align: center; color: #2d2d2d;">Event Itinerary</h1>
  <p>Dear {{guest_name}},</p>
  <p>Here are the details for our special day:</p>
  <p><strong>Date:</strong> {{event_date}}</p>
  <p><strong>Venue:</strong> {{event_venue}}</p>
  <p><strong>Schedule:</strong></p>
  {{itinerary_details}}
  <p>We look forward to celebrating with you!</p>
</div>`
    );
    insert.run(
      "confirmation",
      "RSVP Confirmation",
      "Thanks for your RSVP!",
      `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <h1 style="text-align: center; color: #2d2d2d;">RSVP Confirmed</h1>
  <p>Dear {{guest_name}},</p>
  <p>Thank you for letting us know! We&rsquo;re so excited to celebrate with you.</p>
  {{photo_challenges_section}}
  <p>See you soon!</p>
  <p style="color: #888; font-size: 14px;">If you need to make changes, please reply to this email.</p>
</div>`
    );
  }

  // Migration: seed confirmation template if missing (for existing databases)
  const hasConfirmation = db.prepare("SELECT 1 FROM email_templates WHERE slug = 'confirmation'").get();
  if (!hasConfirmation) {
    db.prepare(
      "INSERT INTO email_templates (slug, name, subject, body_html) VALUES (?, ?, ?, ?)"
    ).run(
      "confirmation",
      "RSVP Confirmation",
      "Thanks for your RSVP!",
      `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <h1 style="text-align: center; color: #2d2d2d;">RSVP Confirmed</h1>
  <p>Dear {{guest_name}},</p>
  <p>Thank you for letting us know! We&rsquo;re so excited to celebrate with you.</p>
  {{photo_challenges_section}}
  <p>See you soon!</p>
  <p style="color: #888; font-size: 14px;">If you need to make changes, please reply to this email.</p>
</div>`
    );
  }
}

const PHOTOS_DIR = path.join(DB_DIR, "photos");
if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

export default getDb;
export { DB_PATH, PHOTOS_DIR };
