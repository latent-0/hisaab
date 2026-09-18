#!/bin/sh
set -e

echo "[hisaab] Applying database schema…"
npx prisma db push --skip-generate --accept-data-loss || echo "[hisaab] db push skipped/failed (continuing)"

if [ "$HISAAB_SEED" = "true" ]; then
  COUNT=$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.merchant.count().then(c=>{console.log(c);process.exit(0)}).catch(()=>{console.log(0);process.exit(0)})")
  if [ "$COUNT" = "0" ]; then
    echo "[hisaab] Seeding demo data…"
    npx tsx prisma/seed.ts || echo "[hisaab] seed failed (continuing)"
  else
    echo "[hisaab] Data already present ($COUNT merchants) — skipping seed."
  fi
fi

echo "[hisaab] Starting server on port ${PORT:-8080}…"
exec npx next start -p ${PORT:-8080}
