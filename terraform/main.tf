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

variable "admin_email" {
  description = "Admin login email"
  type        = string
  default     = "admin@wedding.com"
}

variable "admin_password" {
  description = "Admin login password"
  type        = string
  sensitive   = true
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
        name  = "ADMIN_EMAIL"
        value = var.admin_email
      }
      env {
        name  = "ADMIN_PASSWORD"
        value = var.admin_password
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

# Allow unauthenticated access (public website)
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = google_cloud_run_v2_service.wedding.project
  location = google_cloud_run_v2_service.wedding.location
  name     = google_cloud_run_v2_service.wedding.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "service_url" {
  value = google_cloud_run_v2_service.wedding.uri
}

output "data_bucket" {
  value = google_storage_bucket.data.name
}

output "backup_bucket" {
  value = google_storage_bucket.backups.name
}
