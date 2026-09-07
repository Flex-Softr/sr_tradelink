#!/bin/sh
set -e

if [ -f .env ]; then
  if [ -z "$DATABASE_URL" ]; then
    DATABASE_URL=$(grep -E '^DATABASE_URL=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  fi
fi

docker build \
  --build-arg DATABASE_URL="${DATABASE_URL}" \
  -t sr_tradelink:latest .