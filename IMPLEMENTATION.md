# Implementation Plan & Progress

> Living document for collaborating across LLMs and sessions.
> Last updated: 2026-02-08

---

## Project Summary

Wedding guest RSVP platform for ~200–250 guests. Single-container Next.js app with embedded SQLite, deployed on GCP Cloud Run with GCS-backed persistent storage. Admin access via Google OAuth; guests use unique tokenized links (no login).

**Admins**: chrisdmutono@gmail.com, candiceburton4@gmail.com

---

## Architecture

```
Browser ──▶ Cloud Run (single container, max_instances=1)
              ├── Next.js 16 App Router (frontend + API)
              ├── SQLite via better-sqlite3 (journal_mode=DELETE)
              └── GCS native volume mount at /app/data
                    └── wedding.db (versioned, 30 generations)
```

**Key constraints:**
- `max_instances = 1` — required for SQLite single-writer safety
- `journal_mode = DELETE` — WAL mode breaks on GCS FUSE mounts
- `output: "standalone"` — required for Docker/Cloud Run deployment
- `serverExternalPackages: ["better-sqlite3"]` — native module needs this

---

## Completed Work

### Phase 1: Core Platform ✅
- [x] Next.js 16 + TypeScript + Tailwind CSS project scaffold
- [x] SQLite database layer (`src/lib/db.ts`) with auto-migration
- [x] Guest RSVP flow — unique token links, form submission, response locking
- [x] Admin portal — dashboard, guest CRUD, CSV import/export, email templates
- [x] Email automation — Nodemailer SMTP, template variable rendering (`{{guest_name}}`, `{{rsvp_link}}`)
- [x] Three pre-seeded email templates: invitation, reminder, itinerary
- [x] Analytics dashboard — attendance counts, meal breakdown, response rates
- [x] Database backup download via admin
- [x] Settings key-value store
- [x] Dockerfile (multi-stage Alpine build) + docker-compose.yml
- [x] Terraform IaC for GCP Cloud Run

### Phase 2: GCS Persistent Storage ✅
- [x] Replaced ephemeral empty_dir volume with GCS bucket native mount
- [x] Switched SQLite journal mode from WAL to DELETE (FUSE compat)
- [x] GCS object versioning with 30-generation retention
- [x] Scoped IAM service account for bucket access
- [x] Separate backup bucket with 90-day lifecycle

### Phase 3: Google OAuth ✅
- [x] Replaced email/password auth with Google OAuth 2.0 flow
- [x] `ADMIN_EMAILS` allowlist (comma-separated env var)
- [x] JWT session tokens in HttpOnly cookies
- [x] CSRF protection via OAuth state parameter
- [x] Removed bcryptjs dependency and admin_users table
- [x] Moved admin portal from `/admin/*` to `/manage/*`

### Phase 4: Photo Slideshow & Media Management ✅
- [x] Ken Burns animated photo slideshow component (`src/components/PhotoSlideshow.tsx`)
- [x] CSS keyframe animation (scale 1 → 1.12 over 8s, crossfade between slides)
- [x] Redesigned home page — "Chris & Candice" hero over animated slideshow
- [x] Redesigned RSVP page — glass-card form over animated slideshow
- [x] Enhanced admin media page — gallery grid, image/video preview, multi-file upload, delete
- [x] DELETE endpoint on media API with path traversal protection
- [x] README with upload instructions (photos, videos, guest list CSV)

### Phase 5: UX Enhancements & Data Features ✅
- [x] **Excel (.xlsx) direct upload** — Guest list can be uploaded as .xlsx (parsed via `xlsx` package) or .csv. No manual conversion needed. API auto-detects format by file extension.
- [x] **Dietary notes field** — Free-text field on RSVP form for allergies/restrictions/special requests. Stored in `guests.dietary_notes` column. Shown in admin guest table and CSV export. DB migration adds column automatically for existing databases.
- [x] **RSVP deadline enforcement** — Set `rsvp_deadline` key in settings (format: `YYYY-MM-DD`). API returns 410 after deadline. RSVP page shows "Please respond by [date]" above the form. Deadline is inclusive (end of day).
- [x] **Dynamic slideshow** — `GET /api/slideshow` (public, no auth) returns photo list. Checks `slideshow_photos` setting (JSON array) first, then falls back to scanning `public/media/` for image files. PhotoSlideshow component fetches dynamically — no code change needed to add/remove photos at runtime.
- [x] **User checklist in README** — Step-by-step checklist of things only the user can do (add photos, create OAuth creds, set up SMTP, upload guest list, customize templates, etc.)

