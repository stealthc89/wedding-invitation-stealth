# Repository Sync Setup Instructions

This repository is configured to automatically sync with `stealthc89/wedding-invitation-stealth` in both directions.

## Setup Steps

### 1. Create a Personal Access Token (PAT)

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name like "Repo Sync Token"
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
5. Generate and **copy the token** (you won't see it again!)

### 2. Add the Secret to BOTH Repositories

#### For ddl-chris-mutono/wedding-invitation:
1. Go to https://github.com/ddl-chris-mutono/wedding-invitation/settings/secrets/actions
2. Click "New repository secret"
3. Name: `SYNC_TOKEN`
4. Value: Paste your PAT
5. Click "Add secret"

#### For stealthc89/wedding-invitation-stealth:
1. Go to https://github.com/stealthc89/wedding-invitation-stealth/settings/secrets/actions
2. Click "New repository secret"
3. Name: `SYNC_TOKEN`
4. Value: Paste the same PAT
5. Click "Add secret"

### 3. Add Reverse Sync Workflow to Stealth Repo

Copy the workflow from `.github/workflows/sync-from-stealth.yml.template` to the stealth repository:

1. Clone or navigate to `stealthc89/wedding-invitation-stealth`
2. Create `.github/workflows/sync-to-main.yml` with the contents from the template file
3. Commit and push this file

### 4. Test the Setup

1. Make a change in either repository
2. Push the change
3. Check the "Actions" tab to see the sync workflow run
4. Verify the change appears in the other repository

## How It Works

- **Push to ddl-chris-mutono/wedding-invitation** → Automatically syncs to stealth repo
- **Push to stealthc89/wedding-invitation-stealth** → Automatically syncs to main repo
- All branches and tags are synced
- Syncs happen within seconds of pushing

## Important Notes

- The sync uses `--force` to handle any conflicts
- If both repos are modified simultaneously, the last push wins
- The workflow runs on all branch pushes and deletions
- Check the Actions tab if sync fails

## Preventing Infinite Loops

The workflows are designed to prevent infinite loops by using the same token and GitHub's built-in protections. Actions triggered by the GITHUB_TOKEN won't trigger new workflow runs.
