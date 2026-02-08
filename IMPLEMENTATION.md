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
                    ├── wedding.db (versioned, 30 generations)
                    └── photos/   (guest-uploaded photos)
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
- [x] **Excel (.xlsx) direct upload** — Guest list can be uploaded as .xlsx or .csv. API auto-detects format.
- [x] **Dietary notes field** — Free-text on RSVP form for allergies/restrictions. DB auto-migrates.
- [x] **RSVP deadline enforcement** — `rsvp_deadline` setting; API returns 410 after date.
- [x] **Dynamic slideshow** — `GET /api/slideshow` fetches from settings or scans `public/media/`.
- [x] **User checklist in README** — Step-by-step checklist of things only the user can do.

### Phase 6: Photo Challenges & Guest Photo Upload ✅
- [x] **Photo challenges CRUD** — Admin manages text-based photo prompts via `/manage/challenges`. API: `GET/POST/PUT/DELETE /api/admin/challenges`. Stored in `photo_challenges` table.
- [x] **Challenge assignment on RSVP** — When a guest accepts, 2–3 random challenges from the pool are assigned and stored in `guest_challenges` (deterministic per guest, no reassignment on refresh). Shown on the RSVP confirmation page.
- [x] **Public photo upload page** (`/upload`) — Mobile-first, no auth. Guest enters name + selects photos (JPG/PNG/WebP/HEIC, max 10 MB each, max 20 per upload). No login, no CAPTCHA.
- [x] **Upload API** (`POST /api/upload`) — Saves files to `data/photos/` with naming convention `guestname_timestamp_uuid.ext`. Stores metadata in `photo_uploads` table. Best-effort guest name matching against DB.
- [x] **Admin photo gallery** (`/manage/photos`) — Grid view with thumbnails, filter by guest name, individual download, delete. Shows "matched" badge when uploader name matches a guest record.
- [x] **Zip download** — `GET /api/admin/photos?zip=all` generates a zip of all uploaded photos on the fly (zero-dependency CRC32 implementation).
- [x] **QR code generation** — `GET /api/admin/qr` returns SVG; `?format=png` returns print-ready 1024px PNG. Shown on dashboard with download buttons. Links to `/upload`.
- [x] **Confirmation email with challenges** — New `confirmation` template (auto-seeded + migration for existing DBs). Sent automatically on RSVP accept. Includes `{{photo_challenges_section}}` variable with challenge list and upload link.
- [x] **Photo analytics** — Dashboard shows total photos, guests contributing, top contributor, upload activity over time chart.
- [x] **Nav updated** — Admin nav now includes Challenges + Photos links.

---

## Current State

**Branch**: `claude/wedding-rsvp-platform-UB0Xl`
**Build**: Passes cleanly (`npm run build` — 30 routes, 0 errors)
**Working tree**: Changes pending commit

### File Layout

