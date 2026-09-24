#!/usr/bin/env bash
# One-time setup of the MENVA autoposter on a fresh Ubuntu server (Oracle Cloud ARM or any other).
# Run from this folder:   ./install.sh
# Safe to run again: it skips what is already done.
set -euo pipefail
cd "$(dirname "$0")"

say()  { printf '\n\033[1;31m▸ %s\033[0m\n' "$*"; }
ask()  { local prompt=$1 default=${2:-} reply; read -r -p "$prompt${default:+ [$default]}: " reply; echo "${reply:-$default}"; }
setenv() { # setenv KEY VALUE — write KEY=VALUE into .env
  if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=$2|" .env; else echo "$1=$2" >> .env; fi
}

# 1. Docker
if ! command -v docker >/dev/null 2>&1; then
  say "Installing Docker (takes 1–2 minutes)"
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$USER" || true
DOCKER="sudo docker"

# 2. Firewall inside the server. Oracle's Ubuntu images block everything except SSH by default.
say "Opening ports 80 and 443 on the server firewall"
for rule in "-p tcp --dport 80" "-p tcp --dport 443" "-p udp --dport 443"; do
  # shellcheck disable=SC2086
  sudo iptables -C INPUT -m state --state NEW $rule -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 5 -m state --state NEW $rule -j ACCEPT
done
if command -v netfilter-persistent >/dev/null 2>&1; then sudo netfilter-persistent save >/dev/null; fi

# 3. Settings
[ -f .env ] || cp .env.example .env
IP=$(curl -fsS https://api.ipify.org || true)
if ! grep -q '^DOMAIN=.\+' .env; then
  say "Web address for this server"
  echo "Use your own subdomain (e.g. social.yourdomain.net, pointed at $IP),"
  echo "or press Enter to use the free address ${IP//./-}.sslip.io"
  setenv DOMAIN "$(ask 'Address' "${IP//./-}.sslip.io")"
fi
if ! grep -q '^ACME_EMAIL=.\+' .env; then setenv ACME_EMAIL "$(ask 'Your email (for the HTTPS certificate)')"; fi
if ! grep -q '^N8N_ENCRYPTION_KEY=.\+' .env; then setenv N8N_ENCRYPTION_KEY "$(openssl rand -hex 24)"; fi
chmod 600 .env

# 4. Folders n8n writes to (n8n runs as user 1000 inside its container)
mkdir -p files/media files/log
sudo chown -R 1000:1000 files

# 5. Start everything
say "Starting n8n, Gotenberg and Caddy (first time downloads ~1.5 GB)"
$DOCKER compose up -d

say "Waiting for n8n to start"
for _ in $(seq 1 60); do
  if $DOCKER compose exec -T n8n wget -qO- http://localhost:5678/healthz >/dev/null 2>&1; then break; fi
  sleep 3
done

# 6. Load the workflows and switch them on
./update.sh --no-pull

DOMAIN=$(grep '^DOMAIN=' .env | cut -d= -f2)
say "Done."
cat <<EOF

  Open https://$DOMAIN in your browser and create your n8n login.
  (If the page doesn't load yet, wait a minute: the HTTPS certificate is being issued.)

  Next: SETUP.md step 6 (Instagram token).

EOF
