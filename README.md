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
Single Container (Next.js full-stack)
├── React Frontend (guest + admin)
├── API Routes (REST)
├── SQLite Database (embedded)
└── SMTP Client (email delivery)
```

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

## Backup Strategy

1. **Manual**: Admin portal → "Download Backup" (downloads SQLite file)
2. **Scripted**: `./scripts/backup.sh` — copies DB locally, optionally uploads to GCS/S3
3. **Automated**: Add cron job: `0 2 * * * /path/to/scripts/backup.sh`

Set `GCS_BUCKET` or `S3_BUCKET` env vars for cloud backup uploads.

## Cost Estimate (GCP Cloud Run)

| Resource | Monthly Cost |
|----------|-------------|
| Cloud Run (scales to zero) | $0 (free tier) |
| GCS backup bucket | < $0.10 |
| Domain (optional) | $0–12/year |
| Resend email (100/mo free) | $0 |
| **Total** | **~$0–5/mo** |
