terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "image" {
  description = "Container image URL (e.g., gcr.io/project/wedding-rsvp:latest)"
  type        = string
}

variable "google_client_id" {
  description = "Google OAuth client ID"
  type        = string
}

variable "google_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  sensitive   = true
}

variable "admin_emails" {
  description = "Comma-separated Gmail addresses allowed to access admin"
  type        = string
}

variable "jwt_secret" {
  description = "JWT secret for session tokens"
  type        = string
  sensitive   = true
}

variable "base_url" {
  description = "Public URL of the site"
  type        = string
}

variable "smtp_pass" {
  description = "SMTP password (e.g., Resend API key)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "email_from" {
  description = "From address for emails"
  type        = string
  default     = "wedding@yourdomain.com"
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# GCS bucket for SQLite database (mounted via gcsfuse on Cloud Run)
resource "google_storage_bucket" "data" {
  name          = "${var.project_id}-wedding-data"
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 30
    }
    action {
      type = "Delete"
    }
  }
}

# GCS bucket for backups (separate from live data)
resource "google_storage_bucket" "backups" {
  name          = "${var.project_id}-wedding-backups"
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }
}

# Service account for Cloud Run to access GCS buckets
resource "google_service_account" "wedding_runner" {
  account_id   = "wedding-rsvp-runner"
  display_name = "Wedding RSVP Cloud Run service account"
}

resource "google_storage_bucket_iam_member" "data_access" {
  bucket = google_storage_bucket.data.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.wedding_runner.email}"
}

resource "google_storage_bucket_iam_member" "backup_access" {
  bucket = google_storage_bucket.backups.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.wedding_runner.email}"
}

# Cloud Run service
resource "google_cloud_run_v2_service" "wedding" {
  name     = "wedding-rsvp"
  location = var.region

  template {
    service_account = google_service_account.wedding_runner.email

    containers {
      image = var.image

      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "GOOGLE_CLIENT_ID"
        value = var.google_client_id
      }
      env {
        name  = "GOOGLE_CLIENT_SECRET"
        value = var.google_client_secret
      }
      env {
        name  = "ADMIN_EMAILS"
        value = var.admin_emails
      }
      env {
        name  = "JWT_SECRET"
        value = var.jwt_secret
      }
      env {
        name  = "BASE_URL"
        value = var.base_url
      }
      env {
        name  = "SMTP_PASS"
        value = var.smtp_pass
      }
      env {
        name  = "EMAIL_FROM"
        value = var.email_from
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      volume_mounts {
        name       = "data"
        mount_path = "/app/data"
      }
    }

    # Cloud Run V2 native GCS volume mount — no manual FUSE config needed.
    # Persistent storage that survives scale-to-zero and redeploys.
    # Safe for SQLite with max_instances=1 (single writer) + DELETE journal mode.
    volumes {
      name = "data"
      gcs {
        bucket    = google_storage_bucket.data.name
        read_only = false
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 1  # Critical: ensures single SQLite writer
    }
  }
}

# IAM binding is now handled by deploy.sh Step 7 via gcloud command
# (removed Terraform resource to avoid permission issues)

output "service_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.wedding.uri
}

output "data_bucket" {
  description = "GCS bucket for SQLite database"
  value       = google_storage_bucket.data.name
}

output "backup_bucket" {
  description = "GCS bucket for database backups"
  value       = google_storage_bucket.backups.name
}