```
src/
├── lib/
│   ├── db.ts              # SQLite schema, migrations, pragmas
│   ├── auth.ts            # Google OAuth, JWT, session, email allowlist
│   └── email.ts           # SMTP transport, template rendering, challenge injection
├── components/
│   └── PhotoSlideshow.tsx  # Ken Burns carousel (dynamic photo fetch)
├── app/
│   ├── page.tsx           # Home page (slideshow + hero)
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Tailwind + Ken Burns + glass-card CSS
│   ├── upload/page.tsx    # Public photo upload page (no auth, mobile-first)
│   ├── rsvp/[token]/page.tsx  # Guest RSVP form + challenge display
│   ├── manage/            # Admin portal (Google OAuth protected)
│   │   ├── layout.tsx     # Nav sidebar, auth guard, logout
│   │   ├── login/page.tsx # Google sign-in
│   │   ├── dashboard/page.tsx  # Analytics + QR code + photo stats
│   │   ├── guests/page.tsx     # Guest CRUD + CSV/Excel upload
│   │   ├── challenges/page.tsx # Photo challenge management
│   │   ├── photos/page.tsx     # Guest photo gallery
│   │   ├── templates/page.tsx  # Email template editor
│   │   └── media/page.tsx      # Site media gallery + upload
│   └── api/
│       ├── rsvp/route.ts       # GET/POST guest RSVP + challenge assignment
│       ├── upload/route.ts     # POST public photo upload (no auth)
│       ├── slideshow/route.ts  # GET public slideshow photo list
│       ├── auth/{google,me}/   # OAuth + session endpoints
│       └── admin/
│           ├── challenges/route.ts  # CRUD photo challenges
│           ├── photos/route.ts      # List/download/zip/delete guest photos
│           ├── qr/route.ts          # Generate QR code (SVG/PNG)
│           ├── guests/route.ts      # Guest CRUD + CSV/Excel
│           ├── analytics/route.ts   # Dashboard stats + photo stats
│           ├── email/route.ts       # Email sending + log
│           ├── templates/route.ts   # Email template management
│           ├── backup/route.ts      # DB download
│           ├── settings/route.ts    # Settings CRUD
│           └── media/route.ts       # Site media management
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
| `email_templates` | Invitation/reminder/itinerary/confirmation HTML templates |
| `email_log` | Record of every email sent (guest_id, template, status) |
| `settings` | Key-value config store (rsvp_deadline, slideshow_photos, etc.) |
| `photo_challenges` | Admin-defined text prompts for wedding photo challenges |
| `guest_challenges` | Junction table: which challenges were assigned to which guest |
| `photo_uploads` | Metadata for guest-uploaded photos (name, filename, size, matched guest) |

### API Surface

| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/rsvp` | GET, POST | Token | Guest RSVP + challenge assignment + confirmation email |
| `/api/upload` | POST | Public | Guest photo upload (no auth) |
| `/api/slideshow` | GET | Public | Slideshow photo paths |
| `/api/auth/google` | GET | — | Initiate OAuth |
| `/api/auth/google/callback` | GET | — | OAuth callback |
| `/api/auth` | DELETE | Session | Logout |
| `/api/auth/me` | GET | Session | Check session |
| `/api/admin/guests` | GET, POST, PUT, DELETE | Admin | Guest CRUD + CSV/Excel |
| `/api/admin/challenges` | GET, POST, PUT, DELETE | Admin | Photo challenge CRUD |
| `/api/admin/photos` | GET, DELETE | Admin | Photo gallery + download + zip |
| `/api/admin/qr` | GET | Admin | QR code generation (SVG/PNG) |
| `/api/admin/analytics` | GET | Admin | Dashboard + photo stats |
| `/api/admin/email` | GET, POST | Admin | Email log + send |
| `/api/admin/templates` | GET, PUT | Admin | Template management |
| `/api/admin/backup` | GET | Admin | Download DB file |
| `/api/admin/settings` | GET, PUT | Admin | Settings CRUD |
| `/api/admin/media` | GET, POST, DELETE | Admin | Site media management |

### Photo Storage Design

**Approach**: Files stored in `data/photos/` (GCS-mounted on Cloud Run).

**Naming convention**: `guestname_timestamp_uuid.ext` (e.g., `john_smith_1707408000000_a1b2c3d4.jpg`)

**Why this approach:**
- **Simplicity**: Flat directory, no nesting. Easy to browse, backup, or move.
- **Cost**: Same GCS bucket as the DB — no additional buckets or services.
- **Scalability**: For 200 guests × ~5 photos each = ~1000 files. Flat dir handles this fine.
- **Admin usability**: Filename encodes guest name and timestamp — readable without DB lookup.

**Metadata in SQLite**: `photo_uploads` table tracks guest_name, filename, file_size, matched_guest_id, uploaded_at. Best-effort guest matching by case-insensitive name comparison.

---

## Proposed Next Tasks

> Pick any of these up in a new session. They are independent unless noted.

### High Priority (user action required)

1. **Add photos to the repo**
   - User needs to copy their photos into `public/media/`
   - The slideshow auto-detects images — no code change needed

2. **Provide wedding date, venue, and itinerary**
   - Update `src/app/page.tsx` hero text with event details
   - Edit email templates in admin with venue, schedule, dress code
   - Set `rsvp_deadline` in admin Settings

3. **Set up Google OAuth credentials**
   - Create OAuth 2.0 Client ID in Google Cloud Console
   - Add redirect URI: `https://your-domain.com/api/auth/google/callback`
   - Fill in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in env

4. **Set up SMTP for emails**
   - Get API key from Resend, SendGrid, or similar
   - Set `SMTP_PASS` in env

5. **Add initial photo challenges**
   - Go to `/manage/challenges` after deploying
   - Add 5–10 fun prompts (selfie with groom, dance floor, etc.)