---

## Current State

**Branch**: `claude/wedding-rsvp-platform-UB0Xl`
**Build**: Passes cleanly (`npm run build` — 23 routes, 0 errors)
**Working tree**: Changes pending commit

### File Layout

```
src/
├── lib/
│   ├── db.ts              # SQLite schema, migrations, pragmas
│   ├── auth.ts            # Google OAuth, JWT, session, email allowlist
│   └── email.ts           # SMTP transport, template rendering
├── components/
│   └── PhotoSlideshow.tsx  # Ken Burns carousel (dynamic photo fetch)
├── app/
│   ├── page.tsx           # Home page (slideshow + hero)
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Tailwind + Ken Burns + glass-card CSS
│   ├── rsvp/[token]/page.tsx  # Guest RSVP form (meal, dietary notes, deadline)
│   ├── manage/            # Admin portal (Google OAuth protected)
│   │   ├── layout.tsx     # Nav sidebar, auth guard, logout
│   │   ├── login/page.tsx # Google sign-in
│   │   ├── dashboard/page.tsx  # Analytics
│   │   ├── guests/page.tsx     # Guest CRUD + CSV/Excel upload
│   │   ├── templates/page.tsx  # Email template editor
│   │   └── media/page.tsx      # Media gallery + upload
│   └── api/
│       ├── rsvp/route.ts       # GET/POST guest RSVP (with deadline check)
│       ├── slideshow/route.ts  # GET public slideshow photo list
│       ├── auth/{google,me}/   # OAuth + session endpoints
│       └── admin/{guests,analytics,email,templates,backup,settings,media}/
terraform/main.tf          # GCP Cloud Run + GCS + IAM
Dockerfile                 # Multi-stage Alpine build
docker-compose.yml         # Local Docker config
scripts/backup.sh          # DB backup script
IMPLEMENTATION.md          # This file
```

### Database Schema

| Table | Purpose |
|-------|---------|
| `guests` | Guest records with token, RSVP status, meal pref, dietary notes, plus-one |
| `email_templates` | Invitation/reminder/itinerary HTML templates |
| `email_log` | Record of every email sent (guest_id, template, status) |
| `settings` | Key-value config store (rsvp_deadline, slideshow_photos, etc.) |

**Notable columns on `guests`:**
- `dietary_notes TEXT` — free-text allergies/restrictions (max 500 chars client-side)
- Auto-migrated via `ALTER TABLE` for existing databases

### API Surface

| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/rsvp` | GET, POST | Token | Guest RSVP fetch & submit (includes deadline check) |
| `/api/slideshow` | GET | Public | Returns slideshow photo paths (from settings or media dir) |
| `/api/auth/google` | GET | — | Initiate OAuth |
| `/api/auth/google/callback` | GET | — | OAuth callback |
| `/api/auth` | DELETE | Session | Logout |
| `/api/auth/me` | GET | Session | Check session |
| `/api/admin/guests` | GET, POST, PUT, DELETE | Admin | Guest CRUD + CSV/Excel upload |
| `/api/admin/analytics` | GET | Admin | Dashboard stats |
| `/api/admin/email` | GET, POST | Admin | Email log + send |
| `/api/admin/templates` | GET, PUT | Admin | Template management |
| `/api/admin/backup` | GET | Admin | Download DB file |
| `/api/admin/settings` | GET, PUT | Admin | Settings CRUD |
| `/api/admin/media` | GET, POST, DELETE | Admin | Media management |

### Settings Keys

| Key | Format | Purpose |
|-----|--------|---------|
| `rsvp_deadline` | `YYYY-MM-DD` | Auto-reject RSVPs after this date; shown on RSVP page |
| `slideshow_photos` | JSON array of paths | Override slideshow photos (e.g. `["/media/a.jpg","/media/b.jpg"]`) |

---

## Proposed Next Tasks

> Pick any of these up in a new session. They are independent unless noted.

### High Priority (user action required)

1. **Add photos to the repo**
   - User needs to copy their photos into `public/media/`
   - The slideshow now auto-detects images in that directory — no code change needed
   - Fallback filenames: `venice.jpg`, `bali.jpg`, `neworleans.jpg`, `beach.jpg`

2. **Provide wedding date, venue, and itinerary**
   - Needed for: home page display, email template content, deadline setting
   - Update `src/app/page.tsx` hero text with actual event details
   - Edit email templates in admin with venue, schedule, dress code, registry
   - Set `rsvp_deadline` in admin Settings

3. **Set up Google OAuth credentials**
   - Create OAuth 2.0 Client ID in Google Cloud Console
   - Add redirect URI: `https://your-domain.com/api/auth/google/callback`
   - Fill in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in env

