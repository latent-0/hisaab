#!/usr/bin/env bash
# Deploy Hisaab to Google Cloud Run.
#
# Prereqs: gcloud CLI authenticated (`gcloud auth login`) and a project set.
# Usage:   PROJECT_ID=my-proj REGION=asia-south1 ./deploy/cloudrun.sh
#
# By default this deploys the self-contained SQLite build (data resets on cold
# start, fine for a demo). For durable data, provision Cloud SQL Postgres and
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

# Load keys from .env (if present) so real providers light up in the deploy.
if [ -f .env ]; then set -a; . ./.env; set +a; fi

echo "▶ Building image with Cloud Build: $IMAGE"
gcloud builds submit --tag "$IMAGE" --project "$PROJECT_ID"

# Build the --set-env-vars list from whatever is configured (only non-empty keys).
ENVV="HISAAB_SEED=${HISAAB_SEED:-true},SESSION_SECRET=${SESSION_SECRET:-change-me-in-prod}"
ENVV="$ENVV,LLM_PROVIDER=${LLM_PROVIDER:-mock},VOICE_PROVIDER=${VOICE_PROVIDER:-mock},OCR_PROVIDER=${OCR_PROVIDER:-mock}"
add() { [ -n "$2" ] && ENVV="$ENVV,$1=$2"; }
add DATABASE_URL "$DATABASE_URL"
add GROQ_API_KEY "$GROQ_API_KEY"; add GROQ_MODEL "$GROQ_MODEL"
add GEMINI_API_KEY "$GEMINI_API_KEY"; add GEMINI_MODEL "$GEMINI_MODEL"
add ANTHROPIC_API_KEY "$ANTHROPIC_API_KEY"; add ANTHROPIC_MODEL "$ANTHROPIC_MODEL"
add SARVAM_API_KEY "$SARVAM_API_KEY"
add COGNEE_API_BASE "$COGNEE_API_BASE"; add COGNEE_API_KEY "$COGNEE_API_KEY"; add COGNEE_TENANT_ID "$COGNEE_TENANT_ID"
add AUTOMATION_TOKEN "$AUTOMATION_TOKEN"

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
  --set-env-vars "^@@^$(echo "$ENVV" | sed 's/,/@@/g')" \
  --project "$PROJECT_ID"

echo "✅ Deployed. URL:"
gcloud run services describe "$SERVICE" --region "$REGION" --project "$PROJECT_ID" --format 'value(status.url)'
