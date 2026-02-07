# Implementation Plan & Progress

> Living document for collaborating across LLMs and sessions.
> Last updated: 2026-02-07

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

---

## Current State

**Branch**: `claude/wedding-rsvp-platform-UB0Xl`
**Build**: Passes cleanly (`npm run build` — 22 routes, 0 errors)
**Working tree**: Clean

### File Layout

```
src/
├── lib/
│   ├── db.ts              # SQLite schema, migrations, pragmas
│   ├── auth.ts            # Google OAuth, JWT, session, email allowlist
│   └── email.ts           # SMTP transport, template rendering
├── components/
│   └── PhotoSlideshow.tsx  # Ken Burns animated carousel
├── app/
│   ├── page.tsx           # Home page (slideshow + hero)
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Tailwind + Ken Burns + glass-card CSS
│   ├── rsvp/[token]/page.tsx  # Guest RSVP form
│   ├── manage/            # Admin portal (Google OAuth protected)
│   │   ├── layout.tsx     # Nav sidebar, auth guard, logout
│   │   ├── login/page.tsx # Google sign-in
│   │   ├── dashboard/page.tsx  # Analytics
│   │   ├── guests/page.tsx     # Guest CRUD + CSV
│   │   ├── templates/page.tsx  # Email template editor
│   │   └── media/page.tsx      # Media gallery + upload
│   └── api/
│       ├── rsvp/route.ts       # GET/POST guest RSVP
│       ├── auth/{google,me}/   # OAuth + session endpoints
│       └── admin/{guests,analytics,email,templates,backup,settings,media}/
terraform/main.tf          # GCP Cloud Run + GCS + IAM
Dockerfile                 # Multi-stage Alpine build
docker-compose.yml         # Local Docker config
scripts/backup.sh          # DB backup script
```

### Database Schema

| Table | Purpose |
|-------|---------|
| `guests` | Guest records with token, RSVP status, meal pref, plus-one |
| `email_templates` | Invitation/reminder/itinerary HTML templates |
| `email_log` | Record of every email sent (guest_id, template, status) |
| `settings` | Key-value config store |

### API Surface

| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/rsvp` | GET, POST | Token | Guest RSVP fetch & submit |
| `/api/auth/google` | GET | — | Initiate OAuth |
| `/api/auth/google/callback` | GET | — | OAuth callback |
| `/api/auth` | DELETE | Session | Logout |
| `/api/auth/me` | GET | Session | Check session |
| `/api/admin/guests` | GET, POST, PUT, DELETE | Admin | Guest CRUD + CSV |
| `/api/admin/analytics` | GET | Admin | Dashboard stats |
| `/api/admin/email` | GET, POST | Admin | Email log + send |
| `/api/admin/templates` | GET, PUT | Admin | Template management |
| `/api/admin/backup` | GET | Admin | Download DB file |
| `/api/admin/settings` | GET, PUT | Admin | Settings CRUD |
| `/api/admin/media` | GET, POST, DELETE | Admin | Media management |

---

## Proposed Next Tasks

> Pick any of these up in a new session. They are independent unless noted.

### High Priority

1. **Add user's actual photos to the repo**
   - User needs to provide 4 photos: `venice.jpg`, `bali.jpg`, `neworleans.jpg`, `beach.jpg`
   - Place in `public/media/`
   - These are already referenced in `PhotoSlideshow.tsx` DEFAULT_PHOTOS array

2. **End-to-end testing**
   - Spin up dev server, create test guests via API, submit RSVPs, verify email log
   - Test Google OAuth flow with real credentials
   - Test CSV upload with various column name formats
   - Verify media upload/delete cycle

3. **Wedding date & event details**
   - User hasn't specified the wedding date, venue, or itinerary yet
   - These are needed for: home page display, email template content, RSVP deadline logic
   - Update home page, email templates, and potentially add a countdown component

### Medium Priority

4. **RSVP deadline enforcement**
   - Add a `rsvp_deadline` setting
   - Reject submissions after the deadline with a friendly message
   - Show countdown on home/RSVP pages

5. **Email template content**
   - Default templates have placeholder text
   - Need real wedding details (venue, date, dress code, registry, etc.)
   - Consider adding an HTML email preview in the admin editor

6. **Mobile responsiveness audit**
   - Test all pages on mobile viewports
   - Glass-card form might need padding/sizing adjustments
   - Admin portal sidebar may need a hamburger menu on mobile

7. **Dynamic slideshow from media API**
   - Currently the slideshow reads from a hardcoded `DEFAULT_PHOTOS` array
   - Could fetch the media list from `/api/admin/media` or a settings key
   - Would allow adding slideshow photos at runtime without code changes

8. **Excel (.xlsx) direct upload support**
   - Currently guests must save as CSV first
   - The `xlsx` package is already in dependencies
   - Wire it into the guest upload API to accept .xlsx directly

### Low Priority

9. **Custom domain & SSL setup**
   - Document Cloud Run domain mapping or load balancer setup
   - Update `BASE_URL` and OAuth redirect URIs accordingly

10. **Automated CI/CD pipeline**
    - GitHub Actions: build, test, push to GCR, deploy to Cloud Run
    - The sync workflows already exist; add deploy step

11. **Guest dietary notes / special requests field**
    - Add a free-text field to the RSVP form
    - Show in admin guest table and CSV export

12. **QR code generation for invitations**
    - Generate QR codes linking to each guest's RSVP URL
    - Useful for printed invitation cards

---

## Known Issues & Concerns

| Issue | Severity | Notes |
|-------|----------|-------|
| Photos not yet added | Blocker for visual testing | User needs to add 4 photos to `public/media/` |
| Wedding details TBD | Blocker for email content | Date, venue, itinerary not yet provided |
| Slideshow is hardcoded | Minor | Photos array is in source code, not dynamic |
| No automated tests | Medium | No unit or integration tests exist yet |
| No rate limiting on RSVP API | Low | Could be spammed, but tokens are UUIDs |
| Media uploads lost on redeploy | Low | Runtime uploads go to container filesystem; only GCS-mounted `/app/data` persists. Acceptable since primary media is baked into the build |

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
5. **Update this file** after making changes — keep the completed/proposed sections current
