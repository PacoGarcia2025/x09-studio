#!/usr/bin/env bash
# Deploy / atualização do X09 Studio na VPS
# Uso: bash deploy/deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/x09-studio}"
cd "$APP_DIR"

git pull --ff-only
npm ci
rm -rf .next
npm run build

test -f .next/standalone/server.js
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -R .next/static .next/standalone/.next/static
if [ -d public ]; then
  rm -rf .next/standalone/public
  cp -R public .next/standalone/public
fi

if pm2 describe x09-studio >/dev/null 2>&1; then
  pm2 delete x09-studio
fi
pm2 start ecosystem.config.cjs --update-env

pm2 save
curl -sf "http://127.0.0.1:3001/api/health" | head -c 200
echo
echo "OK deploy x09-studio"
