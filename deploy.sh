#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "==> git pull"
git pull

echo "==> pull latest images from ghcr.io"
docker compose pull server client

echo "==> restart server + client (db untouched)"
docker compose up -d server client

echo "==> done."
docker compose ps
