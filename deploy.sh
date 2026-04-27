#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "==> git pull"
git pull

echo "==> build server + client"
docker compose build server client

echo "==> restart"
docker compose up -d server client

echo "==> done. logs:"
docker compose ps
