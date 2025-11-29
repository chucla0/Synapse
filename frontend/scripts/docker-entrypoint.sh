#!/bin/sh
set -e

echo "🚀 Starting frontend entrypoint..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 node_modules not found. Installing dependencies..."
  npm install
else
  echo "✅ node_modules found. Skipping install."
fi

echo "🟢 Starting frontend server..."
exec npm run dev -- --host 0.0.0.0
