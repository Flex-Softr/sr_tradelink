#!/bin/sh
set -e

# Change directory to the project root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d ".next/standalone" ]; then
  echo "Error: Standalone build not found in .next/standalone."
  echo "Please run 'npm run build' first."
  exit 1
fi

echo "Syncing static assets to standalone directory..."

# Copy public directory to standalone if exists
if [ -d "public" ]; then
  mkdir -p .next/standalone/public
  cp -r public/* .next/standalone/public/ 2>/dev/null || true
fi

# Copy .next/static to standalone
if [ -d ".next/static" ]; then
  mkdir -p .next/standalone/.next/static
  cp -r .next/static/* .next/standalone/.next/static/ 2>/dev/null || true
fi

# Copy .env to standalone if present and missing
if [ -f ".env" ] && [ ! -f ".next/standalone/.env" ]; then
  cp .env .next/standalone/.env
fi

export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3000}
export HOSTNAME=${HOSTNAME:-0.0.0.0}

echo "Starting Next.js standalone server on http://${HOSTNAME}:${PORT}..."
exec node .next/standalone/server.js
