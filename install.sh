#!/usr/bin/env bash
# ==============================================================================
# EmitMail VPS Zero-Friction Installer
# Automated deployment, secret generation, port conflict resolution & GHCR launch
# ==============================================================================
set -e

cd "$(dirname "$(readlink -f "$0")")"

for required_command in openssl docker; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    echo "Error: $required_command is required. Install it before running EmitMail setup." >&2
    exit 1
  fi
done
if ! docker compose version >/dev/null 2>&1; then
  echo "Error: Docker Compose v2 is required (docker compose)." >&2
  exit 1
fi

# ANSI Color Codes
BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

echo -e "${BOLD}${CYAN}"
cat << 'EOF'
  _____           _  _   __  __         _  _ 
 | ____| _ __ ___ (_)| |_|  \/  |  __ _ (_)| |
 |  _|  | '_ ` _ \| || __| |\/| | / _` || || |
 | |___ | | | | | | || |_| |  | || (_| || || |
 |_____||_| |_| |_|_| \__|_|  |_| \__,_||_||_|
EOF
echo -e "       High-Performance Sovereign Mail Engine${NC}\n"

# Helper to check if a TCP port is in use on the host
is_port_in_use() {
  local p="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -tuln | grep -E -q "(:|\])${p}\s+"
  elif command -v lsof >/dev/null 2>&1; then
    lsof -i ":${p}" >/dev/null 2>&1
  elif command -v netstat >/dev/null 2>&1; then
    netstat -tuln | grep -E -q "(:|\])${p}\s+"
  else
    # Fallback bash pseudo-device check
    (timeout 1 bash -c "cat < /dev/null > /dev/tcp/127.0.0.1/${p}") 2>/dev/null || return 1
  fi
}

# Helper to safely set or update key=value in .env
set_env_var() {
  local key="$1"
  local value="$2"
  if [ ! -f .env ]; then
    touch .env
  fi

  if grep -q "^[[:blank:]]*${key}=" .env; then
    sed -i.bak "s|^[[:blank:]]*${key}=.*|${key}=${value}|" .env && rm -f .env.bak
  else
    echo "${key}=${value}" >> .env
  fi
}

# Helper to read an existing variable from .env
get_env_var() {
  local key="$1"
  local default_val="$2"
  if [ -f .env ]; then
    local val
    val=$(grep "^[[:blank:]]*${key}=" .env | cut -d '=' -f 2- | tr -d '\r\n')
    if [ -n "$val" ]; then
      echo "$val"
      return
    fi
  fi
  echo "$default_val"
}

# 1. Environment File & Cryptographic Secret Generation
if [ ! -f .env ]; then
  echo -e "${CYAN}⚙️  Creating .env from .env.example...${NC}"
  if [ -f .env.example ]; then
    cp .env.example .env
  else
    touch .env
  fi

  echo -e "${CYAN}🔐 Generating high-entropy cryptographic keys and secrets...${NC}"
  set_env_var "POSTGRES_USER" "mailuser"
  set_env_var "POSTGRES_DB" "maildb"
fi

ensure_secret() {
  local key="$1" bytes="$2" current invalid=0
  current=$(get_env_var "$key" "")
  case "$key" in
    JWT_SECRET|UPDATER_SECRET) [ "${#current}" -lt 32 ] && invalid=1 ;;
    INITIAL_ADMIN_PASSWORD) [ "${#current}" -lt 16 ] && invalid=1 ;;
    ENCRYPTION_KEY) [[ ! "$current" =~ ^[a-fA-F0-9]{64}$ ]] && invalid=1 ;;
  esac
  if [ -z "$current" ] || [ "$current" = "changeme" ] || [ "$current" = "your-secret-here" ] || [ "$invalid" -eq 1 ]; then
    set_env_var "$key" "$(openssl rand -hex "$bytes")"
    echo -e "${GREEN}✓ Generated secure $key.${NC}"
  fi
}

ensure_secret "POSTGRES_PASSWORD" 24
ensure_secret "JWT_SECRET" 32
ensure_secret "ENCRYPTION_KEY" 32
ensure_secret "UPDATER_SECRET" 32
ensure_secret "INITIAL_ADMIN_PASSWORD" 24

