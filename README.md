# Wedding RSVP Platform

A self-hosted, single-container wedding guest RSVP website with admin portal. Built with Next.js, SQLite, and Tailwind CSS.

## Features

- **Guest RSVP**: Unique private links per guest, no login required
- **Admin Portal**: Dashboard, guest management, CSV/Excel upload/export, email templates
- **Email Automation**: Invitation, reminder, itinerary, and RSVP confirmation emails via SMTP
- **Photo Challenges**: Admin-defined prompts randomly assigned to guests on RSVP
- **Guest Photo Upload**: Mobile-first upload page via global QR code — no login needed
- **QR Code**: Print-ready QR code (SVG/PNG) linking to the photo upload page
- **Analytics**: Attendance counts, meal preferences, response rates, photo upload stats
- **Media Support**: Ken Burns animated slideshow with dynamic photo loading
- **Backup**: One-click database download + scripted backups to cloud storage

## Architecture

```
┌──────────────┐     ┌──────────────────────────────┐
│   Browser    │────▶│  Cloud Run (single container) │
└──────────────┘     │  ┌────────────────────────┐   │
                     │  │  Next.js (Full-stack)   │   │
                     │  │  ├── React Frontend     │   │
                     │  │  ├── API Routes (REST)  │   │
                     │  │  └── SQLite (embedded)  │   │
                     │  └───────────┬────────────┘   │
                     │              │ native GCS mount│
                     └──────────────┼────────────────┘
                                    ▼
                     ┌──────────────────────────────┐
                     │  GCS Bucket (persistent data) │
                     │  ├── wedding.db               │
                     │  └── (versioned, 11-nines     │
                     │       durability)              │
                     └──────────────────────────────┘
```

**Storage**: SQLite database lives on a GCS bucket mounted natively by Cloud Run V2. No manual FUSE configuration needed — just declare a `gcs` volume in the service spec. Data persists across scale-to-zero events, container restarts, and redeploys. GCS object versioning provides automatic backup history.

**Estimated monthly cost on GCP Cloud Run: $0–5** (within free tier for 200–250 guests)

## Your Checklist

Things only you can do — the app is ready, but needs your content and credentials.

### Before First Deployment

