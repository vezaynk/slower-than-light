#!/bin/sh
# Brings the dev server back on 0.0.0.0:8080. Idempotent and non-blocking.
# Runs from this script's own folder, so it works wherever the repo is checked out.
set -e
cd "$(dirname "$0")"
if curl -fsS -o /dev/null --max-time 1 http://127.0.0.1:8080/ 2>/dev/null; then
  exit 0
fi
# Detached from this shell, so the server outlives whatever started the script.
setsid nohup npm run dev > /tmp/stl-dev.log 2>&1 < /dev/null &
exit 0
