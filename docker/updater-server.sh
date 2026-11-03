#!/bin/sh
set -e

# Ensure permissions on workspace scripts
chmod +x /workspace/update.sh 2>/dev/null || true
chmod +x /workspace/docker/updater-handler.sh 2>/dev/null || true

echo "🚀 [EmitMail Updater] Starting internal HTTP daemon on port 9999..."

# Prefer socat if installed
if command -v socat >/dev/null 2>&1; then
  echo "📡 [EmitMail Updater] Listening with socat on port 9999"
  exec socat -T 10 TCP-LISTEN:9999,fork,reuseaddr SYSTEM:"/bin/bash /workspace/docker/updater-handler.sh"
fi

# Fallback: lightweight netcat loop
echo "📡 [EmitMail Updater] Listening with netcat (nc) on port 9999"
while true; do
  nc -l -p 9999 -e /bin/bash /workspace/docker/updater-handler.sh
done

