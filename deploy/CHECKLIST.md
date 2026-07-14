# Checklist Sprint 0 / deploy VPS — X09 Studio

## Pré-requisitos na VPS
- Node 20+ (recomendado 22 LTS)
- npm ou bun
- PM2
- Nginx
- Docker (obrigatório a partir do Sprint 6; instalar já no Sprint 0)
- DNS: `studio.x09.com.br` → IP da VPS (Cloudflare)

## Diretórios
```bash
mkdir -p /opt/x09-studio
mkdir -p /var/lib/x09-studio/projects
mkdir -p /var/lib/x09-studio/published
mkdir -p /var/log/x09-studio
```

## App
```bash
cd /opt/x09-studio
git clone <REPO_URL> .
cp .env.example .env
# editar .env com Supabase + GEMINI_API_KEY

npm ci
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

## Nginx
```bash
cp deploy/nginx-studio.conf /etc/nginx/sites-available/x09-studio
ln -sf /etc/nginx/sites-available/x09-studio /etc/nginx/sites-enabled/x09-studio
nginx -t && systemctl reload nginx
```

## Health
```bash
curl -s https://studio.x09.com.br/api/health
curl -s https://studio.x09.com.br/api/health/llm
```

## Atualização
```bash
cd /opt/x09-studio
git pull --ff-only
npm ci
npm run build
pm2 reload x09-studio
```

## Portabilidade (nova VPS)
Só alterar DNS + valores `STUDIO_*_ROOT` no `.env`. Código permanece igual.
