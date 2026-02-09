#!/bin/bash
set -e

echo "📸 Uploading media files to GCS..."

PROJECT_ID="project-ef128af4-2ca3-4e17-837"
BUCKET_NAME="${PROJECT_ID}-wedding-media"

# Check if bucket exists
if ! gsutil ls gs://$BUCKET_NAME/ &>/dev/null; then
  echo "❌ Bucket gs://$BUCKET_NAME/ does not exist yet."
  echo "   Run terraform apply first to create the bucket."
  exit 1
fi

# Upload all media files with cache control headers
echo "Uploading images from public/media/..."
gsutil -m \
  -h "Cache-Control:public, max-age=31536000" \
  -h "Content-Type:image/jpeg" \
  cp -r public/media/*.jpeg gs://$BUCKET_NAME/

echo "✅ Media upload complete!"
echo "   Bucket: gs://$BUCKET_NAME/"
echo "   CDN URL: https://storage.googleapis.com/$BUCKET_NAME/"
