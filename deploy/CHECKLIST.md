# Deploy produção — https://studio.x09.com.br

## 0) DNS (Cloudflare)
- `studio.x09.com.br` → IP da VPS (proxied ou DNS only)
- SSL/TLS mode: **Full (strict)** se usar Origin Certificate

## 1) Diretórios + SSL
```bash
sudo mkdir -p /opt/x09-studio /var/lib/x09-studio/projects /var/lib/x09-studio/published /var/log/x09-studio /etc/ssl/x09

# Origin Certificate Cloudflare (mesmo padrão do x09.com.br)
# Cole cert e key nos arquivos abaixo (ou copie da instalação do SaaS):
sudo nano /etc/ssl/x09/cert.pem
sudo nano /etc/ssl/x09/key.pem
sudo chmod 600 /etc/ssl/x09/key.pem
```

Se o SaaS já usa `/etc/ssl/x09/`, **não recrie** — o nginx do Studio aponta para os mesmos arquivos.

## 2) App
```bash
cd /opt/x09-studio
# primeiro deploy:
git clone <REPO_URL_X09_STUDIO> .

cp .env.example .env
nano .env   # preencher Supabase Studio + GEMINI + STUDIO_*_ROOT
chmod 600 .env

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
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # executar o comando systemd impresso
```

## 3) Nginx + HTTPS
```bash
sudo cp /opt/x09-studio/deploy/nginx-studio.conf /etc/nginx/sites-available/x09-studio
sudo ln -sf /etc/nginx/sites-available/x09-studio /etc/nginx/sites-enabled/x09-studio
sudo nginx -t && sudo systemctl reload nginx
```

## 4) Supabase Auth (redirect)
No projeto Supabase do Studio:
- Site URL: `https://studio.x09.com.br`
- Redirect URLs: `https://studio.x09.com.br/**`

## 5) Validação
```bash
pm2 status
curl -sI http://127.0.0.1:3001/api/health
curl -sI https://studio.x09.com.br/api/health
curl -s https://studio.x09.com.br/api/health
curl -s https://studio.x09.com.br/api/health/llm
```

No browser: abrir `https://studio.x09.com.br` → login/signup.

## 6) Atualizações
```bash
cd /opt/x09-studio
bash deploy/deploy.sh
```

Se o PM2 ainda estiver com o comando antigo (`next start`), force uma vez:

```bash
cd /opt/x09-studio
pm2 delete x09-studio || true
bash deploy/deploy.sh
pm2 logs x09-studio --lines 80 --nostream
```
