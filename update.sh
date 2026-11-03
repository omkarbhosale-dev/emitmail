#!/usr/bin/env bash
# ==============================================================================
# EmitMail Zero-Downtime Non-Destructive Auto-Updater
# Safe configuration synchronization, GHCR image pull, and background recreation
# ==============================================================================
set -e

BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
NC="\033[0m"

echo -e "${BOLD}${CYAN}🚀 [EmitMail Updater] Starting platform update sequence...${NC}"

# Target version passed as CLI argument (e.g. ./update.sh v1.2.0)
TARGET_VERSION="$1"

# 1. Pull latest repository definitions
if [ -d ".git" ]; then
  echo -e "${CYAN}📥 Fetching latest deployment configurations from Git...${NC}"
  # Stash any untracked file conflicts safely or pull cleanly
  git fetch origin main 2>/dev/null || true
  git merge origin/main --ff-only 2>/dev/null || git pull origin main || echo -e "${YELLOW}⚠️ Notice: Git pull encountered changes; continuing with existing local files.${NC}"
fi

# 2. Non-Destructive Environment Synchronization
if [ -f ".env.example" ] && [ -f ".env" ]; then
  echo -e "${CYAN}🔍 Auditing .env against .env.example for new configuration keys...${NC}"
  ADDED_KEYS_COUNT=0

  while IFS= read -r line || [ -n "$line" ]; do
    # Trim leading and trailing whitespace
    trimmed=$(echo "$line" | sed 's/^[[:blank:]]*//;s/[[:blank:]]*$//')

    # Ignore comments and blank lines
    [[ "$trimmed" =~ ^#.*$ ]] && continue
    [ -z "$trimmed" ] && continue

    # Extract key name
    key=$(echo "$trimmed" | cut -d '=' -f 1 | tr -d ' ')
    if [ -n "$key" ]; then
      # Check if key already exists in user's .env file
      if ! grep -q "^[[:blank:]]*${key}=" .env; then
        echo -e "${YELLOW}➕ Adding missing configuration: ${trimmed}${NC}"
        echo "$trimmed" >> .env
        ADDED_KEYS_COUNT=$((ADDED_KEYS_COUNT + 1))
      fi
    fi
  done < .env.example

  if [ "$ADDED_KEYS_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✓ All environment variables are up to date.${NC}"
  else
    echo -e "${GREEN}✓ Appended ${ADDED_KEYS_COUNT} new configuration setting(s) to .env.${NC}"
  fi
fi

# 3. Optional Target Version Update
if [ -n "$TARGET_VERSION" ]; then
  echo -e "${CYAN}🎯 Updating APP_VERSION to ${TARGET_VERSION} in .env...${NC}"
  if grep -q "^[[:blank:]]*APP_VERSION=" .env; then
    sed -i.bak "s|^[[:blank:]]*APP_VERSION=.*|APP_VERSION=${TARGET_VERSION}|" .env && rm -f .env.bak
  else
    echo "APP_VERSION=${TARGET_VERSION}" >> .env
  fi
  echo -e "${GREEN}✓ Target version configured: ${TARGET_VERSION}${NC}"
fi

# 4. Pull pre-built images from GHCR
echo -e "${CYAN}📦 Pulling latest pre-built container images from GitHub Container Registry...${NC}"
docker compose pull

# 5. Recreate and restart containers with zero orphan residue
echo -e "${CYAN}🔄 Recreating EmitMail containers...${NC}"
docker compose up -d --remove-orphans

# 6. Clean up obsolete dangling layers to preserve VPS disk space
echo -e "${CYAN}🧹 Cleaning up dangling image layers...${NC}"
docker image prune -f

echo -e "\n${BOLD}${GREEN}================================================================${NC}"
echo -e "${BOLD}${GREEN}          ✨ EmitMail Update Completed Successfully!            ${NC}"
echo -e "${BOLD}${GREEN}================================================================${NC}\n"

