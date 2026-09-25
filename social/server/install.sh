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
  if ! sudo iptables -C INPUT -m state --state NEW $rule -j ACCEPT 2>/dev/null; then
    # Insert just before the first REJECT/DROP rule (Oracle's images end INPUT with one); else append.
    pos=$(sudo iptables -L INPUT --line-numbers -n | awk '$2=="REJECT" || $2=="DROP" {print $1; exit}')
    # shellcheck disable=SC2086
    if [ -n "$pos" ]; then sudo iptables -I INPUT "$pos" -m state --state NEW $rule -j ACCEPT; else sudo iptables -A INPUT -m state --state NEW $rule -j ACCEPT; fi
  fi
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
say "Starting n8n and Gotenberg (first time downloads ~1.5 GB)"
# Caddy (the public web address) starts only after your n8n login exists.
$DOCKER compose up -d n8n gotenberg

say "Waiting for n8n to start"
N8N_UP=
for _ in $(seq 1 100); do
  if $DOCKER compose exec -T n8n wget -qO- http://localhost:5678/healthz >/dev/null 2>&1 </dev/null; then N8N_UP=1; break; fi
  sleep 3
done
if [ -z "$N8N_UP" ]; then
  echo "n8n didn't start within 5 minutes. Nothing is public yet. Check: sudo docker compose logs --tail 50 n8n, then run ./install.sh again."
  exit 1
fi

# 6. Create your n8n login now, so nobody else can claim the dashboard first
# (captured first: with pipefail, "wget | grep -q" can read as false when grep exits early)
SETTINGS=$($DOCKER compose exec -T n8n wget -qO- http://localhost:5678/rest/settings 2>/dev/null </dev/null || true)
if [[ $SETTINGS != *'"showSetupOnFirstLoad"'* ]]; then
  echo "Couldn't read n8n's settings, so the dashboard stays private for now. Run ./install.sh again in a minute."
  exit 1
fi
if [[ $SETTINGS == *'"showSetupOnFirstLoad":true'* ]]; then
  say "Create your n8n login (you'll use it at https://<your address>)"
  N8N_EMAIL=$(ask 'Login email')
  while :; do
    read -r -s -p "Password (8+ characters, with a number and a capital letter): " N8N_PASS; echo
    [[ ${#N8N_PASS} -ge 8 && $N8N_PASS =~ [0-9] && $N8N_PASS =~ [A-Z] ]] && break
    echo "That password is too weak for n8n. Try again."
  done
  $DOCKER compose exec -T -e E="$N8N_EMAIL" -e P="$N8N_PASS" n8n node -e "
    fetch('http://localhost:5678/rest/owner/setup', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: process.env.E, firstName: 'MENVA', lastName: 'Owner', password: process.env.P }) })
      .then(async (r) => { if (!r.ok) { console.error('Could not create the login:', r.status, await r.text()); process.exit(1); } console.log('Login created.'); })" </dev/null \
    || echo "Couldn't create the login automatically. Open the dashboard right away and create it there."
  unset N8N_PASS
fi

# 7. Go public (HTTPS), then load the workflows and switch them on
$DOCKER compose up -d
./update.sh --no-pull

DOMAIN=$(grep '^DOMAIN=' .env | cut -d= -f2)
say "Done."
cat <<EOF

  Open https://$DOMAIN in your browser and sign in with the login you just created.
  (If the page doesn't load yet, wait a minute: the HTTPS certificate is being issued.)

  Next: SETUP.md step 6 (Instagram token).
  (To use plain \`docker\` without sudo, log out and back in once.)

EOF
