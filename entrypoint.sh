#!/bin/sh
set -e

echo "▶ Menjalankan Prisma migrate deploy..."
npx prisma migrate deploy

echo "▶ Memulai aplikasi GANTARA..."
exec npm run start
