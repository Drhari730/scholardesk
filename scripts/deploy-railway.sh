#!/bin/bash
set -euo pipefail

source "$HOME/.railway/env" 2>/dev/null || true

echo "=== ScholarDesk Railway Deploy ==="

if ! railway whoami --json >/dev/null 2>&1; then
  echo "Not logged in. Run: railway login --browserless"
  exit 1
fi

cd "$(dirname "$0")/.."

if ! railway status --json >/dev/null 2>&1; then
  echo "Creating Railway project..."
  railway up -y --name scholardesk
else
  echo "Deploying to linked project..."
  railway up --detach -m "Deploy ScholarDesk"
fi

echo "Adding PostgreSQL database..."
railway add --database postgres --json || true

echo "Setting environment variables..."
railway variable set SEED_DATABASE=true

echo "Generating public domain..."
railway domain --json || railway domain

echo "Waiting for deployment..."
sleep 20
railway deployment list --json | head -c 2000

echo ""
echo "Done! Open your Railway dashboard for the live URL."
