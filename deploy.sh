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
docker build -t $IMAGE .

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
SERVICE_URL=$(terraform output -raw service_url 2>/dev/null || echo "Check GCP Console")

echo ""
echo "✅ Deployment Complete!"
echo "========================"
echo ""
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "📝 Next Steps:"
echo "   1. Add OAuth redirect: ${SERVICE_URL}/api/auth/google/callback"
echo "   2. Update DNS: Point celebratingcc.com to Cloud Run"
echo "   3. Test login at: ${SERVICE_URL}/manage"
echo ""
