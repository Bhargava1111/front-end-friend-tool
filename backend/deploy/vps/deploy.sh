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

systemctl restart mnxstore-api.service
systemctl restart mnxstore-celery.service
nginx -t && systemctl reload nginx

echo ""
echo "=== Deploy complete ==="
systemctl is-active mnxstore-api.service
curl -sf "http://127.0.0.1/api/v1/health/" && echo "Health check OK" || echo "Health check failed — check logs"