### Medium Priority (dev tasks)

6. **End-to-end testing**
   - Full flow: create guest → send invitation → RSVP → verify challenges assigned → upload photo → verify in gallery
   - Test Excel upload with various column formats
   - Test QR code generation and scan

7. **Mobile responsiveness audit**
   - Test all pages on mobile viewports
   - Upload page is mobile-first but admin pages may need work

8. **Admin settings page UI**
   - Build a `/manage/settings` page with form fields for `rsvp_deadline`, `slideshow_photos`, etc.
   - Currently settings are API-only

9. **Email template content polish**
   - Default templates have placeholder text
   - Confirmation template should be reviewed for tone

### Low Priority

10. **Custom domain & SSL setup**
    - Document Cloud Run domain mapping
    - Update `BASE_URL` and OAuth redirect URIs

11. **Automated CI/CD pipeline**
    - GitHub Actions: build, test, push to GCR, deploy to Cloud Run

12. **Per-guest QR codes for printed invitations**
    - Generate individual QR codes linking to each guest's `/rsvp/[token]` URL

13. **Rate limiting on upload API**
    - Currently no rate limiting on the public upload endpoint
    - Low risk (private event) but could add basic IP-based throttling

---

## Known Issues & Concerns

| Issue | Severity | Notes |
|-------|----------|-------|
| Photos not yet added | Blocker for visual testing | User needs to add photos to `public/media/` |
| Wedding details TBD | Blocker for email content | Date, venue, itinerary not yet provided |
| No photo challenges added | Setup needed | Admin must add challenges before first RSVP |
| No automated tests | Medium | No unit or integration tests exist yet |
| Upload page has no rate limiting | Low | Private event assumption; tokens not needed |
| Admin settings page missing | Low | Settings via API only — no UI form |
| Media uploads lost on redeploy | Low | Runtime uploads to container filesystem don't persist; primary media baked into build |

---

## Security Considerations (Photo Upload)

- **File size limit**: 10 MB per file, enforced server-side
- **File type validation**: Extension whitelist (jpg, jpeg, png, webp, heic, heif)
- **Path traversal protection**: Filenames sanitized; `..` and `/` rejected
- **No cloud credentials exposed**: Upload goes through API, not direct to GCS
- **Max files per request**: 20 photos per upload
- **Guest name matching**: Case-insensitive, best-effort — admin can manually reconcile
- **No auth on upload**: By design (QR code at venue). Private event mitigates abuse risk.

## Cost Impact (Photo Upload)

Assuming 200 guests, ~5 photos each at ~3 MB average:
- **Storage**: ~3 GB on GCS = ~$0.06/month
- **Bandwidth**: Minimal (admin download only) = ~$0.01
- **Total additional cost**: < $0.10/month

---

## Tech Stack Quick Reference

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router) | Full-stack React, SSR, API routes |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS 4 | Utility-first, fast iteration |
| Database | SQLite (better-sqlite3) | Zero-ops, embedded, fast |
| Auth | Google OAuth 2.0 + JWT | No passwords, Gmail-only admin |
| Email | Nodemailer + SMTP | Works with any SMTP provider |
| QR Code | qrcode (npm) | SVG + PNG generation, zero native deps |
| Hosting | GCP Cloud Run | Scales to zero, free tier |
| Storage | GCS bucket (native mount) | 11 nines durability, auto-versioning |
| IaC | Terraform | Reproducible infrastructure |
| Container | Docker (Alpine) | Small image, standalone Next.js |
| Excel parsing | xlsx (SheetJS) | Direct .xlsx upload |

---

## Environment Variables

```env
# Auth (required)
GOOGLE_CLIENT_ID=           # Google OAuth client ID
GOOGLE_CLIENT_SECRET=       # Google OAuth client secret
ADMIN_EMAILS=chrisdmutono@gmail.com,candiceburton4@gmail.com
JWT_SECRET=                 # Random string for JWT signing

# App
BASE_URL=https://your-domain.com  # Public URL (used in email links + QR code)

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
7. **Photo feature files**: `src/app/upload/page.tsx` (public upload), `src/app/api/upload/route.ts` (upload API), `src/app/manage/challenges/page.tsx` (challenge admin), `src/app/manage/photos/page.tsx` (photo gallery)
