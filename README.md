# Wedding RSVP Platform — Admin Guide

**Chris & Candice's Wedding** | https://celebratingcc.com

Complete wedding guest management system with RSVP tracking, photo challenges, email automation, and guest photo uploads. Built for ~200 guests on Google Cloud Run.

---

## 🚀 Quick Start for Admins

### Access Your Admin Portal

Visit **https://celebratingcc.com/manage** and sign in with:
- chrisdmutono@gmail.com
- candiceburton4@gmail.com

(Google OAuth — no passwords needed)

###First-Time Setup (15 minutes)

Complete these steps in order:

#### 1. Upload Your Guest List
1. Go to **Guests** in the admin menu
2. Click **Upload CSV / Excel**
3. Select your guest list file

**Required columns:**
```csv
name,email,plus_one_allowed
John Smith,john@example.com,true
Jane Doe,jane@example.com,false
```

Column names are flexible: `Name`, `Email`, `Plus One`, `plus_one`, etc.

#### 2. Create Photo Challenges
1. Go to **Challenges** in the admin menu
2. Add 5-10 fun prompts like:
   - "Take a selfie with the groom"
   - "Best dance floor moment"
   - "Capture someone arriving"
   - "Snap the first dance"

When guests RSVP "attending," they'll randomly receive 2-3 challenges from this pool.

#### 3. Customize Email Templates
1. Go to **Templates** in the admin menu
2. Update each template with your wedding details:
   - **Invitation**: Date, venue address, dress code
   - **Reminder**: Gentle nudge for non-responders
   - **Itinerary**: Day-of schedule, parking info, hashtag
   - **Confirmation**: Thank you message (auto-sent after RSVP)

**Variables you can use:**
- `{{guest_name}}` — Guest's name
- `{{rsvp_link}}` — Link to their RSVP page
- `{{upload_link}}` — Link to photo upload page
- `{{photo_challenges_section}}` — Full challenge list with upload instructions

#### 4. Set RSVP Deadline (Optional)
Configure via API: `PUT /api/admin/settings` with `rsvp_deadline` = `2026-09-01`

Or add a Settings page to the admin portal later.

---

## 📊 Managing Your Event

### Dashboard Overview

The **Dashboard** shows:
- Total invited, responded, outstanding
- Attending vs. declined
- Plus-one count & response rate
- Meal preference breakdown
- Guest photo stats (total uploads, top contributor, daily activity)
- QR code for photo uploads (print this!)

### Sending Invitations

**From Dashboard:**
- Click **Send Invitations (unsent only)**
- System sends to all guests who haven't received an invitation yet
- Each guest gets a unique RSVP link (no login required)

**From Guests page:**
- Find a specific guest
- Click **Email** to send them an invitation immediately

### Tracking Responses

**Guest filters:**
- **All** — Full guest list
- **Pending** — Haven't responded yet
- **Responded** — Submitted their RSVP
- **Attending** — Said yes
- **Declined** — Said no

**Guest actions:**
- **Edit** — Change name, email, plus-one permission
- **Email** — Resend invitation
- **Copy Link** — Get their unique RSVP URL
- **Delete** — Remove from list

### Sending Reminders & Itinerary

**From Dashboard:**
- **Send Reminders** — Nudges guests who haven't replied (status = "pending")
- **Send Itinerary** — Day-of details to confirmed attendees only

---

## 📸 Photo Challenges & Guest Uploads

### How It Works

1. **You create challenges** → Challenges page
2. **Guests get assigned challenges** → When they RSVP "attending," 2-3 random challenges assigned
3. **Guests see their challenges** → RSVP confirmation page + confirmation email
4. **You print the QR code** → Dashboard → Download PNG (1024×1024px, print-ready)
5. **Guests scan & upload** → No login, no app. Just name + photos. Works on any phone.
6. **You view & download** → Photos page shows gallery, filter by guest, download individually or as ZIP

### Setting Up Photo Upload

1. **Dashboard** → Scroll to "Photo Upload QR Code"
2. Click **Download PNG (print-ready)**
3. Print and display at:
   - Tables (tent cards with QR code)
   - Entrance (poster or sign)
   - Bar or photo booth area

### Viewing Uploaded Photos

1. Go to **Photos** in admin menu
2. See all uploads in a gallery grid
3. **Filter by guest name** to find specific uploads
4. **Download individual photos** or **Download All as ZIP**
5. **Delete** unwanted photos (duplicates, blurry, etc.)

**Guest matching:**
- System matches uploader names against your guest list
- Matched guests show a "✓ Matched" badge
- Unmatched names still upload successfully (plus-ones, kids, etc.)

---

## ✉️ Email System

### Email Templates

Four pre-configured templates:

