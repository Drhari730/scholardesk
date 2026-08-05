#!/bin/bash
set -e

echo "Applying database schema..."
npx prisma db push

if [ "$SEED_DATABASE" = "true" ]; then
  echo "Seeding database..."
  npx tsx prisma/seed.ts
fi

echo "Starting ScholarDesk..."
exec next start -p "${PORT:-3000}"
