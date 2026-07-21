#!/usr/bin/env bash
# Deploy / atualização do X09 Studio na VPS
# Uso: bash deploy/deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/x09-studio}"
cd "$APP_DIR"

git pull --ff-only

# --- Next.js BFF (API) ---
npm ci
rm -rf .next
npm run build

test -f .next/standalone/server.js
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -R .next/static .next/standalone/.next/static
sudo mkdir -p /var/www/html/clients 2>/dev/null || mkdir -p /var/www/html/clients 2>/dev/null || true
if [ -d public ]; then
  rm -rf .next/standalone/public
  cp -R public .next/standalone/public
fi
if [ -d templates ]; then
  rm -rf .next/standalone/templates
  cp -R templates .next/standalone/templates
fi

if pm2 describe x09-studio >/dev/null 2>&1; then
  pm2 delete x09-studio
fi
pm2 start ecosystem.config.cjs --update-env

# --- Visual MVP (UI Lovable) ---
cd "$APP_DIR/apps/studio-visual-mvp"
npm ci
npm run build
if pm2 describe x09-mvp >/dev/null 2>&1; then
  pm2 restart x09-mvp --update-env
else
  pm2 start bash --name x09-mvp -- -c "npx vite preview --host 0.0.0.0 --port 4173"
fi

cd "$APP_DIR"
pm2 save

# --- Nginx (proxy → 3001, cert Let's Encrypt) ---
if [ -f deploy/nginx-studio.conf ]; then
  sudo cp deploy/nginx-studio.conf /etc/nginx/sites-available/x09-studio
  sudo ln -sf /etc/nginx/sites-available/x09-studio /etc/nginx/sites-enabled/x09-studio
  sudo nginx -t
  sudo systemctl reload nginx
fi

curl -sf "http://127.0.0.1:3001/api/health" | head -c 200
echo
curl -sf "http://127.0.0.1:4173/" | head -c 120
echo
echo "OK deploy x09-studio (API:3001) + x09-mvp (UI:4173)"
echo ""
echo "Publish subdomínio (*.studio.x09.com.br):"
echo "  1) DNS: *.studio.x09.com.br → IP desta VPS"
echo "  2) SSL wildcard (certbot DNS): studio.x09.com.br + *.studio.x09.com.br"
echo "  3) nginx: cp deploy/nginx-studio.conf && nginx -t && reload"
echo "  4) .env: STUDIO_PUBLISH_SUBDOMAIN_SSL=true + rebuild (npm run build)"
echo "Se o SSL wildcard ainda não existir, o Studio copia /sites/{slug} (funciona hoje)."
echo "Se a UI ainda estiver antiga no domínio, aplique o nginx:"
echo "  sudo cp deploy/nginx-studio.conf /etc/nginx/sites-available/x09-studio"
echo "  sudo nginx -t && sudo systemctl reload nginx"
