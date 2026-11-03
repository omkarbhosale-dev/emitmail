#!/bin/bash
# Internal HTTP handler for POST /trigger-update and GET /health

AUTH_HEADER=""
METHOD=""
REQUEST_URI=""
PROTO=""
CONTENT_LENGTH=0
BODY=""

# Read HTTP Request Line (e.g. POST /trigger-update HTTP/1.1)
read -r METHOD REQUEST_URI PROTO

# Read HTTP Headers
while IFS= read -r line; do
  line=$(echo "$line" | tr -d '\r\n')
  [ -z "$line" ] && break

  # Match Authorization header: Bearer <secret>
  if [[ "$line" =~ ^[Aa]uthorization:[[:space:]]*[Bb]earer[[:space:]]+(.*)$ ]]; then
    AUTH_HEADER="${BASH_REMATCH[1]}"
  fi

  # Match Content-Length
  if [[ "$line" =~ ^[Cc]ontent-[Ll]ength:[[:space:]]*([0-9]+) ]]; then
    CONTENT_LENGTH="${BASH_REMATCH[1]}"
  fi
done

# Read Body if content-length > 0
if [ "$CONTENT_LENGTH" -gt 0 ]; then
  read -r -N "$CONTENT_LENGTH" BODY
fi

TARGET_VERSION=""
if [ -n "$BODY" ]; then
  # Extract targetVersion from JSON body if present: {"targetVersion":"v1.2.3"}
  TARGET_VERSION=$(echo "$BODY" | grep -o '"targetVersion"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d '"' -f 4)
fi

# Route dispatch
if [ "$METHOD" = "POST" ] && [ "$REQUEST_URI" = "/trigger-update" ]; then
  EXPECTED_SECRET="${UPDATER_SECRET:-changeme}"
  if [ -n "$EXPECTED_SECRET" ] && [ "$AUTH_HEADER" = "$EXPECTED_SECRET" ]; then
    echo -e "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n{\"status\":\"updating\",\"message\":\"Update started in background\",\"targetVersion\":\"${TARGET_VERSION}\"}"
    
    # Asynchronously execute update.sh detached from this request process
    ( nohup /bin/bash /workspace/update.sh "${TARGET_VERSION}" > /workspace/update.log 2>&1 & )
    exit 0
  else
    echo -e "HTTP/1.1 401 Unauthorized\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n{\"error\":\"Unauthorized: invalid or missing UPDATER_SECRET\"}"
    exit 0
  fi

elif [ "$METHOD" = "GET" ] && [ "$REQUEST_URI" = "/health" ]; then
  echo -e "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n{\"status\":\"healthy\",\"service\":\"updater\"}"
  exit 0

else
  echo -e "HTTP/1.1 404 Not Found\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n{\"error\":\"Route not found\"}"
  exit 0
fi

