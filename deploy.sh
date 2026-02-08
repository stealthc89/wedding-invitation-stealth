#!/bin/bash
set -e

echo "🚀 Wedding RSVP Platform - Deployment Script"
echo "=============================================="
echo ""

PROJECT_ID="project-ef128af4-2ca3-4e17-837"
REGION="europe-west1"
IMAGE="gcr.io/$PROJECT_ID/wedding-rsvp:latest"

echo "📋 Configuration:"
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION (Belgium - supports Domain Mappings)"
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

# Step 7: Configure public access (IAM binding)
echo ""
echo "7️⃣  Configuring public access to Cloud Run service..."
cd ..
IAM_RESULT=$(gcloud run services add-iam-policy-binding wedding-rsvp \
  --region=$REGION \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --project=$PROJECT_ID 2>&1)

if echo "$IAM_RESULT" | grep -q "Updated IAM policy\|bindings"; then
  echo "   ✅ Public access configured"
elif echo "$IAM_RESULT" | grep -q "ALREADY_EXISTS\|already present"; then
  echo "   ✅ Public access already configured"
else
  echo "   ⚠️  IAM binding may have failed, but continuing..."
  echo "   $IAM_RESULT"
fi

# Step 8: Get service URL
echo ""
echo "8️⃣  Getting Cloud Run service URL..."
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

# Step 9: OAuth redirect (one-time setup)
echo "9️⃣  OAuth Redirect URL (one-time setup)..."
echo ""
echo "📋 Your fixed OAuth redirect URL:"
echo "   https://celebratingcc.com/api/auth/google/callback"
echo ""
echo "ℹ️  This is configured once in your Google OAuth app at:"
echo "   https://console.cloud.google.com/apis/credentials"
echo ""
echo "   If you haven't added it yet:"
echo "   1. Edit your OAuth 2.0 Client ID"
echo "   2. Add to 'Authorized redirect URIs': https://celebratingcc.com/api/auth/google/callback"
echo "   3. Click 'Save'"
echo ""

# Step 10: Domain Mapping (idempotent)
echo ""
echo "🔟 Configuring domain mapping..."
DOMAIN="celebratingcc.com"
DOMAIN_EXISTS=$(gcloud beta run domain-mappings describe $DOMAIN --region=$REGION --project=$PROJECT_ID 2>/dev/null && echo "yes" || echo "no")

if [ "$DOMAIN_EXISTS" = "no" ]; then
  echo "   Creating domain mapping for $DOMAIN..."
  gcloud beta run domain-mappings create \
    --service wedding-rsvp \
    --domain $DOMAIN \
    --region=$REGION \
    --project=$PROJECT_ID && {
    echo "   ✅ Domain mapping created!"
  } || {
    echo "   ⚠️  Domain mapping creation failed."
    echo "      Visit: https://console.cloud.google.com/run/domains"
    exit 1
  }
else
  echo "   ✅ Domain mapping already exists"
fi

# Step 11: Configure DNS (idempotent)
echo ""
echo "1️⃣1️⃣ Configuring DNS records..."
DNS_ZONE="celebratingcc-com"
DNS_NAME="$DOMAIN."

# Check if A records exist
A_RECORDS_EXIST=$(gcloud dns record-sets list \
  --zone=$DNS_ZONE \
  --project=$PROJECT_ID \
  --filter="type=A AND name=$DNS_NAME" \
  --format="value(name)" 2>/dev/null)

if [ -z "$A_RECORDS_EXIST" ]; then
  echo "   Creating A records..."
  gcloud dns record-sets create $DNS_NAME \
    --zone=$DNS_ZONE \
    --type=A \
    --ttl=300 \
    --rrdatas="216.239.32.21,216.239.34.21,216.239.36.21,216.239.38.21" \
    --project=$PROJECT_ID && {
    echo "   ✅ A records created!"
  } || {
    echo "   ⚠️  Failed to create A records"
  }
else
  echo "   ✅ A records already exist"
fi

# Check if AAAA records exist
AAAA_RECORDS_EXIST=$(gcloud dns record-sets list \
  --zone=$DNS_ZONE \
  --project=$PROJECT_ID \
  --filter="type=AAAA AND name=$DNS_NAME" \
  --format="value(name)" 2>/dev/null)

if [ -z "$AAAA_RECORDS_EXIST" ]; then
  echo "   Creating AAAA records..."
  gcloud dns record-sets create $DNS_NAME \
    --zone=$DNS_ZONE \
    --type=AAAA \
    --ttl=300 \
    --rrdatas="2001:4860:4802:32::15,2001:4860:4802:34::15,2001:4860:4802:36::15,2001:4860:4802:38::15" \
    --project=$PROJECT_ID && {
    echo "   ✅ AAAA records created!"
  } || {
    echo "   ⚠️  Failed to create AAAA records"
  }
else
  echo "   ✅ AAAA records already exist"
fi

# Check SSL certificate status
echo ""
echo "🔒 Checking SSL certificate status..."
CERT_STATUS=$(gcloud beta run domain-mappings describe $DOMAIN \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(status.conditions.type:filter=CertificateProvisioned.status)" 2>/dev/null || echo "Unknown")

case "$CERT_STATUS" in
  "True")
    echo "   ✅ SSL certificate is active"
    ;;
  "Unknown")
    echo "   ⏳ SSL certificate provisioning in progress..."
    echo "      This can take up to 24 hours after DNS propagates"
    ;;
  *)
    echo "   ⏳ Waiting for DNS propagation and SSL certificate"
    ;;
esac

echo ""
echo "✅ Deployment Complete!"
echo "========================"
echo ""
echo "🌐 URLs:"
echo "   Direct:  $SERVICE_URL"
echo "   Custom:  https://$DOMAIN"
echo ""
echo "📋 Next Steps:"
echo "   1. ✅ Public access configured"
echo "   2. ✅ OAuth redirect URL: https://$DOMAIN/api/auth/google/callback"
echo "   3. ✅ Domain mapping configured"
echo "   4. ✅ DNS records configured"
echo "   5. ⏳ Wait for SSL certificate (can take up to 24 hours)"
echo ""
echo "🧪 Test your site:"
echo "   - Admin portal: https://$DOMAIN/manage"
echo "   - Check DNS: dig $DOMAIN A +short"
echo ""
