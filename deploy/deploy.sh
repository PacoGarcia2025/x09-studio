#!/usr/bin/env bash
# Deploy / atualização do X09 Studio na VPS
# Uso: bash deploy/deploy.sh
set -euo pipefail

# Tudo dentro de main(): o bash precisa terminar de parsear a função inteira
# antes de rodar qualquer linha dela, então o `git pull` (que reescreve este
# próprio arquivo) não corrompe/trunca a execução em andamento.
main() {
APP_DIR="${APP_DIR:-/opt/x09-studio}"
cd "$APP_DIR"

git pull --ff-only

if [ ! -f .env ] && [ ! -f .env.local ]; then
  echo "ERRO: .env ou .env.local necessário (NEXT_PUBLIC_SUPABASE_* embutido no build)"
  exit 1
fi

if ! grep -qE '^STUDIO_ASSET_GPU_AVAILABLE=true' .env .env.local 2>/dev/null \
  && ! grep -qE '^STUDIO_RUNPOD_API_KEY=.+' .env .env.local 2>/dev/null; then
  echo "AVISO: objeto 3D simples (6 cr) sem GPU — falta STUDIO_ASSET_GPU_AVAILABLE=true ou STUDIO_RUNPOD_* no .env"
fi
if [ ! -f .runpod-ssh/trellis_ed25519 ]; then
  echo "AVISO: falta .runpod-ssh/trellis_ed25519 — a geração simples não consegue ligar a GPU"
fi

# --- Next.js BFF (API) ---
npm ci
# Não apagar .next antes do build: o Nginx serve o CSS daqui.
# Se o build falhar, o site antigo continua no ar.
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
# Deriva VITE_SUPABASE_* do .env/.env.local raiz (mesmo projeto Supabase do Next/BFF).
# "|| true" evita que set -e/pipefail derrube o deploy quando só um dos dois arquivos existe
# (grep sai com erro por causa do arquivo ausente, mesmo achando o valor no outro).
SUPA_URL=$(grep -h '^NEXT_PUBLIC_SUPABASE_URL=' "$APP_DIR/.env" "$APP_DIR/.env.local" 2>/dev/null | tail -1 | cut -d= -f2- || true)
SUPA_KEY=$(grep -hE '^NEXT_PUBLIC_SUPABASE_(PUBLISHABLE_KEY|ANON_KEY)=' "$APP_DIR/.env" "$APP_DIR/.env.local" 2>/dev/null | tail -1 | cut -d= -f2- || true)
if [ -z "$SUPA_URL" ] || [ -z "$SUPA_KEY" ]; then
  echo "AVISO: NEXT_PUBLIC_SUPABASE_URL/PUBLISHABLE_KEY não encontrados no .env raiz — login no Visual MVP vai falhar (Failed to fetch)."
else
  printf 'VITE_SUPABASE_URL=%s\nVITE_SUPABASE_ANON_KEY=%s\n' "$SUPA_URL" "$SUPA_KEY" > .env.production.local
  echo "OK: .env.production.local gerado (VITE_SUPABASE_URL=$SUPA_URL)"
fi
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
}

main "$@"
