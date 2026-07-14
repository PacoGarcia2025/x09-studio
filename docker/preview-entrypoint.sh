#!/bin/sh
set -e
cd /app

if [ -f package-lock.json ]; then
  npm run build
  exec npx --yes serve -s dist -l "${PORT:-5173}"
fi

if command -v bun >/dev/null 2>&1; then
  bun run build
  exec bunx serve -s dist -l "${PORT:-5173}"
fi

echo "Nenhum package manager disponível no container" >&2
exit 1
