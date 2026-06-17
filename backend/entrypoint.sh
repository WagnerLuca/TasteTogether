#!/bin/sh
set -e

echo "Running database migrations..."
until npx prisma migrate deploy; do
  echo "Migration failed — database may not be ready yet. Retrying in 3s..."
  sleep 3
done

echo "Starting server..."
exec node dist/index.js
