#!/usr/bin/env bash
# Deploy / atualização do X09 Studio na VPS
# Uso: bash deploy/deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/x09-studio}"
cd "$APP_DIR"

git pull --ff-only
npm ci
npm run build

if pm2 describe x09-studio >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs
fi

pm2 save
curl -sf "http://127.0.0.1:3001/api/health" | head -c 200
echo
echo "OK deploy x09-studio"
