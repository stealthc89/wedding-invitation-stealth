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
  `);

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
  }
}

export default getDb;
export { DB_PATH };
