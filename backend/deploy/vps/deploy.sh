#!/usr/bin/env bash
# Routine deployment — pull code, migrate, collectstatic, restart.
# Run on VPS as root:
#   bash /var/www/mnxstore/deploy.sh
set -o errexit
set -o pipefail

APP_NAME="mnxstore"
APP_USER="mnxstore"
APP_DIR="/var/www/${APP_NAME}"
VENV_DIR="${APP_DIR}/venv"
ENV_FILE="${APP_DIR}/.env"
GIT_BRANCH="${GIT_BRANCH:-main}"

if [[ -f "${APP_DIR}/backend/manage.py" ]]; then
  BACKEND_DIR="${APP_DIR}/backend"
elif [[ -f "${APP_DIR}/manage.py" ]]; then
  BACKEND_DIR="${APP_DIR}"
else
  echo "ERROR: manage.py not found"
  exit 1
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

echo "=== Deploying ${APP_NAME} ==="

if [[ -d "${APP_DIR}/.git" ]]; then
  sudo -u "${APP_USER}" git -C "${APP_DIR}" fetch origin
  sudo -u "${APP_USER}" git -C "${APP_DIR}" checkout "${GIT_BRANCH}"
  sudo -u "${APP_USER}" git -C "${APP_DIR}" pull origin "${GIT_BRANCH}"
else
  echo "WARN: ${APP_DIR}/.git not found — skipping git pull."
fi

"${VENV_DIR}/bin/pip" install -r "${BACKEND_DIR}/requirements.txt"

sudo -u "${APP_USER}" bash -c "
  set -a
  source ${ENV_FILE}
  set +a
  cd ${BACKEND_DIR}
  ${VENV_DIR}/bin/python manage.py check
  ${VENV_DIR}/bin/python manage.py migrate --noinput
  ${VENV_DIR}/bin/python manage.py collectstatic --noinput
"

if grep -qE "ALLOW_DEMO_SEED=(1|true|yes)" "${ENV_FILE}" 2>/dev/null; then
  echo "Ensuring demo admin accounts..."
  sudo -u "${APP_USER}" bash -c "
    set -a
    source ${ENV_FILE}
    set +a
    cd ${BACKEND_DIR}
    ALLOW_DEMO_SEED=1 ${VENV_DIR}/bin/python manage.py ensure_demo_admins
  " || echo "WARN: ensure_demo_admins finished with warnings"
fi

systemctl restart mnxstore-api.service
systemctl restart mnxstore-celery.service || true

cp "${BACKEND_DIR}/deploy/vps/deploy.sh" "${APP_DIR}/deploy.sh" 2>/dev/null || true
cp "${BACKEND_DIR}/deploy/vps/status.sh" "${APP_DIR}/status.sh" 2>/dev/null || true
chmod +x "${APP_DIR}/deploy.sh" "${APP_DIR}/status.sh" 2>/dev/null || true

ensure_node_22() {
  local major
  major="$(node -v 2>/dev/null | cut -d. -f1 | tr -d v || echo 0)"
  if [[ "${major}" -lt 22 ]]; then
    echo "=== Installing Node.js 22 (TanStack Start requires >=22) ==="
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y -qq nodejs
  fi
  echo "Node: $(node -v)"
}

ensure_node_22
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

if [[ -f "${APP_DIR}/package.json" ]] && command -v node >/dev/null 2>&1; then
  echo "=== Building web frontend ==="
  WEB_OUT="${APP_DIR}/web-output"
  VPS_IP="${VPS_IP:-200.234.39.88}"
  if sudo -u "${APP_USER}" bash -c "
    set -a
    source ${ENV_FILE}
    set +a
    cd ${APP_DIR}
    rm -rf node_modules/.cache 2>/dev/null || true
    npm ci
    NITRO_PRESET=node-server \
      VITE_API_URL=/api/v1 \
      API_URL=http://127.0.0.1/api/v1 \
      VITE_PUBLIC_WEB_URL=http://${VPS_IP} \
      VITE_APP_URL=http://${VPS_IP} \
      npm run build
    rm -rf ${WEB_OUT}
    cp -a .output ${WEB_OUT}
  "; then
    cp "${APP_DIR}/backend/deploy/vps/systemd/mnxstore-web.service" /etc/systemd/system/ 2>/dev/null || true
    systemctl daemon-reload
    systemctl enable mnxstore-web.service >/dev/null 2>&1 || true
    systemctl restart mnxstore-web.service
  else
    echo "WARN: web frontend build failed — API still restarted."
  fi
fi

nginx -t && systemctl reload nginx

echo ""
echo "=== Deploy complete ==="
systemctl is-active mnxstore-api.service || true
systemctl is-active mnxstore-web.service || true
sleep 2
for i in 1 2 3 4 5; do
  if curl -sf "http://127.0.0.1/api/v1/health/" >/dev/null; then
    echo "Health check OK"
    curl -s "http://127.0.0.1/api/v1/health/"; echo
    if grep -qE "ALLOW_DEMO_SEED=(1|true|yes)" "${ENV_FILE}" 2>/dev/null; then
      curl -sf -X POST "http://127.0.0.1/api/v1/bootstrap/demo-users/" \
        -H "Content-Type: application/json" \
        -d '{}' >/dev/null && echo "Demo admin accounts OK" || echo "WARN: demo admin bootstrap failed"
    fi
    break
  fi
  echo "Health check retry ${i}/5..."
  sleep 2
done
