#!/usr/bin/env bash
# Run memorial app tunnels: Cloudflare (global/VPN testing) + Serveo (Russia-friendly).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-3000}"
CF_LOG="/tmp/cloudflared-kadish.log"
RU_LOG="/tmp/serveo-kadish.log"
URLS_FILE="/tmp/kadish-public-urls.txt"

if ! curl -sf "http://127.0.0.1:${PORT}/s/novosibirsk" >/dev/null; then
  echo "App not running on port ${PORT}. Start with: PORT=${PORT} node app.js"
  exit 1
fi

if [[ ! -x /tmp/cloudflared ]]; then
  curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /tmp/cloudflared
  chmod +x /tmp/cloudflared
fi

pkill -f 'cloudflared tunnel --url' 2>/dev/null || true
pkill -f 'ssh.*serveo.net' 2>/dev/null || true
sleep 1

nohup /tmp/cloudflared tunnel --url "http://127.0.0.1:${PORT}" --no-autoupdate >"$CF_LOG" 2>&1 &
nohup bash -c 'while true; do
  ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes \
    -R 80:127.0.0.1:'"${PORT}"' serveo.net 2>&1 | tee -a "'"$RU_LOG"'"
  sleep 5
done' >/dev/null 2>&1 &

echo "Waiting for tunnel URLs..."
CF_URL=""
RU_URL=""
for _ in $(seq 1 30); do
  [[ -z "$CF_URL" ]] && CF_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$CF_LOG" 2>/dev/null | head -1 || true)
  [[ -z "$RU_URL" ]] && RU_URL=$(grep -oE 'https://[a-z0-9-]+\.serveousercontent\.com' "$RU_LOG" 2>/dev/null | tail -1 || true)
  [[ -n "$CF_URL" && -n "$RU_URL" ]] && break
  sleep 1
done

{
  echo "# Kadish public URLs — $(date -u +%Y-%m-%dT%H:%MZ)"
  echo "cloudflare_board=${CF_URL:-pending}/s/novosibirsk"
  echo "cloudflare_admin=${CF_URL:-pending}/admin/novosibirsk"
  echo "russia_board=${RU_URL:-pending}/s/novosibirsk"
  echo "russia_admin=${RU_URL:-pending}/admin/novosibirsk"
} >"$URLS_FILE"

cat "$URLS_FILE"
