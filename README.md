# Wedding RSVP Platform

A self-hosted, single-container wedding guest RSVP website with admin portal. Built with Next.js, SQLite, and Tailwind CSS.

## Features

- **Guest RSVP**: Unique private links per guest, no login required
- **Admin Portal**: Dashboard, guest management, CSV upload/export, email templates
- **Email Automation**: Invitation, reminder, and itinerary emails via SMTP
- **Analytics**: Attendance counts, meal preference breakdown, response rates
- **Media Support**: Upload background images and videos
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
        attending, plus_one_attending, meal_preference, responded_at)

email_templates (id, slug, name, subject, body_html)

email_log (id, guest_id, template_slug, sent_at, status)

settings (key, value)
```

## API Endpoints

### Guest (Public)
- `GET /api/rsvp?token=xxx` — Fetch guest info
- `POST /api/rsvp` — Submit RSVP

### Admin (Authenticated)
- `GET /api/auth/google` — Initiate Google OAuth sign-in
- `GET /api/auth/google/callback` — OAuth callback (sets session)
- `DELETE /api/auth` — Logout
- `GET /api/auth/me` — Check session
- `GET /api/admin/guests` — List guests (add `?format=csv` for export)
- `POST /api/admin/guests` — Add guest (JSON) or upload CSV (multipart)
- `PUT /api/admin/guests` — Update guest
- `DELETE /api/admin/guests` — Remove guest
- `GET /api/admin/analytics` — Dashboard statistics
- `POST /api/admin/email` — Send emails
- `GET /api/admin/email` — Email send log
- `GET /api/admin/templates` — List email templates
- `PUT /api/admin/templates` — Update template
- `GET /api/admin/backup` — Download database
- `GET/PUT /api/admin/settings` — Manage settings
- `POST /api/admin/media` — Upload media file
- `GET /api/admin/media` — List media files

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

### Option B: Excel to CSV

Excel files (`.xlsx`) need to be saved as CSV first:

1. Open the spreadsheet in Excel or Google Sheets
2. **File → Download as → CSV** (or Save As → CSV UTF-8)
3. Upload the resulting `.csv` file through the admin console

### Option C: Add guests one by one

Use the **Add Guest** form on the Guests page in the admin console to add guests individually.

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
| GCS data bucket (~100KB DB) | < $0.01 |
| GCS backup bucket | < $0.10 |
| Domain (optional) | $0–12/year |
| Resend email (100/mo free) | $0 |
| **Total** | **~$0–5/mo** |
