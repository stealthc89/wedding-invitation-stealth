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

  // Migration: add phone column if missing (for guest contact information)
  if (!cols.some((c) => c.name === "phone")) {
    db.exec("ALTER TABLE guests ADD COLUMN phone TEXT");
  }

  // Migration: add plus_one_meal_preference column if missing (for storing meal preferences of plus-ones as JSON array)
  if (!cols.some((c) => c.name === "plus_one_meal_preference")) {
    db.exec("ALTER TABLE guests ADD COLUMN plus_one_meal_preference TEXT");
  }

  // Migration: add plus_one_dietary_notes column if missing (for storing dietary notes of plus-ones as JSON array)
  if (!cols.some((c) => c.name === "plus_one_dietary_notes")) {
    db.exec("ALTER TABLE guests ADD COLUMN plus_one_dietary_notes TEXT");
  }

  // Migration: add is_plus_one column if missing (for tracking companion guests vs primary invitees)
  if (!cols.some((c) => c.name === "is_plus_one")) {
    db.exec("ALTER TABLE guests ADD COLUMN is_plus_one INTEGER DEFAULT 0");
  }

  // Migration: add linked_to_guest_id column if missing (for tracking which primary guest a plus-one is associated with)
  if (!cols.some((c) => c.name === "linked_to_guest_id")) {
    db.exec("ALTER TABLE guests ADD COLUMN linked_to_guest_id INTEGER REFERENCES guests(id) ON DELETE SET NULL");
  }

  // Migration: add UNIQUE index on name column (case-insensitive) if missing
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='guests'").all() as { name: string }[];
  if (!indexes.some((i) => i.name === "idx_guests_name_unique")) {
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_name_unique ON guests(LOWER(name))");
  }

  // Migration: add invite_sent column if missing (for tracking whether invitation was sent via email or manually)
  if (!cols.some((c) => c.name === "invite_sent")) {
    db.exec("ALTER TABLE guests ADD COLUMN invite_sent INTEGER DEFAULT 0");
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
      "You're Invited to Our Wedding! 💒",
      `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <h1 style="text-align: center; color: #2d2d2d; margin-bottom: 10px;">You're Invited</h1>
  <p style="text-align: center; font-size: 24px; color: #666; margin: 0 0 30px 0;">Chris & Candice</p>

  <p>Dear {{guest_name}},</p>
  <p>We would be delighted to have you celebrate our special day with us!</p>

  <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #2d2d2d;">Wedding Day Details</h3>
    <p style="margin: 8px 0;"><strong>Date:</strong> Saturday, 23rd May 2026</p>

    <p style="margin: 16px 0 8px 0;"><strong>Ceremony</strong></p>
    <p style="margin: 4px 0; font-size: 14px;">Wood Green New Testament Church of God</p>
    <p style="margin: 4px 0; font-size: 14px;">Arcadian Gardens, High Road, Wood Green</p>
    <p style="margin: 4px 0; font-size: 14px;">London, N22 5AA</p>
    <p style="margin: 4px 0;"><em>Arrive: 12:30 PM | Ceremony: 1:00 PM</em></p>

    <p style="margin: 16px 0 8px 0;"><strong>Reception</strong></p>
    <p style="margin: 4px 0; font-size: 14px;">Loughton Grand Marquee</p>
    <p style="margin: 4px 0; font-size: 14px;">Langston Road, Loughton, IG10 3TG</p>
    <p style="margin: 4px 0;"><em>Canapés & Drinks: 3:30 PM onwards</em></p>
  </div>

  <p>Please RSVP by clicking the link below:</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{rsvp_link}}" style="background: #2d2d2d; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 4px; display: inline-block;">RSVP Now</a>
  </p>

  <p style="color: #888; font-size: 14px; text-align: center;">We can't wait to celebrate with you!</p>
</div>`
    );
    insert.run(
      "reminder",
      "RSVP Reminder",
      "Gentle Reminder: Please RSVP for Our Wedding 💒",
      `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <h1 style="text-align: center; color: #2d2d2d;">Gentle Reminder</h1>
  <p>Dear {{guest_name}},</p>
  <p>We haven't heard from you yet! We'd love to know if you can join us on our special day.</p>

  <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 4px 0; text-align: center;"><strong>Saturday, 23rd May 2026</strong></p>
    <p style="margin: 4px 0; text-align: center;">Ceremony: 1:00 PM | Reception: 3:30 PM</p>
  </div>

  <p style="text-align: center; margin: 30px 0;">
    <a href="{{rsvp_link}}" style="background: #2d2d2d; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 4px; display: inline-block;">RSVP Now</a>
  </p>
  <p style="color: #888; font-size: 14px; text-align: center;">We can't wait to celebrate with you!</p>
</div>`
    );
    insert.run(
      "itinerary",
      "Event Itinerary",
      "Wedding Day Itinerary - Chris & Candice 💒",
      `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <h1 style="text-align: center; color: #2d2d2d;">Wedding Day Itinerary</h1>
  <p style="text-align: center; font-size: 18px; color: #666; margin: 10px 0 30px 0;">Saturday, 23rd May 2026</p>

  <p>Dear {{guest_name}},</p>
  <p>We're so excited to celebrate with you! Here's the full schedule for our special day:</p>

  <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #2d2d2d; border-bottom: 2px solid #ddd; padding-bottom: 10px;">Ceremony</h3>
    <p style="margin: 12px 0;"><strong>12:30 PM</strong> - Guest Arrival</p>
    <p style="margin: 4px 0 8px 20px; font-size: 14px; color: #555;">Wood Green New Testament Church of God<br/>Arcadian Gardens, High Road, Wood Green<br/>London, N22 5AA</p>
    <p style="margin: 4px 0 8px 20px; font-size: 13px; color: #777;"><em>Parking around the church is free on Saturdays (please check signs)</em></p>

    <p style="margin: 12px 0;"><strong>1:00 PM</strong> - Ceremony Begins</p>
    <p style="margin: 12px 0;"><strong>2:30 PM</strong> - Ceremony Ends</p>

    <h3 style="margin: 30px 0 0 0; color: #2d2d2d; border-bottom: 2px solid #ddd; padding-bottom: 10px;">Reception</h3>
    <p style="margin: 12px 0;"><strong>3:30 PM</strong> - Canapés & Drinks</p>
    <p style="margin: 4px 0 8px 20px; font-size: 14px; color: #555;">Loughton Grand Marquee<br/>Langston Road, Loughton, IG10 3TG</p>
    <p style="margin: 4px 0 8px 20px; font-size: 13px; color: #777;"><em>Plenty of parking available at the venue</em></p>

    <p style="margin: 12px 0;"><strong>5:00 PM</strong> - Bride & Groom Arrival</p>
    <p style="margin: 12px 0;"><strong>6:00 PM</strong> - Dinner Served</p>
    <p style="margin: 12px 0;"><strong>7:30 PM</strong> - Cake Cutting</p>
    <p style="margin: 12px 0;"><strong>8:00 PM</strong> - Speeches</p>
    <p style="margin: 12px 0;"><strong>9:00 PM</strong> - Dance Floor Opens! 🎉</p>
    <p style="margin: 12px 0;"><strong>1:00 AM</strong> - Evening Ends</p>
  </div>

  <p style="text-align: center; margin: 30px 0;">
    <a href="{{rsvp_link}}" style="background: #2d2d2d; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 4px; display: inline-block;">View Your RSVP</a>
  </p>

  <p style="margin: 20px 0; padding: 15px; background: #fef9f0; border-radius: 8px; font-size: 13px; color: #666; font-style: italic; text-align: center;">Your presence is the greatest gift of all. However, should you wish to bless us with a gift, an Amazon voucher or cash would be gratefully received.</p>

  <p>We can't wait to celebrate with you!</p>
  <p style="color: #888; font-size: 14px;">If you have any questions, please don't hesitate to contact us.</p>
</div>`
    );
    insert.run(
      "confirmation",
      "RSVP Confirmation",
      "Thanks for your RSVP! See you soon! 💒",
      `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <h1 style="text-align: center; color: #2d2d2d;">RSVP Confirmed! ✓</h1>
  <p>Dear {{guest_name}},</p>
  <p>Thank you for letting us know! We&rsquo;re so excited to celebrate with you.</p>

  <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #2d2d2d;">Save the Date</h3>
    <p style="margin: 8px 0;"><strong>Saturday, 23rd May 2026</strong></p>
    <p style="margin: 16px 0 4px 0;"><strong>Ceremony</strong> - 1:00 PM</p>
    <p style="margin: 4px 0; font-size: 14px;">Wood Green New Testament Church of God<br/>Arcadian Gardens, High Road, Wood Green, N22 5AA</p>
    <p style="margin: 16px 0 4px 0;"><strong>Reception</strong> - 3:30 PM onwards</p>
    <p style="margin: 4px 0; font-size: 14px;">Loughton Grand Marquee<br/>Langston Road, Loughton, IG10 3TG</p>
  </div>

  {{photo_challenges_section}}

  <p style="text-align: center; margin: 30px 0;">
    <a href="{{rsvp_link}}" style="background: #2d2d2d; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 4px; display: inline-block;">View Your RSVP</a>
  </p>

  <p style="margin: 20px 0; padding: 15px; background: #fef9f0; border-radius: 8px; font-size: 13px; color: #666; font-style: italic; text-align: center;">Your presence is the greatest gift of all. However, should you wish to bless us with a gift, an Amazon voucher or cash would be gratefully received.</p>

  <p>See you on the big day!</p>
  <p style="color: #888; font-size: 14px;">If you need to make changes, please reply to this email or contact us directly.</p>
</div>`
    );
  }

  // Migration: seed/update confirmation template (for existing databases)
  const hasConfirmation = db.prepare("SELECT 1 FROM email_templates WHERE slug = 'confirmation'").get();
  if (!hasConfirmation) {
    db.prepare(
      "INSERT INTO email_templates (slug, name, subject, body_html) VALUES (?, ?, ?, ?)"
    ).run(
      "confirmation",
      "RSVP Confirmation",
      "Thanks for your RSVP! See you soon! 💒",
      `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <h1 style="text-align: center; color: #2d2d2d;">RSVP Confirmed! ✓</h1>
  <p>Dear {{guest_name}},</p>
  <p>Thank you for letting us know! We&rsquo;re so excited to celebrate with you.</p>

  <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #2d2d2d;">Save the Date</h3>
    <p style="margin: 8px 0;"><strong>Saturday, 23rd May 2026</strong></p>
    <p style="margin: 16px 0 4px 0;"><strong>Ceremony</strong> - 1:00 PM</p>
    <p style="margin: 4px 0; font-size: 14px;">Wood Green New Testament Church of God<br/>Arcadian Gardens, High Road, Wood Green, N22 5AA</p>
    <p style="margin: 16px 0 4px 0;"><strong>Reception</strong> - 3:30 PM onwards</p>
    <p style="margin: 4px 0; font-size: 14px;">Loughton Grand Marquee<br/>Langston Road, Loughton, IG10 3TG</p>
  </div>

  {{photo_challenges_section}}

  <p style="text-align: center; margin: 30px 0;">
    <a href="{{rsvp_link}}" style="background: #2d2d2d; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 4px; display: inline-block;">View Your RSVP</a>
  </p>

  <p style="margin: 20px 0; padding: 15px; background: #fef9f0; border-radius: 8px; font-size: 13px; color: #666; font-style: italic; text-align: center;">Your presence is the greatest gift of all. However, should you wish to bless us with a gift, an Amazon voucher or cash would be gratefully received.</p>

  <p>See you on the big day!</p>
  <p style="color: #888; font-size: 14px;">If you need to make changes, please reply to this email or contact us directly.</p>
</div>`
    );
  } else {
    // Always update to latest confirmation template with full details
    db.prepare(
      "UPDATE email_templates SET subject = ?, body_html = ? WHERE slug = 'confirmation'"
    ).run(
      "Thanks for your RSVP! See you soon! 💒",
      `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <h1 style="text-align: center; color: #2d2d2d;">RSVP Confirmed! ✓</h1>
  <p>Dear {{guest_name}},</p>
  <p>Thank you for letting us know! We&rsquo;re so excited to celebrate with you.</p>

  <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #2d2d2d;">Save the Date</h3>
    <p style="margin: 8px 0;"><strong>Saturday, 23rd May 2026</strong></p>
    <p style="margin: 16px 0 4px 0;"><strong>Ceremony</strong> - 1:00 PM</p>
    <p style="margin: 4px 0; font-size: 14px;">Wood Green New Testament Church of God<br/>Arcadian Gardens, High Road, Wood Green, N22 5AA</p>
    <p style="margin: 16px 0 4px 0;"><strong>Reception</strong> - 3:30 PM onwards</p>
    <p style="margin: 4px 0; font-size: 14px;">Loughton Grand Marquee<br/>Langston Road, Loughton, IG10 3TG</p>
  </div>

  {{photo_challenges_section}}

  <p style="text-align: center; margin: 30px 0;">
    <a href="{{rsvp_link}}" style="background: #2d2d2d; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 4px; display: inline-block;">View Your RSVP</a>
  </p>

  <p style="margin: 20px 0; padding: 15px; background: #fef9f0; border-radius: 8px; font-size: 13px; color: #666; font-style: italic; text-align: center;">Your presence is the greatest gift of all. However, should you wish to bless us with a gift, an Amazon voucher or cash would be gratefully received.</p>

  <p>See you on the big day!</p>
  <p style="color: #888; font-size: 14px;">If you need to make changes, please reply to this email or contact us directly.</p>
</div>`
    );
  }

  // Migration: seed photo challenge reminder template if missing
  const hasPhotoChallengeReminder = db.prepare("SELECT 1 FROM email_templates WHERE slug = 'photo_challenge_reminder'").get();
  if (!hasPhotoChallengeReminder) {
    db.prepare(
      "INSERT INTO email_templates (slug, name, subject, body_html) VALUES (?, ?, ?, ?)"
    ).run(
      "photo_challenge_reminder",
      "Photo Challenge Reminder",
      "Don't forget your photo challenges! 📸",
      `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <h1 style="text-align: center; color: #2d2d2d;">📸 Photo Challenge Reminder</h1>
  <p>Dear {{guest_name}},</p>
  <p>We're so excited to see you at our wedding on <strong>Saturday, 23rd May 2026</strong>!</p>
  <p>Don't forget about your special photo challenges:</p>
  {{photo_challenges_section}}

  <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 4px 0; font-size: 14px;"><strong>Ceremony:</strong> 1:00 PM at Wood Green New Testament Church of God</p>
    <p style="margin: 4px 0; font-size: 14px;"><strong>Reception:</strong> 3:30 PM onwards at Loughton Grand Marquee</p>
  </div>

  <p style="margin-top: 20px;">These photos will help us create lasting memories of our special day. You can upload them at the venue using the QR codes, or via your RSVP link:</p>
  <p style="text-align: center; margin: 20px 0;">
    <a href="{{rsvp_link}}" style="background: #2d2d2d; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 4px; display: inline-block;">View Your Challenges</a>
  </p>
  <p>See you soon!</p>
</div>`
    );
  }

  // Migration: add category column to photo_challenges if missing
  const challengeCols = db.prepare("PRAGMA table_info(photo_challenges)").all() as { name: string }[];
  if (!challengeCols.some((c) => c.name === "category")) {
    db.exec("ALTER TABLE photo_challenges ADD COLUMN category TEXT");
  }

  // Seed photo challenges if none exist
  const challengeCount = db.prepare("SELECT COUNT(*) as c FROM photo_challenges").get() as { c: number };
  if (challengeCount.c === 0) {
    const challenges = [
      // CHURCH / CEREMONY (30 challenges)
      { text: "Catch the exact moment the bride first appears at the church entrance", category: "CHURCH_CEREMONY" },
      { text: "Zoom in on the wedding rings as they're being exchanged – get those sparkles!", category: "CHURCH_CEREMONY" },
      { text: "The first kiss! Capture this magical moment from wherever you're sitting", category: "CHURCH_CEREMONY" },
      { text: "Catch the groom's face the instant he first sees his bride", category: "CHURCH_CEREMONY" },
      { text: "Take a photo from your seat showing the full congregation", category: "CHURCH_CEREMONY" },
      { text: "Snap the cutest moment from the flower girl or ring bearer", category: "CHURCH_CEREMONY" },
      { text: "Capture the unity candle lighting ceremony", category: "CHURCH_CEREMONY" },
      { text: "Find someone having a happy cry – tissues and all", category: "CHURCH_CEREMONY" },
      { text: "Get a shot of the official moment they sign the marriage papers", category: "CHURCH_CEREMONY" },
      { text: "Capture the newlyweds' triumphant walk back down the aisle", category: "CHURCH_CEREMONY" },
      { text: "Frame the beautiful stained glass windows or church architecture in your shot", category: "CHURCH_CEREMONY" },
      { text: "Get an artistic angle of the wedding party at the altar", category: "CHURCH_CEREMONY" },
      { text: "Photograph the ceremony program or guest book with the church in the background", category: "CHURCH_CEREMONY" },
      { text: "Capture the emotion during the vow exchange – focus on faces", category: "CHURCH_CEREMONY" },
      { text: "Take a photo of the church exterior to set the scene", category: "CHURCH_CEREMONY" },
      { text: "Catch guests arriving – bonus points for fancy hats or stylish outfits", category: "CHURCH_CEREMONY" },
      { text: "Get an artsy shot of the bridal bouquet during a quiet ceremony moment", category: "CHURCH_CEREMONY" },
      { text: "Capture a moment of prayer or blessing with bowed heads", category: "CHURCH_CEREMONY" },
      { text: "Photograph the couple kneeling together at the altar", category: "CHURCH_CEREMONY" },
      { text: "Catch the bridesmaids or groomsmen reacting to something sweet or funny", category: "CHURCH_CEREMONY" },
      { text: "The big announcement – \"I now pronounce you...\" Get this moment!", category: "CHURCH_CEREMONY" },
      { text: "Snap the church bells, decorative details, or special ceremony touches", category: "CHURCH_CEREMONY" },
      { text: "Capture the joy as guests toss confetti, petals, or bubbles", category: "CHURCH_CEREMONY" },
      { text: "Get a romantic close-up of the couple's hands clasped together", category: "CHURCH_CEREMONY" },
      { text: "Take a wide shot showing the full ceremony atmosphere", category: "CHURCH_CEREMONY" },
      { text: "Capture the officiant speaking – bonus if they're mid-gesture", category: "CHURCH_CEREMONY" },
      { text: "Catch a stolen glance or sweet moment between the newlyweds", category: "CHURCH_CEREMONY" },
      { text: "Find a child's priceless reaction during the ceremony", category: "CHURCH_CEREMONY" },
      { text: "Frame the beautiful aisle decorations – flowers, candles, or ribbons", category: "CHURCH_CEREMONY" },
      { text: "Catch mom or dad getting emotional during the ceremony", category: "CHURCH_CEREMONY" },

      // VENUE / RECEPTION - Arrival & Social (15 challenges)
      { text: "Capture the excitement as guests first arrive at the reception", category: "ARRIVAL_SOCIAL" },
      { text: "Get a creative shot of the welcome sign or venue entrance", category: "ARRIVAL_SOCIAL" },
      { text: "Photograph the cocktail hour spread – make it look delicious!", category: "ARRIVAL_SOCIAL" },
      { text: "Catch friends seeing each other for the first time in forever", category: "ARRIVAL_SOCIAL" },
      { text: "Someone's mid-sip with a signature cocktail – cheers to that!", category: "ARRIVAL_SOCIAL" },
      { text: "Get artsy with the table centerpieces or venue decorations", category: "ARRIVAL_SOCIAL" },
      { text: "Capture the cocktail hour vibe – people chatting, laughing, connecting", category: "ARRIVAL_SOCIAL" },
      { text: "Snap the creative seating chart or place card display", category: "ARRIVAL_SOCIAL" },
      { text: "Take a fun group selfie with your table or friends", category: "ARRIVAL_SOCIAL" },
      { text: "Photograph the wedding favors – Chris & Candice's special touch", category: "ARRIVAL_SOCIAL" },
      { text: "Capture the venue's outdoor beauty – gardens, sunset, or architecture", category: "ARRIVAL_SOCIAL" },
      { text: "Catch someone adding their message to the guest book", category: "ARRIVAL_SOCIAL" },
      { text: "Find the photo booth and capture someone being silly", category: "ARRIVAL_SOCIAL" },
      { text: "Photograph the gift table setup with all the wrapped presents", category: "ARRIVAL_SOCIAL" },
      { text: "Catch guests' reactions as they take in the stunning venue", category: "ARRIVAL_SOCIAL" },

      // VENUE / RECEPTION - Food & Speeches (15 challenges)
      { text: "The grand entrance! Capture the newlyweds arriving like celebrities", category: "FOOD_SPEECHES" },
      { text: "Get a beautiful shot of the head table before everyone sits down", category: "FOOD_SPEECHES" },
      { text: "Catch someone mid-toast with their glass raised high", category: "FOOD_SPEECHES" },
      { text: "The wedding cake in all its glory – before the first slice!", category: "FOOD_SPEECHES" },
      { text: "Capture the cake cutting moment – will they smash or be sweet?", category: "FOOD_SPEECHES" },
      { text: "Snap your table enjoying the meal together", category: "FOOD_SPEECHES" },
      { text: "Make the food look Instagram-worthy – get that perfect plate shot", category: "FOOD_SPEECHES" },
      { text: "Catch someone cracking up during a speech", category: "FOOD_SPEECHES" },
      { text: "Capture the best man or maid of honor's speech moment", category: "FOOD_SPEECHES" },
      { text: "The newlyweds' first meal as a married couple – so sweet!", category: "FOOD_SPEECHES" },
      { text: "Cheers! Capture the tradition of clinking glasses", category: "FOOD_SPEECHES" },
      { text: "Photograph the dessert spread – make everyone jealous", category: "FOOD_SPEECHES" },
      { text: "Catch the parents' speech – tissues optional but likely", category: "FOOD_SPEECHES" },
      { text: "Get Chris & Candice's reaction to something said in a speech", category: "FOOD_SPEECHES" },
      { text: "Capture the whole dining room atmosphere during dinner service", category: "FOOD_SPEECHES" },

      // VENUE / RECEPTION - Dance Floor (20 challenges)
      { text: "The first dance! Capture this romantic moment", category: "DANCE_FLOOR" },
      { text: "Father-daughter dance – get ready for the tears", category: "DANCE_FLOOR" },
      { text: "Mother-son dance – such a special moment", category: "DANCE_FLOOR" },
      { text: "Hands up! Catch the energy when everyone's dancing like nobody's watching", category: "DANCE_FLOOR" },
      { text: "Someone's busting out their best moves – capture the confidence!", category: "DANCE_FLOOR" },
      { text: "Kids on the dance floor are pure joy – catch them in action", category: "DANCE_FLOOR" },
      { text: "A packed dance floor means the party's going – get that crowd shot!", category: "DANCE_FLOOR" },
      { text: "Snap the DJ or band in the zone keeping the party alive", category: "DANCE_FLOOR" },
      { text: "Everyone's doing the Electric Slide or Cupid Shuffle – capture the chaos!", category: "DANCE_FLOOR" },
      { text: "Chris & Candice dancing with their wedding party", category: "DANCE_FLOOR" },
      { text: "Catch someone showing off their fancy footwork", category: "DANCE_FLOOR" },
      { text: "Shoes off, hair down – catch Candice cutting loose on the dance floor", category: "DANCE_FLOOR" },
      { text: "A dance circle is forming – get in there and capture the hype!", category: "DANCE_FLOOR" },
      { text: "Someone belting out the lyrics – catch that passion!", category: "DANCE_FLOOR" },
      { text: "Grandparents showing the young folks how it's done", category: "DANCE_FLOOR" },
      { text: "The newlyweds making the rounds dancing with everyone", category: "DANCE_FLOOR" },
      { text: "Someone's doing the worm or breakdancing – you better catch this!", category: "DANCE_FLOOR" },
      { text: "Bouquet toss! Who's catching it? Get that action shot", category: "DANCE_FLOOR" },
      { text: "Garter toss – catch the anticipation and the throw", category: "DANCE_FLOOR" },
      { text: "The conga line is happening – capture this train of celebration!", category: "DANCE_FLOOR" },

      // VENUE / RECEPTION - Late Night / After-Dark (10 challenges)
      { text: "The venue transformed by night – capture those magical lights", category: "LATE_NIGHT" },
      { text: "Sparkler send-off! Get those light trails and smiling faces", category: "LATE_NIGHT" },
      { text: "The grand exit – capture Chris & Candice leaving in style", category: "LATE_NIGHT" },
      { text: "A slow song when the floor's less packed – capture the intimacy", category: "LATE_NIGHT" },
      { text: "Late-night snacks hitting the spot – capture someone's joy", category: "LATE_NIGHT" },
      { text: "Find the party warriors still going strong at the end", category: "LATE_NIGHT" },
      { text: "Catch the newlyweds stealing a quiet moment together", category: "LATE_NIGHT" },
      { text: "The last dance – everyone's tired but still dancing", category: "LATE_NIGHT" },
      { text: "The beautiful mess – confetti, streamers, or petals covering the floor", category: "LATE_NIGHT" },
      { text: "The farewell – everyone sending off the happy couple", category: "LATE_NIGHT" },
    ];

    const insertChallenge = db.prepare(
      "INSERT INTO photo_challenges (text, category) VALUES (?, ?)"
    );
    for (const challenge of challenges) {
      insertChallenge.run(challenge.text, challenge.category);
    }
  }
}

const PHOTOS_DIR = path.join(DB_DIR, "photos");
if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

export default getDb;
export { DB_PATH, PHOTOS_DIR };
