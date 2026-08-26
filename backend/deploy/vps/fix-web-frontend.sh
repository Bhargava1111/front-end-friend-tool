#!/usr/bin/env bash
# Fix web frontend build: Node 22, permissions, rebuild, restart mnxstore-web.
# Run as root on VPS:
#   bash /var/www/mnxstore/backend/deploy/vps/fix-web-frontend.sh
set -o errexit
set -o pipefail

APP_USER="mnxstore"
APP_DIR="/var/www/mnxstore"
ENV_FILE="${APP_DIR}/.env"
WEB_OUT="${APP_DIR}/web-output"
VPS_IP="${VPS_IP:-200.234.39.88}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

echo "=== Fix web frontend ==="

NODE_MAJOR="$(node -v 2>/dev/null | cut -d. -f1 | tr -d v || echo 0)"
if [[ "${NODE_MAJOR}" -lt 22 ]]; then
  echo "Installing Node.js 22 (current: $(node -v 2>/dev/null || echo missing))..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi
echo "Node: $(node -v)"

echo "Fixing ownership (root may have left files in node_modules)..."
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

# Optional swap if build OOMs on small VPS
if [[ "$(free -m | awk '/^Swap:/{print $2}')" -eq 0 ]]; then
  if [[ ! -f /swapfile ]]; then
    echo "Adding 2G swap for build..."
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
  fi
fi

echo "Building frontend as ${APP_USER}..."
sudo -u "${APP_USER}" bash -c "
  set -a
  source ${ENV_FILE}
  set +a
  cd ${APP_DIR}
  rm -rf node_modules .output ${WEB_OUT}
  npm ci
  NITRO_PRESET=node-server \
    VITE_API_URL=/api/v1 \
    API_URL=http://127.0.0.1/api/v1 \
    VITE_PUBLIC_WEB_URL=http://${VPS_IP} \
    VITE_APP_URL=http://${VPS_IP} \
    npm run build
  test -f .output/server/index.mjs
  cp -a .output ${WEB_OUT}
"

PRESET="$(python3 -c "import json; print(json.load(open('${WEB_OUT}/nitro.json'))['preset'])" 2>/dev/null || echo unknown)"
echo "Build preset: ${PRESET}"
if [[ "${PRESET}" != "node-server" ]]; then
  echo "WARN: expected node-server preset, got ${PRESET}"
fi

cp "${APP_DIR}/backend/deploy/vps/systemd/mnxstore-web.service" /etc/systemd/system/ 2>/dev/null || true
systemctl daemon-reload
systemctl enable mnxstore-web.service >/dev/null 2>&1 || true
systemctl restart mnxstore-web.service
sleep 2

echo ""
echo "=== Updating Nginx (web on /, API on /api/) ==="
sed "s|SERVER_NAME_PLACEHOLDER|${VPS_IP}|" \
  "${APP_DIR}/backend/deploy/vps/nginx/mnxstore.conf" \
  > /etc/nginx/sites-available/mnxstore
ln -sf /etc/nginx/sites-available/mnxstore /etc/nginx/sites-enabled/mnxstore
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "=== Status ==="
systemctl is-active mnxstore-web.service || true
curl -sf -o /dev/null -w "Homepage HTTP %{http_code}\n" "http://127.0.0.1:3000/" || echo "Homepage check failed"
nginx -t && systemctl reload nginx
echo "Done. Open http://${VPS_IP}/"
