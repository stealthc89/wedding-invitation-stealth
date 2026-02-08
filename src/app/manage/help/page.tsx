"use client";

export default function HelpPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Help & Guide</h1>
        <p className="text-gray-600">
          Welcome to your wedding RSVP management system. This guide will help you get the most out of the platform.
        </p>
      </div>

      {/* Quick Start */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">🚀 Quick Start (First-Time Setup)</h2>
        <div className="space-y-4">
          <div className="border-l-4 border-blue-600 pl-4">
            <h3 className="font-semibold text-gray-800 mb-1">1. Upload Your Guest List</h3>
            <p className="text-sm text-gray-600 mb-2">
              Go to <strong>Guests</strong> → <strong>Upload CSV / Excel</strong>
            </p>
            <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded font-mono">
              Required columns: name, email, plus_one_allowed
            </p>
          </div>

          <div className="border-l-4 border-green-600 pl-4">
            <h3 className="font-semibold text-gray-800 mb-1">2. Create Photo Challenges</h3>
            <p className="text-sm text-gray-600 mb-2">
              Go to <strong>Challenges</strong> → Add 5-10 fun prompts
            </p>
            <p className="text-xs text-gray-500">
              Examples: "Take a selfie with the groom", "Best dance floor moment"
            </p>
          </div>

          <div className="border-l-4 border-purple-600 pl-4">
            <h3 className="font-semibold text-gray-800 mb-1">3. Customize Email Templates</h3>
            <p className="text-sm text-gray-600 mb-2">
              Go to <strong>Templates</strong> → Update with your wedding details
            </p>
            <p className="text-xs text-gray-500">
              Add date, venue address, dress code, schedule, parking info, hashtag
            </p>
          </div>

          <div className="border-l-4 border-amber-600 pl-4">
            <h3 className="font-semibold text-gray-800 mb-1">4. Send Invitations</h3>
            <p className="text-sm text-gray-600 mb-2">
              Go to <strong>Dashboard</strong> → <strong>Send Invitations</strong>
            </p>
            <p className="text-xs text-gray-500">
              Each guest gets a unique RSVP link via email (no login required)
            </p>
          </div>
        </div>
      </div>

      {/* Guest Management */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">👥 Managing Guests</h2>

        <h3 className="font-semibold text-gray-800 mb-2">Guest Filters</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 p-3 rounded">
            <p className="font-semibold text-sm text-gray-800">All</p>
            <p className="text-xs text-gray-500">Complete guest list</p>
          </div>
          <div className="bg-amber-50 p-3 rounded">
            <p className="font-semibold text-sm text-amber-800">Pending</p>
            <p className="text-xs text-amber-600">Haven't responded yet</p>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <p className="font-semibold text-sm text-green-800">Responded</p>
            <p className="text-xs text-green-600">Submitted their RSVP</p>
          </div>
          <div className="bg-blue-50 p-3 rounded">
            <p className="font-semibold text-sm text-blue-800">Attending</p>
            <p className="text-xs text-blue-600">Said yes</p>
          </div>
          <div className="bg-red-50 p-3 rounded">
            <p className="font-semibold text-sm text-red-800">Declined</p>
            <p className="text-xs text-red-600">Said no</p>
          </div>
        </div>

        <h3 className="font-semibold text-gray-800 mb-2 mt-4">Guest Actions</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li><strong>Edit</strong> — Change name, email, or plus-one permission</li>
          <li><strong>Email</strong> — Resend invitation to a specific guest</li>
          <li><strong>Copy Link</strong> — Get their unique RSVP URL to share manually</li>
          <li><strong>Delete</strong> — Remove from guest list permanently</li>
        </ul>
      </div>

      {/* Email System */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">✉️ Email System</h2>

        <h3 className="font-semibold text-gray-800 mb-2">Email Templates</h3>
        <div className="space-y-3 mb-4">
          <div className="border-l-4 border-gray-600 pl-3">
            <p className="font-semibold text-sm text-gray-800">Invitation</p>
            <p className="text-xs text-gray-500">Initial RSVP request — sent to unsent guests only</p>
          </div>
          <div className="border-l-4 border-amber-600 pl-3">
            <p className="font-semibold text-sm text-gray-800">Reminder</p>
            <p className="text-xs text-gray-500">Gentle nudge — sent to non-responders only</p>
          </div>
          <div className="border-l-4 border-green-600 pl-3">
            <p className="font-semibold text-sm text-gray-800">Itinerary</p>
            <p className="text-xs text-gray-500">Day-of schedule — sent to attending guests only</p>
          </div>
          <div className="border-l-4 border-blue-600 pl-3">
            <p className="font-semibold text-sm text-gray-800">Confirmation</p>
            <p className="text-xs text-gray-500">Auto-sent after guest RSVPs — don't send manually</p>
          </div>
        </div>

        <h3 className="font-semibold text-gray-800 mb-2 mt-4">Template Variables</h3>
        <div className="bg-gray-50 p-3 rounded text-xs font-mono space-y-1">
          <p><span className="text-blue-600">{"{{"}</span>guest_name<span className="text-blue-600">{"}}"}</span> — Guest's name</p>
          <p><span className="text-blue-600">{"{{"}</span>rsvp_link<span className="text-blue-600">{"}}"}</span> — Link to their RSVP page</p>
          <p><span className="text-blue-600">{"{{"}</span>upload_link<span className="text-blue-600">{"}}"}</span> — Link to photo upload page</p>
          <p><span className="text-blue-600">{"{{"}</span>photo_challenges_section<span className="text-blue-600">{"}}"}</span> — Full challenge list (for confirmation email)</p>
        </div>

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded p-3">
          <p className="text-sm text-amber-800">
            <strong>Troubleshooting:</strong> If emails land in junk, wait 24-48 hours for domain reputation to build.
            Check your Resend dashboard at <a href="https://resend.com/emails" target="_blank" rel="noopener noreferrer" className="underline">resend.com/emails</a>
          </p>
        </div>
      </div>

      {/* Photo Challenges */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">📸 Photo Challenges & Uploads</h2>

        <h3 className="font-semibold text-gray-800 mb-2">How It Works</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 mb-4">
          <li><strong>You create challenges</strong> — Go to Challenges page, add fun photo prompts</li>
          <li><strong>Guests get assigned challenges</strong> — When they RSVP "attending," 2-3 random challenges assigned</li>
          <li><strong>Guests see their challenges</strong> — On RSVP confirmation page + in confirmation email</li>
          <li><strong>You print the QR code</strong> — Dashboard → Download PNG (1024×1024px print-ready)</li>
          <li><strong>Guests scan & upload</strong> — No login, no app. Just name + photos.</li>
          <li><strong>You view & download</strong> — Photos page shows gallery, download individually or as ZIP</li>
        </ol>

        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Setting Up Photo Upload QR Code</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Go to Dashboard → Scroll to "Photo Upload QR Code"</li>
            <li>Click <strong>Download PNG (print-ready)</strong></li>
            <li>Print and display at: tables, entrance, bar, or photo booth area</li>
          </ol>
        </div>

        <h3 className="font-semibold text-gray-800 mb-2 mt-4">Viewing Uploaded Photos</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li><strong>Photos page</strong> — See all uploads in gallery grid</li>
          <li><strong>Filter by guest name</strong> — Find specific guest's uploads</li>
          <li><strong>Download individual</strong> — Click download icon on any photo</li>
          <li><strong>Download all as ZIP</strong> — Get everything at once</li>
          <li><strong>Delete</strong> — Remove duplicates, blurry photos, etc.</li>
        </ul>
      </div>

      {/* Exporting Data */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">📥 Exporting & Backup</h2>

        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Export Guest List</h3>
            <p className="text-sm text-gray-600">Dashboard → <strong>Export Guests as CSV</strong></p>
            <p className="text-xs text-gray-500">Downloads all guest data including RSVP responses</p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Download Photos</h3>
            <p className="text-sm text-gray-600">Photos page → <strong>Download All as ZIP</strong></p>
            <p className="text-xs text-gray-500">Gets all guest-uploaded photos in one file</p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Backup Database</h3>
            <p className="text-sm text-gray-600">Top right nav → <strong>Download Backup</strong></p>
            <p className="text-xs text-gray-500">Downloads wedding.db SQLite file (all data)</p>
          </div>
        </div>

        <div className="mt-4 bg-green-50 border border-green-200 rounded p-3">
          <p className="text-sm text-green-800">
            <strong>Automatic Backups:</strong> Your GCS bucket has versioning enabled.
            Every database write creates a new version (30 generations retained).
          </p>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">🛠️ Troubleshooting</h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-red-700 mb-1">Guest can't access RSVP link</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Verify link format: <code className="bg-gray-100 px-1 rounded">https://celebratingcc.com/rsvp/[token]</code></li>
              <li>Check guest exists in system (Guests page)</li>
              <li>Resend email using Email button on Guests page</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-red-700 mb-1">Emails not sending</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Test sending: Dashboard → Send invitation to yourself</li>
              <li>Check Resend dashboard for bounces/failures</li>
              <li>Verify SMTP_PASS environment variable is set</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-red-700 mb-1">Photos not uploading</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Check file size: Max 10 MB per photo</li>
              <li>Check file type: JPG, PNG, WebP, HEIC only</li>
              <li>Check browser console for errors</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-red-700 mb-1">RSVP deadline passed</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Update deadline via API: <code className="bg-gray-100 px-1 rounded text-xs">PUT /api/admin/settings</code></li>
              <li>Set <code className="bg-gray-100 px-1 rounded text-xs">rsvp_deadline</code> to new date or empty string</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Day-Of Checklist */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-purple-900 mb-4">🎉 Day-Of Checklist</h2>
        <ul className="space-y-2 text-sm text-purple-800">
          <li className="flex items-start gap-2">
            <input type="checkbox" className="mt-0.5" />
            <span>Print QR code and display at venue</span>
          </li>
          <li className="flex items-start gap-2">
            <input type="checkbox" className="mt-0.5" />
            <span>Send final itinerary email to attending guests</span>
          </li>
          <li className="flex items-start gap-2">
            <input type="checkbox" className="mt-0.5" />
            <span>Check photo uploads throughout the day</span>
          </li>
          <li className="flex items-start gap-2">
            <input type="checkbox" className="mt-0.5" />
            <span>Download photos after event</span>
          </li>
          <li className="flex items-start gap-2">
            <input type="checkbox" className="mt-0.5" />
            <span>Export final guest list as CSV</span>
          </li>
          <li className="flex items-start gap-2">
            <input type="checkbox" className="mt-0.5" />
            <span>Download database backup</span>
          </li>
        </ul>
      </div>

      {/* System Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">ℹ️ System Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Platform</p>
            <p className="font-semibold text-gray-800">Google Cloud Run</p>
          </div>
          <div>
            <p className="text-gray-500">Region</p>
            <p className="font-semibold text-gray-800">europe-west2 (London)</p>
          </div>
          <div>
            <p className="text-gray-500">Domain</p>
            <p className="font-semibold text-gray-800">celebratingcc.com</p>
          </div>
          <div>
            <p className="text-gray-500">Email Service</p>
            <p className="font-semibold text-gray-800">Resend (smtp.resend.com)</p>
          </div>
          <div>
            <p className="text-gray-500">Authentication</p>
            <p className="font-semibold text-gray-800">Google OAuth</p>
          </div>
          <div>
            <p className="text-gray-500">Storage</p>
            <p className="font-semibold text-gray-800">GCS Bucket (versioned)</p>
          </div>
        </div>
      </div>

      {/* Need More Help */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <h3 className="font-semibold text-gray-800 mb-2">Need More Help?</h3>
        <p className="text-sm text-gray-600 mb-4">
          Check the README for detailed technical information or contact support.
        </p>
        <div className="flex justify-center gap-3">
          <a
            href="https://github.com/ddl-chris-mutono/wedding-invitation"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-800 text-white rounded text-sm hover:bg-gray-700"
          >
            View GitHub Repo
          </a>
          <a
            href="https://resend.com/emails"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Resend Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
