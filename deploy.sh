#!/bin/bash
set -e

echo "🚀 Wedding RSVP Platform - Deployment Script"
echo "=============================================="
echo ""

PROJECT_ID="project-ef128af4-2ca3-4e17-837"
REGION="europe-west2"
IMAGE="gcr.io/$PROJECT_ID/wedding-rsvp:latest"

echo "📋 Configuration:"
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION (London)"
echo "   Image: $IMAGE"
echo ""

# Step 1: Set project
echo "1️⃣  Setting GCP project..."
gcloud config set project $PROJECT_ID

# Step 2: Enable required APIs
echo ""
echo "2️⃣  Enabling required GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com \
  cloudresourcemanager.googleapis.com

# Step 3: Authenticate Docker
echo ""
echo "3️⃣  Authenticating Docker with GCR..."
gcloud auth configure-docker

# Step 4: Build Docker image
echo ""
echo "4️⃣  Building Docker image..."
docker build --platform linux/amd64 -t $IMAGE .

# Step 5: Push to GCR
echo ""
echo "5️⃣  Pushing image to Google Container Registry..."
docker push $IMAGE

# Step 6: Deploy with Terraform
echo ""
echo "6️⃣  Deploying infrastructure with Terraform..."
cd terraform
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# Step 7: Get service URL
echo ""
echo "7️⃣  Getting Cloud Run service URL..."
cd ..
SERVICE_URL=$(terraform -chdir=terraform output -raw service_url 2>/dev/null)

if [ -z "$SERVICE_URL" ]; then
  echo "⚠️  Could not get service URL from Terraform"
  SERVICE_URL=$(gcloud run services describe wedding-rsvp --region=$REGION --format='value(status.url)' 2>/dev/null || echo "")
fi

echo ""
echo "✅ Deployment Complete!"
echo "========================"
echo ""
echo "🌐 Service URL: $SERVICE_URL"
echo ""

# Step 8: Update OAuth redirect
echo "8️⃣  Configuring OAuth redirect..."
echo ""
OAUTH_REDIRECT="${SERVICE_URL}/api/auth/google/callback"
echo "📋 OAuth Redirect URL: $OAUTH_REDIRECT"
echo ""
echo "⚠️  ACTION REQUIRED: Add this redirect URL to your Google OAuth app:"
echo "   1. Go to: https://console.cloud.google.com/apis/credentials"
echo "   2. Edit your OAuth 2.0 Client ID"
echo "   3. Add to 'Authorized redirect URIs': $OAUTH_REDIRECT"
echo "   4. Click 'Save'"
echo ""
read -p "Press Enter after adding the OAuth redirect..."

# Step 9: DNS configuration
echo ""
echo "9️⃣  DNS Configuration..."
echo ""
CLOUD_RUN_URL=$(echo $SERVICE_URL | sed 's|https://||')
echo "📋 Point your domain to Cloud Run:"
echo ""
echo "   Add this DNS record:"
echo "   Type: CNAME"
echo "   Name: celebratingcc.com (or @)"
echo "   Value: $CLOUD_RUN_URL"
echo ""
echo "   OR use gcloud run domain-mappings:"
gcloud run domain-mappings create --service wedding-rsvp --domain celebratingcc.com --region=$REGION 2>/dev/null && echo "✅ Domain mapping created!" || echo "⚠️  Manual DNS setup required"
echo ""
echo "📝 Final Steps:"
echo "   1. ✅ OAuth redirect configured"
echo "   2. ✅ Domain mapping configured"
echo "   3. Test at: https://celebratingcc.com/manage"
echo ""
