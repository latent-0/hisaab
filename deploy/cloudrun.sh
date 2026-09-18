#!/usr/bin/env bash
# Deploy Hisaab to Google Cloud Run.
#
# Prereqs: gcloud CLI authenticated (`gcloud auth login`) and a project set.
# Usage:   PROJECT_ID=my-proj REGION=asia-south1 ./deploy/cloudrun.sh
#
# By default this deploys the self-contained SQLite build (data resets on cold
# start — fine for a demo). For durable data, provision Cloud SQL Postgres and
# pass DATABASE_URL (see README "Production database").

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID}"
REGION="${REGION:-asia-south1}"          # Mumbai
SERVICE="${SERVICE:-hisaab}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/hisaab/${SERVICE}:$(date +%Y%m%d-%H%M%S)"
REPO="hisaab"

echo "▶ Enabling required services…"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com --project "$PROJECT_ID"

echo "▶ Ensuring Artifact Registry repo exists…"
gcloud artifacts repositories describe "$REPO" --location "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "$REPO" --repository-format=docker --location "$REGION" --project "$PROJECT_ID"

echo "▶ Building image with Cloud Build: $IMAGE"
gcloud builds submit --tag "$IMAGE" --project "$PROJECT_ID"

echo "▶ Deploying to Cloud Run…"
gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars "LLM_PROVIDER=${LLM_PROVIDER:-mock},VOICE_PROVIDER=${VOICE_PROVIDER:-mock},OCR_PROVIDER=${OCR_PROVIDER:-mock},HISAAB_SEED=${HISAAB_SEED:-true},SESSION_SECRET=${SESSION_SECRET:-change-me-in-prod}${DATABASE_URL:+,DATABASE_URL=$DATABASE_URL}${GEMINI_API_KEY:+,GEMINI_API_KEY=$GEMINI_API_KEY}${AUTOMATION_TOKEN:+,AUTOMATION_TOKEN=$AUTOMATION_TOKEN}" \
  --project "$PROJECT_ID"

echo "✅ Deployed. URL:"
gcloud run services describe "$SERVICE" --region "$REGION" --project "$PROJECT_ID" --format 'value(status.url)'
