#!/usr/bin/env bash
# Deploys (or redeploys) the app on an Amazon Linux 2023 EC2 instance.
# Run inside EC2 Instance Connect:
#   curl -fsSL https://raw.githubusercontent.com/<user>/<repo>/main/deploy/ec2-setup.sh | bash -s -- https://github.com/<user>/<repo>.git
# Safe to run again: it pulls the latest code and restarts the app.

# Everything is inside main() so bash downloads the whole script before running any of it.
main() {
  set -eo pipefail
  REPO_URL="${1:?Usage: ec2-setup.sh <git-repo-url>}"
  APP_DIR="$HOME/app"
  PORT=3000

  echo "==> 1/5 Installing git"
  sudo dnf install -y -q git

  echo "==> 2/5 Installing Node.js 22 (via nvm)"
  export NVM_DIR="$HOME/.nvm"
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash >/dev/null
  fi
  set +e                      # nvm isn't compatible with 'set -e'
  . "$NVM_DIR/nvm.sh"
  nvm install 22 >/dev/null
  nvm alias default 22 >/dev/null
  set -e
  command -v node >/dev/null || { echo "Node install failed"; exit 1; }
  echo "    node $(node -v)"

  echo "==> 3/5 Getting the code"
  if [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" pull --ff-only
  else
    git clone "$REPO_URL" "$APP_DIR"
  fi
  cd "$APP_DIR"
  npm ci --omit=dev --no-fund --no-audit

  echo "==> 4/5 Environment variables"
  if [ ! -f .env ]; then
    read -rp  "    SUPABASE_URL: " SUPABASE_URL </dev/tty
    read -rsp "    SUPABASE_SECRET_KEY (hidden): " SUPABASE_SECRET_KEY </dev/tty; echo
    printf 'SUPABASE_URL=%s\nSUPABASE_SECRET_KEY=%s\nPORT=%s\n' "$SUPABASE_URL" "$SUPABASE_SECRET_KEY" "$PORT" > .env
    chmod 600 .env            # only this user can read the secrets
  else
    echo "    .env already exists, keeping it"
  fi

  echo "==> 5/5 Starting the app with pm2"
  command -v pm2 >/dev/null || npm install -g pm2 --no-fund --no-audit >/dev/null
  if pm2 describe app >/dev/null 2>&1; then
    pm2 restart app --update-env
  else
    pm2 start server.js --name app
  fi
  pm2 save >/dev/null

  # Public IP from instance metadata (IMDSv2)
  TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60" || true)
  IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4 || true)

  sleep 2
  if curl -sf "http://localhost:$PORT/api/health" >/dev/null; then
    echo ""
    echo "DONE. Open: http://${IP:-<EC2-public-IP>}:$PORT"
    echo "(If it doesn't load, add an inbound rule for TCP $PORT in the instance's security group.)"
  else
    echo "App didn't respond. Check logs with: pm2 logs app"
    exit 1
  fi
}

main "$@"
