#!/usr/bin/env bash
# Runs the Cloudflare tunnel + NilBot production server as one supervised unit.
# The tunnel URL changes on each start; we wait for it, then boot the app with
# that URL as ORIGIN (required for form-action origin checks).
set -euo pipefail
cd "$(dirname "$0")/.."

export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"
LOG=/tmp/nilbot-tunnel.log
: > "$LOG"

"$HOME/.local/bin/cloudflared" tunnel --url http://localhost:3000 >"$LOG" 2>&1 &
TUNNEL_PID=$!
trap 'kill $TUNNEL_PID 2>/dev/null || true' EXIT

ORIGIN=""
for i in $(seq 1 60); do
  ORIGIN=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | head -1 || true)
  [ -n "$ORIGIN" ] && break
  sleep 1
done
if [ -z "$ORIGIN" ]; then
  echo "Tunnel failed to produce a URL" >&2
  exit 1
fi

echo "$ORIGIN" > /tmp/nilbot-public-url
echo "NilBot public URL: $ORIGIN"

exec env ORIGIN="$ORIGIN" PORT=3000 BODY_SIZE_LIMIT=104857600 node build
