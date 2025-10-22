#!/bin/bash
set -e

# Database migration script
# Usage: ./scripts/migrate.sh

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not set"
  echo "Usage: DATABASE_URL=<url> ./scripts/migrate.sh"
  exit 1
fi

echo "Running migrations..."

for migration in backend/db/migrations/*.sql; do
  echo "Applying $(basename $migration)..."
  psql "$DATABASE_URL" -f "$migration"
done

echo "✓ Migrations complete"
