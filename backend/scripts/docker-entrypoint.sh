#!/bin/sh
set -e

echo "🚀 Starting backend entrypoint..."

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
  echo "📦 node_modules not found. Installing dependencies..."
  npm install
else
  echo "✅ node_modules found. Skipping install (run 'npm install' manually if needed)."
fi

# Wait for Postgres to be ready (optional, but good practice)
# We can use a simple wait-for-it logic or just rely on docker depends_on
# For now, we rely on depends_on condition: service_healthy

echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "✨ Generating Prisma Client..."
npx prisma generate

# echo "🌱 Checking/Running database seed..."
# node prisma/seed.js

echo "🟢 Starting server..."
exec npm run dev
