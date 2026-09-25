#!/usr/bin/env bash
# Pull the latest posts/templates/workflow from GitHub and reload them into n8n.
# Run from this folder:   ./update.sh
# Your .env, the posting history (files/) and n8n's own data are never touched.
set -euo pipefail
cd "$(dirname "$0")"
DOCKER="sudo docker"

if [ "${1:-}" != "--no-pull" ]; then
  echo "▸ Getting the latest version from GitHub"
  git pull --ff-only
fi

echo "▸ Loading the workflows into n8n"
$DOCKER compose exec -T n8n n8n import:workflow --input=/repo/social/n8n/workflow.json
$DOCKER compose exec -T n8n n8n publish:workflow --id=MenvaAlerts00001
$DOCKER compose exec -T n8n n8n publish:workflow --id=MenvaAutopost001

# Don't restart in the middle of a publish (the lock in files/state.json lasts at most 30 minutes).
for _ in $(seq 1 60); do
  sudo grep -q '"lock"' files/state.json 2>/dev/null || break
  echo "▸ A post is being published right now; waiting…"; sleep 30
done

echo "▸ Restarting so the changes take effect"
$DOCKER compose up -d
$DOCKER compose restart n8n
echo "▸ Up to date."