4. **Set up SMTP for emails**
   - Get API key from Resend, SendGrid, or similar
   - Set `SMTP_PASS` in env; emails are disabled until configured

### Medium Priority (dev tasks)

5. **End-to-end testing**
   - Spin up dev server, create test guests via API, submit RSVPs, verify email log
   - Test Google OAuth flow with real credentials
   - Test CSV and Excel upload with various formats
   - Verify media upload → slideshow dynamic detection cycle

6. **Mobile responsiveness audit**
   - Test all pages on mobile viewports
   - Glass-card form might need padding/sizing adjustments on small screens
   - Admin portal sidebar may need a hamburger menu on mobile

7. **Email template content polish**
   - Default templates have placeholder text
   - Consider adding an HTML email preview pane in the admin template editor

8. **Admin settings page UI**
   - Currently settings are managed via API only
   - Build a `/manage/settings` page with form fields for `rsvp_deadline`, `slideshow_photos`, etc.

### Low Priority

9. **Custom domain & SSL setup**
   - Document Cloud Run domain mapping or load balancer setup
   - Update `BASE_URL` and OAuth redirect URIs accordingly

10. **Automated CI/CD pipeline**
    - GitHub Actions: build, test, push to GCR, deploy to Cloud Run
    - The sync workflows already exist; add deploy step

11. **QR code generation for invitations**
    - Generate QR codes linking to each guest's RSVP URL
    - Useful for printed invitation cards

12. **Rate limiting on RSVP API**
    - Tokens are UUIDs so brute-force is unlikely, but consider basic rate limiting

---

## Known Issues & Concerns

| Issue | Severity | Notes |
|-------|----------|-------|
| Photos not yet added | Blocker for visual testing | User needs to add photos to `public/media/`. Slideshow will auto-detect them. |
| Wedding details TBD | Blocker for email content | Date, venue, itinerary not yet provided by user |
| No automated tests | Medium | No unit or integration tests exist yet |
| No rate limiting on RSVP API | Low | Tokens are UUIDs; brute-force is impractical |
| Media uploads lost on redeploy | Low | Runtime uploads go to container filesystem; only GCS-mounted `/app/data` persists. Primary media should be baked into the build. |
| Admin settings page missing | Low | Settings exist via API but no admin UI — must use API or DB directly |

---

## Tech Stack Quick Reference

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router) | Full-stack React, SSR, API routes |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS 4 | Utility-first, fast iteration |
| Database | SQLite (better-sqlite3) | Zero-ops, embedded, fast |
| Auth | Google OAuth 2.0 + JWT | No passwords, Gmail-only admin |
| Email | Nodemailer + SMTP | Works with any SMTP provider (Resend, SES, etc.) |
| Hosting | GCP Cloud Run | Scales to zero, free tier |
| Storage | GCS bucket (native mount) | 11 nines durability, auto-versioning |
| IaC | Terraform | Reproducible infrastructure |
| Container | Docker (Alpine) | Small image, standalone Next.js |
| Excel parsing | xlsx (SheetJS) | Direct .xlsx upload without user conversion |

---

## Environment Variables

```env
# Auth (required)
GOOGLE_CLIENT_ID=           # Google OAuth client ID
GOOGLE_CLIENT_SECRET=       # Google OAuth client secret
ADMIN_EMAILS=chrisdmutono@gmail.com,candiceburton4@gmail.com
JWT_SECRET=                 # Random string for JWT signing

# App
BASE_URL=https://your-domain.com  # Public URL (used in email links)

# Email (optional — emails disabled if SMTP_PASS is empty)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASS=
EMAIL_FROM=wedding@yourdomain.com
```

---

## For New LLM Sessions

If you're picking this up in a new session:

1. **Branch**: Work on `claude/wedding-rsvp-platform-UB0Xl`
2. **Build**: Run `npm run build` to verify before committing
3. **Test locally**: `npm run dev` then visit `http://localhost:3000`
4. **Key files**: Start with `src/lib/db.ts` (schema), `src/lib/auth.ts` (auth flow), and `src/app/page.tsx` (home page)
5. **Check README "Your Checklist"** section for user-dependent tasks
6. **Update this file** after making changes — keep the completed/proposed sections current
