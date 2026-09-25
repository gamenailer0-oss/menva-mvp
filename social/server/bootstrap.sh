#!/usr/bin/env bash
# One paste on a fresh Ubuntu server:
#   curl -fsSL https://raw.githubusercontent.com/gamenailer0-oss/menva-mvp/social-automation/social/server/bootstrap.sh | bash
# Downloads MENVA (the repository is public, so no GitHub key is needed) and runs the installer.
set -euo pipefail
sudo apt-get update -qq && sudo apt-get install -y -qq git >/dev/null
if [ ! -d "$HOME/menva-mvp" ]; then
  git clone -b social-automation https://github.com/gamenailer0-oss/menva-mvp.git "$HOME/menva-mvp"
else
  git -C "$HOME/menva-mvp" pull --ff-only
fi
cd "$HOME/menva-mvp/social/server"
exec ./install.sh </dev/tty
