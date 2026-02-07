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

Open [http://localhost:3000/admin/login](http://localhost:3000/admin/login) with:
- Email: `admin@wedding.com`
- Password: `admin123`

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
  -e ADMIN_EMAIL=admin@wedding.com \
  -e ADMIN_PASSWORD=your-password \
  -e BASE_URL=https://your-domain.com \
  -v wedding-data:/app/data \
  wedding-rsvp
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_EMAIL` | Admin login email | `admin@wedding.com` |
| `ADMIN_PASSWORD` | Admin login password | `admin123` |
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

admin_users (id, email, password_hash)

settings (key, value)
```

## API Endpoints

### Guest (Public)
- `GET /api/rsvp?token=xxx` — Fetch guest info
- `POST /api/rsvp` — Submit RSVP

### Admin (Authenticated)
- `POST /api/auth` — Login
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
