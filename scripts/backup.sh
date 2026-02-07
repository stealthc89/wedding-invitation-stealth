#!/bin/bash
# Wedding RSVP Database Backup Script
# Usage: ./scripts/backup.sh [destination]
#
# Backs up the SQLite database to a local directory or GCS bucket.
# Run via cron for automated backups.

set -euo pipefail

DB_PATH="${DB_DIR:-./data}/wedding.db"
BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="wedding-backup-${TIMESTAMP}.db"

if [ ! -f "$DB_PATH" ]; then
  echo "Database not found at $DB_PATH"
  exit 1
fi

# Use SQLite's backup command for a consistent copy
if command -v sqlite3 &> /dev/null; then
  sqlite3 "$DB_PATH" ".backup '${BACKUP_DIR}/${BACKUP_FILE}'"
else
  cp "$DB_PATH" "${BACKUP_DIR}/${BACKUP_FILE}"
fi

echo "Backup created: ${BACKUP_DIR}/${BACKUP_FILE}"

# Optional: upload to GCS
if [ -n "${GCS_BUCKET:-}" ]; then
  gsutil cp "${BACKUP_DIR}/${BACKUP_FILE}" "gs://${GCS_BUCKET}/backups/${BACKUP_FILE}"
  echo "Uploaded to gs://${GCS_BUCKET}/backups/${BACKUP_FILE}"
fi

# Optional: upload to S3
if [ -n "${S3_BUCKET:-}" ]; then
  aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" "s3://${S3_BUCKET}/backups/${BACKUP_FILE}"
  echo "Uploaded to s3://${S3_BUCKET}/backups/${BACKUP_FILE}"
fi

# Retain only last 30 local backups
ls -t "${BACKUP_DIR}"/wedding-backup-*.db 2>/dev/null | tail -n +31 | xargs -r rm
echo "Cleanup complete. Retaining last 30 backups."