1. **invitation** — Initial RSVP request
2. **reminder** — For guests who haven't responded
3. **itinerary** — Day-of schedule and details
4. **confirmation** — Auto-sent after guest RSVPs (don't manually send this)

### Email Service: Resend

**Current setup:**
- From: noreply@celebratingcc.com
- Domain: celebratingcc.com
- DNS records configured (SPF, DKIM, DMARC)

**Check email status:**
- Dashboard → "Email Actions" section
- Results show: `Sent: X, Failed: Y, Total: Z`

**Troubleshooting:**
- If emails land in junk, wait 24-48 hours for domain reputation to build
- Resend dashboard: https://resend.com/emails
- Check deliverability scores and bounces

---

## 📥 Exporting Data

### Export Guest List

**From Dashboard:**
- Click **Export Guests as CSV**
- Opens/downloads CSV with all guest data

**From API:**
```bash
curl -H "Cookie: session=..." https://celebratingcc.com/api/admin/guests?format=csv
```

### Download Photos

**Individual:**
- Photos page → Click download icon on any photo

**Bulk:**
- Photos page → **Download All as ZIP**
- Generates zip file on-the-fly

### Backup Database

**From Admin Nav:**
- Top right → **Download Backup**
- Downloads `wedding.db` SQLite file

**Automatic backups:**
- GCS bucket has object versioning enabled
- Every write creates a new version
- 30 generations retained

---

## 🎨 Media Management

### Your Slideshow Photos

Your home page shows a Ken Burns animated slideshow with 24 photos:
- Venice (5 photos)
- Singapore (3 photos)
- Bali (3 photos)
- Thailand (2 photos)
- Egypt (2 photos)
- Winter/skiing (4 photos)
- Water sports (2 photos)
- Fun activities (3 photos)

**To add more photos:**
1. Go to **Media** in admin menu
2. Click **Upload** and select images
3. Photos are added to `public/media/`
4. Update slideshow order in code: `src/app/api/slideshow/route.ts`

**Recommended specs:**
- Format: JPEG
- Resolution: 1920×1280 or larger
- Orientation: Landscape
- Size: Under 2 MB per file

---

## 🛠️ Troubleshooting

### Guests Can't Access RSVP Link

1. Check link format: `https://celebratingcc.com/rsvp/[token]`
2. Verify guest exists: Admin → Guests → search by name
3. Resend email: Guests page → Email button

### Emails Not Sending

1. Check SMTP config: Resend API key set in environment
2. Test sending: Dashboard → Send test invitation to yourself
3. Check Resend dashboard for bounces/failures
4. Verify DNS records: SPF, DKIM, DMARC on celebratingcc.com

### Photos Not Uploading

1. Check file size: Max 10 MB per photo
2. Check file type: JPG, PNG, WebP, HEIC only
3. Check browser console for errors
4. Verify GCS bucket is mounted: `/app/data/photos/`

### RSVP Deadline Passed

If guests see "RSVPs are now closed":
1. Update deadline: `PUT /api/admin/settings` with `rsvp_deadline` = new date
2. Or remove deadline: Set value to empty string

---

## 📱 Guest Experience

### What Guests See

1. **Email invitation** with unique RSVP link
2. **RSVP page** with beautiful slideshow background
3. **Form** to accept/decline, plus-one, meal preference, dietary notes
4. **Confirmation page** showing their photo challenges (if attending)
5. **Confirmation email** with challenges + upload link

### Mobile-Friendly

All pages optimized for mobile:
- RSVP form uses large touch targets
- Upload page is mobile-first (camera access)
- Slideshow adapts to screen size

---

## 🎉 Day-Of Checklist

- [ ] Print QR code and display at venue
- [ ] Send final itinerary email to attending guests
- [ ] Check photo uploads throughout the day
- [ ] Download photos after event
- [ ] Export final guest list as CSV
- [ ] Download database backup
- [ ] Send thank-you emails (create new template if needed)

---

## 🔒 Security & Privacy

### Admin Access

Only emails listed in `ADMIN_EMAILS` can sign in:
- chrisdmutono@gmail.com
- candiceburton4@gmail.com

Google OAuth handles authentication — no passwords stored.

### Guest Links

Each guest gets a unique token (e.g., `/rsvp/abc123xyz`):
- No login required
- Link is private (not guessable)
- Share via email only (don't post publicly)

### Photo Uploads

Public upload page (`/upload`) has no authentication:
- By design (QR code at venue)
- Files stored in GCS-backed persistent storage
- Path traversal protection, file type validation, 10 MB limit

---

## 📚 Technical Reference

### System Details

- **Platform**: Next.js 16 + SQLite + Google Cloud Run
- **Domain**: celebratingcc.com
- **Region**: europe-west2 (London)
- **Email**: Resend (smtp.resend.com)
- **Auth**: Google OAuth
- **Storage**: GCS bucket (persistent, versioned)
- **Cost**: ~$0-5/month

### Database Schema

| Table | Purpose |
|-------|---------|
| `guests` | Guest records + RSVP data |
| `email_templates` | Email HTML templates |
| `email_log` | History of sent emails |
| `photo_challenges` | Your photo prompts |
| `guest_challenges` | Which challenges assigned to which guest |
| `photo_uploads` | Metadata for uploaded photos |
| `settings` | Key-value config store |

### API Endpoints

All admin functions have API endpoints. See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for full API reference.

**Key endpoints:**
- `GET /api/admin/analytics` — Dashboard statistics
- `POST /api/admin/email` — Send emails to guests
- `GET /api/admin/guests?format=csv` — Export guest list
- `GET /api/admin/photos?zip=all` — Download all photos
- `GET /api/admin/backup` — Download database
- `PUT /api/admin/settings` — Update settings

### Local Development

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
```

Open http://localhost:3000/manage/login

### Production Deployment

Your platform is deployed using Terraform on Google Cloud Run.

**To redeploy:**
```bash
./deploy.sh
```

This script:
1. Sets GCP project
2. Enables required APIs
3. Builds Docker image (with platform flag)
4. Pushes to Google Container Registry
5. Deploys with Terraform
6. Shows OAuth redirect URL
7. Attempts domain mapping

---

## 📞 Support

Need help?

- **Admin Help Page**: https://celebratingcc.com/manage/help
- **Technical Details**: [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- **Feature Requests**: GitHub Issues
- **Email Problems**: Contact Resend support
- **Google Cloud**: Check Cloud Run logs in GCP Console

---

**Built with** TypeScript, React, Tailwind CSS | **Deployed** February 2026