- [ ] **Add your photos** — Copy your 4 photos into `public/media/` as `venice.jpg`, `bali.jpg`, `neworleans.jpg`, `beach.jpg` (or rename them in `src/components/PhotoSlideshow.tsx`)
- [ ] **Create Google OAuth credentials** — [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 Client ID (Web app). Add redirect URI: `https://your-domain.com/api/auth/google/callback`. See [Authentication Setup](#authentication-setup) below
- [ ] **Set up SMTP for emails** — Get an API key from [Resend](https://resend.com), [SendGrid](https://sendgrid.com), or similar. Set `SMTP_PASS` in your env. Emails are disabled until this is configured
- [ ] **Fill in `.env` / `.env.local`** — Copy `.env.example` and fill in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET` (random string), and `BASE_URL`

### After First Deployment

- [ ] **Upload your guest list** — Sign in at `/manage/login`, go to Guests, upload your CSV or Excel file (see [Uploading Your Guest List](#uploading-your-guest-list))
- [ ] **Add photo challenges** — Go to Challenges in the admin, add 5–10 fun prompts (see [Photo Challenges & Guest Uploads](#photo-challenges--guest-uploads))
- [ ] **Customize email templates** — Go to Templates in the admin, update the invitation/reminder/itinerary/confirmation HTML with your wedding details (date, venue, schedule, dress code)
- [ ] **Provide wedding details** — The home page currently says "Chris & Candice" with placeholder text. Update `src/app/page.tsx` with your date, venue, and any other info
- [ ] **Send test invitation** — Add yourself as a test guest, send an invitation email, click the link, and submit a test RSVP to verify the full flow (check that photo challenges appear in the confirmation)
- [ ] **Upload additional photos/videos** — Use the Media page in admin (`/manage/media`) to add more, or commit them to `public/media/`

### Before Sending Real Invitations

- [ ] **Set a custom domain** (optional) — Map your domain to Cloud Run. Update `BASE_URL` and OAuth redirect URIs
- [ ] **Set the RSVP deadline** — In admin Settings, set the `rsvp_deadline` key (e.g., `2026-09-01`) to auto-close RSVPs after that date
- [ ] **Review guest list** — Verify all names, emails, and plus-one permissions are correct
- [ ] **Print the QR code** — Go to Dashboard, download the photo upload QR code (PNG), and print it for display at the venue
- [ ] **Send invitations** — Use the Dashboard "Send Invitations" button or the Guests page email actions

## Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Run development server
npm run dev
```

Set up Google OAuth credentials (see below), then open [http://localhost:3000/manage/login](http://localhost:3000/manage/login) and sign in with your Google account.

## Production Deployment

### Option 1: Docker (Recommended)

```bash
# Build and run with Docker Compose
cp .env.example .env
# Edit .env with your values
docker compose up -d
```

### Option 2: GCP Cloud Run

```bash
# Build and push container
docker build -t gcr.io/YOUR_PROJECT/wedding-rsvp:latest .
docker push gcr.io/YOUR_PROJECT/wedding-rsvp:latest

# Deploy with Terraform
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
terraform init
terraform apply
```

### Option 3: Any Docker Host (Fly.io, Railway, VPS)

```bash
docker build -t wedding-rsvp .
docker run -p 3000:3000 \
  -e JWT_SECRET=your-secret \
  -e GOOGLE_CLIENT_ID=your-client-id \
  -e GOOGLE_CLIENT_SECRET=your-client-secret \
  -e ADMIN_EMAILS=you@gmail.com,fiancee@gmail.com \
  -e BASE_URL=https://your-domain.com \
  -v wedding-data:/app/data \
  wedding-rsvp
```

## Authentication Setup

Admin access uses **Google OAuth**. Only Gmail addresses listed in `ADMIN_EMAILS` can sign in.

### Creating Google OAuth credentials

1. Go to [Google Cloud Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (type: Web application)
3. Add authorized redirect URI: `https://your-domain.com/api/auth/google/callback`
   - For local dev, also add: `http://localhost:3000/api/auth/google/callback`
4. Copy the Client ID and Client Secret into your env vars

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | (required) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | (required) |
| `ADMIN_EMAILS` | Comma-separated Gmail addresses for admin access | (required) |
| `JWT_SECRET` | Secret for session tokens | (insecure default) |
| `BASE_URL` | Public URL of the site | `http://localhost:3000` |
| `SMTP_HOST` | SMTP server host | `smtp.resend.com` |
| `SMTP_PORT` | SMTP server port | `465` |
| `SMTP_USER` | SMTP username | `resend` |
| `SMTP_PASS` | SMTP password / API key | (empty = email disabled) |
| `EMAIL_FROM` | From address for emails | `wedding@yourdomain.com` |

## Data Model

```sql
guests (id, token, name, email, plus_one_allowed, rsvp_status,
        attending, plus_one_attending, meal_preference, dietary_notes,
        responded_at)

email_templates (id, slug, name, subject, body_html)
-- Pre-seeded: invitation, reminder, itinerary, confirmation

email_log (id, guest_id, template_slug, sent_at, status)

settings (key, value)
-- Keys: rsvp_deadline, slideshow_photos

photo_challenges (id, text, created_at)
-- Admin-defined prompts, e.g. "Take a selfie with the groom"

guest_challenges (id, guest_id, challenge_id)
-- 2-3 random challenges assigned per guest on RSVP accept

photo_uploads (id, guest_name, filename, file_size,
              matched_guest_id, uploaded_at)
-- Guest-uploaded photos via the public /upload page
```

## API Endpoints

### Public (No Auth)
- `GET /api/rsvp?token=xxx` — Fetch guest info + assigned challenges
- `POST /api/rsvp` — Submit RSVP (assigns challenges, sends confirmation email)
- `POST /api/upload` — Upload guest photos (name + files, no auth)
- `GET /api/slideshow` — Get slideshow photo list

### Auth
- `GET /api/auth/google` — Initiate Google OAuth sign-in
- `GET /api/auth/google/callback` — OAuth callback (sets session)
- `DELETE /api/auth` — Logout
- `GET /api/auth/me` — Check session

### Admin (Authenticated)
- `GET /api/admin/guests` — List guests (add `?format=csv` for export)
- `POST /api/admin/guests` — Add guest (JSON) or upload CSV/Excel (multipart)
- `PUT /api/admin/guests` — Update guest
- `DELETE /api/admin/guests` — Remove guest
- `GET/POST/PUT/DELETE /api/admin/challenges` — Photo challenge CRUD
- `GET /api/admin/photos` — List uploaded guest photos (filter: `?guest=name`)
- `GET /api/admin/photos?download=filename` — Download single photo
- `GET /api/admin/photos?zip=all` — Download all photos as ZIP
- `DELETE /api/admin/photos` — Delete a photo
- `GET /api/admin/qr` — QR code for upload page (SVG; add `?format=png` for PNG)
- `GET /api/admin/analytics` — Dashboard statistics + photo stats
- `POST /api/admin/email` — Send emails
- `GET /api/admin/email` — Email send log
- `GET /api/admin/templates` — List email templates
- `PUT /api/admin/templates` — Update template
- `GET /api/admin/backup` — Download database
- `GET/PUT /api/admin/settings` — Manage settings
- `GET/POST/DELETE /api/admin/media` — Site media management

## Guest CSV Format

```csv
name,email,plus_one_allowed
John Smith,john@example.com,true
Jane Doe,jane@example.com,false
```

Column names are flexible: `Name`, `Email`, `Plus One`, `plus_one` also work.

## Uploading Photos & Videos

The home page and RSVP page display a Ken Burns animated slideshow cycling through your photos. There are two ways to add media:

### Option A: Add to the repo (before deployment)

Place image or video files in the `public/media/` directory:

```bash
# Copy your photos into the project
cp ~/photos/venice.jpg public/media/venice.jpg
cp ~/photos/bali.jpg public/media/bali.jpg
cp ~/photos/neworleans.jpg public/media/neworleans.jpg
cp ~/photos/beach.jpg public/media/beach.jpg
```

Then update the photo list in `src/components/PhotoSlideshow.tsx`:

```typescript
const DEFAULT_PHOTOS = [
  "/media/venice.jpg",
  "/media/bali.jpg",
  "/media/neworleans.jpg",
  "/media/beach.jpg",
  "/media/your-new-photo.jpg",  // add more here
];
```

Rebuild and redeploy after adding files.

### Option B: Upload via Admin Console (after deployment)

1. Sign in at `/manage/login` with your Google account
2. Go to **Media** in the sidebar
3. Upload images (JPEG, PNG, WebP) or videos (MP4, WebM)
4. Files are saved to `public/media/` inside the container
5. Update the `PhotoSlideshow` component or settings to reference the new file paths

**Recommended image specs**: 1920×1280 or larger, landscape orientation, JPEG quality 80–90, under 2 MB per file for fast loading.

## Uploading Your Guest List

### Option A: CSV upload via Admin Console

1. Sign in at `/manage/login`
2. Go to **Guests** in the sidebar
3. Click **Upload CSV** and select your file

**CSV format**:

```csv
name,email,plus_one_allowed
John Smith,john@example.com,true
Jane Doe,jane@example.com,false
```

Column names are flexible — `Name`, `Email`, `Plus One`, `plus_one` all work.

### Option B: Excel upload via Admin Console

Upload `.xlsx` files directly — no conversion needed:

1. Sign in at `/manage/login`
2. Go to **Guests** in the sidebar
3. Click **Upload CSV / Excel** and select your `.xlsx` file
4. The first sheet is read; column names are matched flexibly (Name, Email, Plus One, etc.)

### Option C: Add guests one by one

Use the **Add Guest** form on the Guests page in the admin console to add guests individually.

## Photo Challenges & Guest Uploads

Encourage guests to take fun, candid photos during the wedding and upload them via a single global QR code.

### How It Works

1. **Admin creates challenges** — Go to `/manage/challenges` and add prompts like:
   - "Take a selfie with the groom"
   - "Best dance floor moment"
   - "Capture someone arriving"
   - "Snap the first dance"
   - "Photo of your table setting"

2. **Guests get assigned challenges** — When a guest RSVPs "attending", the system randomly assigns them 2–3 challenges from the pool. Challenges appear on:
   - The RSVP confirmation page
   - The confirmation email (auto-sent)

3. **Print the QR code** — From the Dashboard, download the QR code (SVG or print-ready 1024px PNG). Display it at the venue — on tables, near the entrance, or on a sign.

4. **Guests upload photos** — Guests scan the QR code, enter their name, select photos, and tap upload. No login, no accounts, no app downloads. The page is mobile-first and loads fast.

5. **Admin reviews photos** — Go to `/manage/photos` to see all uploaded photos in a gallery grid. Filter by guest name, download individual photos, or download everything as a ZIP.

### Photo Storage

Photos are stored in `data/photos/` (which is GCS-mounted on Cloud Run). Each file is named `guestname_timestamp_uuid.ext` — flat directory, no nesting.

**Upload limits**: 10 MB per file, 20 files per upload. Accepted formats: JPG, PNG, WebP, HEIC.

**Guest matching**: When a guest uploads, their name is matched case-insensitively against the guest list. Matched photos show a "matched" badge in the admin gallery. Imperfect matches can be reconciled manually.

**Cost**: ~200 guests × ~5 photos × ~3 MB = ~3 GB on GCS = $0.06/month.

### Email Template Variables

The confirmation email template (`confirmation` slug) supports these variables:

| Variable | Description |
|----------|-------------|
| `{{guest_name}}` | Guest's name |
| `{{rsvp_link}}` | Link to guest's RSVP page |
| `{{upload_link}}` | Link to the photo upload page |
| `{{photo_challenges_section}}` | Formatted HTML block with assigned challenges + upload link |
| `{{photo_challenges}}` | Just the challenge list items (for custom layouts) |

All templates also support `{{guest_name}}`, `{{rsvp_link}}`, and `{{upload_link}}`.

## Storage & Resilience

### Cloud Run (GCS bucket mount)
The Terraform config uses Cloud Run V2's native GCS volume mount at `/app/data`. This means:
- Database survives **scale-to-zero** — data is in GCS, not the container
- Database survives **redeployments** — the bucket is independent of the container
- **GCS object versioning** is enabled — every write creates a version, giving you 30 generations of automatic backup history
- **11 nines durability** (99.999999999%) — more durable than any single disk

**Why this works safely with SQLite:**
- `max_instances = 1` ensures only one container writes to the DB at a time
- `journal_mode = DELETE` avoids the `.shm`/`.wal` files that break on FUSE
- Write volume is tiny (~500 total writes over the event lifecycle)

### Docker / VPS (local volumes)
Docker Compose uses local named volumes. Data persists across container restarts but lives on the host disk. Use the backup script for additional safety.

## Backup Strategy

1. **GCS Versioning** (Cloud Run): Automatic — every DB write is versioned in GCS. Restore any previous version via `gsutil` or the GCS Console.
2. **Manual**: Admin portal → "Download Backup" (downloads SQLite file directly)
3. **Scripted**: `./scripts/backup.sh` — copies DB to a separate backup bucket (GCS or S3)
4. **Automated**: Add cron job: `0 2 * * * /path/to/scripts/backup.sh`

## Cost Estimate (GCP Cloud Run)

| Resource | Monthly Cost |
|----------|-------------|
| Cloud Run (scales to zero) | $0 (free tier) |
| GCS data bucket (~100KB DB + ~3GB photos) | < $0.10 |
| GCS backup bucket | < $0.10 |
| Domain (optional) | $0–12/year |
| Resend email (100/mo free) | $0 |
| **Total** | **~$0–5/mo** |
