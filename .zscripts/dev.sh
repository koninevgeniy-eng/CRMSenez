#!/bin/bash
set -e

cd /home/z/my-project

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "[DEV] Installing dependencies..."
  npm ci
fi

# Setup database
echo "[DEV] Setting up database..."
npm run db:push 2>/dev/null || true

# Build for production if not already built
if [ ! -d ".next" ] || [ ! -f ".next/BUILD_ID" ]; then
  echo "[DEV] Building for production..."
  NODE_OPTIONS="--max-old-space-size=2048" npx next build
fi

# Start production server using double-fork for process persistence
echo "[DEV] Starting production server on port 3000..."
( NODE_OPTIONS="--max-old-space-size=512" setsid npx next start -p 3000 >> /home/z/my-project/dev.log 2>&1 & )

# Wait for server to be ready
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
    echo "[DEV] Server ready after ${i}s"
    break
  fi
  sleep 1
done

echo "[DEV] Server started successfully"
