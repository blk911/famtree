#!/usr/bin/env bash
set -euo pipefail

MAX_ATTEMPTS=5
SLEEP_SECONDS=8

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  if npx prisma db push --skip-generate --accept-data-loss; then
    break
  fi
  if [ "$attempt" -eq "$MAX_ATTEMPTS" ]; then
    echo "Prisma db push failed after ${MAX_ATTEMPTS} attempts."
    exit 1
  fi
  echo "Prisma db push attempt ${attempt} failed; retrying in ${SLEEP_SECONDS}s..."
  sleep "$SLEEP_SECONDS"
done

npx prisma generate
npx next build