# 2. Public Dashboard & API URL Configuration
CURRENT_APP_URL=$(get_env_var "APP_URL" "http://localhost:3000")
echo -e "\n${BOLD}Configure Public Access:${NC}"
read -r -p "👉 Enter your public Dashboard URL [${CURRENT_APP_URL}]: " PROMPT_APP_URL || true
USER_APP_URL="${PROMPT_APP_URL:-$CURRENT_APP_URL}"
USER_APP_URL="${USER_APP_URL%/}"
set_env_var "APP_URL" "$USER_APP_URL"

# 3. Port Conflict Detection & Automatic Resolution
echo -e "\n${BOLD}Checking host port availability:${NC}"

check_and_resolve_port() {
  local var_name="$1"
  local default_port="$2"
  local service_name="$3"
  local current_port
  current_port=$(get_env_var "$var_name" "$default_port")
  if ! [[ "$current_port" =~ ^[0-9]+$ ]] || [ "$current_port" -lt 1 ] || [ "$current_port" -gt 65535 ]; then
    echo -e "${RED}❌ ${var_name} must be a valid TCP port between 1 and 65535.${NC}" >&2
    exit 1
  fi

  local port_conflict=0
  if is_port_in_use "$current_port" || port_is_reserved "$current_port"; then
    port_conflict=1
  fi

  if [ "$port_conflict" -eq 1 ]; then
    echo -e "${YELLOW}⚠️  Warning: Port ${current_port} (${service_name}) is currently occupied by another process.${NC}"
    local chosen_port=""
    local suggested_port=$((current_port + 1000))
    if [ "$suggested_port" -gt 65535 ]; then suggested_port=65535; fi
    while true; do
      if ! read -r -p "👉 Enter an alternate host port for ${service_name} [suggested: ${suggested_port}]: " chosen_port; then
        echo -e "${RED}❌ No input received while resolving ${service_name}'s port conflict.${NC}" >&2
        exit 1
      fi
      chosen_port="${chosen_port:-$suggested_port}"
      if ! [[ "$chosen_port" =~ ^[0-9]+$ ]] || [ "$chosen_port" -lt 1 ] || [ "$chosen_port" -gt 65535 ]; then
        echo -e "${RED}❌ Enter a valid TCP port between 1 and 65535.${NC}"
        chosen_port=""
      elif is_port_in_use "$chosen_port" || port_is_reserved "$chosen_port"; then
        echo -e "${RED}❌ Port ${chosen_port} is also in use. Please select a free port.${NC}"
        suggested_port=$((chosen_port + 1))
        if [ "$suggested_port" -gt 65535 ]; then suggested_port=65535; fi
        chosen_port=""
      else
        set_env_var "$var_name" "$chosen_port"
        RESERVED_HOST_PORTS+=("$chosen_port")
        echo -e "${GREEN}✓ Set ${var_name}=${chosen_port} in .env${NC}"
        break
      fi
    done
  else
    set_env_var "$var_name" "$current_port"
    RESERVED_HOST_PORTS+=("$current_port")
    echo -e "${GREEN}✓ Port ${current_port} is available for ${service_name}.${NC}"
  fi
}

RESERVED_HOST_PORTS=()
port_is_reserved() {
  local port="$1" reserved
  for reserved in "${RESERVED_HOST_PORTS[@]}"; do
    [ "$reserved" = "$port" ] && return 0
  done
  return 1
}

check_and_resolve_port "DASHBOARD_PORT" "3000" "Dashboard UI"
check_and_resolve_port "API_PORT" "4000" "REST API Server"
check_and_resolve_port "DOCS_PORT" "3001" "Documentation Site"
check_and_resolve_port "SMTP_RELAY_PORT" "25" "Inbound Mail Relay (Port 25)"
check_and_resolve_port "SMTP_SUBMISSION_PORT" "2525" "SMTP Submission (Port 2525)"

