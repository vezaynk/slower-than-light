#!/bin/sh
set -e
cd /workspace
if curl -fsS -o /dev/null --max-time 1 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev > /tmp/ashwake-dev.log 2>&1 &
exit 0