if [[ "$USER_APP_URL" =~ ^https?://(localhost|127\.0\.0\.1):3000$ ]]; then
  DASHBOARD_PORT_VALUE=$(get_env_var "DASHBOARD_PORT" "3000")
  if [ "$DASHBOARD_PORT_VALUE" != "3000" ]; then
    USER_APP_URL="http://localhost:${DASHBOARD_PORT_VALUE}"
    set_env_var "APP_URL" "$USER_APP_URL"
  fi
fi

# Make the dashboard call the API through the public reverse proxy when a public
# dashboard URL was supplied; for local setup, follow the selected API port.
CURRENT_API_URL=$(get_env_var "API_URL" "http://localhost:4000")
if [[ "$USER_APP_URL" =~ ^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?/?$ ]]; then
  API_PORT_VALUE=$(get_env_var "API_PORT" "4000")
  if [ "$CURRENT_API_URL" = "http://localhost:4000" ] || [ "$CURRENT_API_URL" = "http://127.0.0.1:4000" ]; then
    CURRENT_API_URL="http://localhost:${API_PORT_VALUE}"
  fi
else
  if [ "$CURRENT_API_URL" = "http://localhost:4000" ] || [ "$CURRENT_API_URL" = "http://127.0.0.1:4000" ]; then
    CURRENT_API_URL="$USER_APP_URL"
  fi
fi
set_env_var "API_URL" "$CURRENT_API_URL"
CURRENT_CORS_ORIGINS=$(get_env_var "CORS_ORIGINS" "http://localhost:3000")
if [ "$CURRENT_CORS_ORIGINS" = "http://localhost:3000" ] && [ "$USER_APP_URL" != "http://localhost:3000" ]; then
  set_env_var "CORS_ORIGINS" "$USER_APP_URL"
fi

# Ensure scripts are executable
chmod +x update.sh 2>/dev/null || true
chmod +x docker/*.sh 2>/dev/null || true

# 4. Pull pre-built GHCR images and Launch Stack
echo -e "\n${CYAN}📦 Pulling pre-built GHCR Docker images...${NC}"
docker compose pull

echo -e "\n${CYAN}🚀 Launching EmitMail container stack...${NC}"
docker compose up -d

# 5. Summary Table & Next Steps
FINAL_DASHBOARD_PORT=$(get_env_var "DASHBOARD_PORT" "3000")
FINAL_API_PORT=$(get_env_var "API_PORT" "4000")
FINAL_DOCS_PORT=$(get_env_var "DOCS_PORT" "3001")
FINAL_SMTP_RELAY=$(get_env_var "SMTP_RELAY_PORT" "25")
FINAL_SMTP_SUB=$(get_env_var "SMTP_SUBMISSION_PORT" "2525")

echo -e "\n${BOLD}${GREEN}================================================================${NC}"
echo -e "${BOLD}${GREEN}           🎉 EmitMail Successfully Deployed!                  ${NC}"
echo -e "${BOLD}${GREEN}================================================================${NC}"
printf "│ %-22s │ %-35s │\n" "Service" "Access Point"
echo "├────────────────────────┼─────────────────────────────────────┤"
printf "│ %-22s │ %-35s │\n" "Web Dashboard" "http://localhost:${FINAL_DASHBOARD_PORT} (or VPS IP)"
printf "│ %-22s │ %-35s │\n" "Backend REST API" "http://localhost:${FINAL_API_PORT}"
printf "│ %-22s │ %-35s │\n" "Documentation" "http://localhost:${FINAL_DOCS_PORT}"
printf "│ %-22s │ %-35s │\n" "Inbound SMTP (MX)" "Port ${FINAL_SMTP_RELAY} (Public 0.0.0.0)"
printf "│ %-22s │ %-35s │\n" "SMTP Submission" "Port ${FINAL_SMTP_SUB} (Public 0.0.0.0)"
echo "└────────────────────────┴─────────────────────────────────────┘"

echo -e "\n${BOLD}Next Steps:${NC}"
echo "1. Reverse Proxy: Put Nginx, Caddy, or Cloudflare Tunnel in front of 127.0.0.1:${FINAL_DASHBOARD_PORT}"
echo "2. Initial Login: Open the Dashboard at ${USER_APP_URL} and sign in with the generated admin account"
echo "   Username: admin"
echo "   One-time password: $(get_env_var "INITIAL_ADMIN_PASSWORD" "")"
echo "   Change this password immediately after signing in."
echo "3. DNS Records: Follow the in-dashboard guides to configure SPF, DKIM, and DMARC"
echo "4. Upgrades: Click 'Update Now' in the Dashboard or run ./update.sh anytime"
echo ""

