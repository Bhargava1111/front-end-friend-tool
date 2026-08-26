#!/usr/bin/env bash
# First-time production setup for Hostinger KVM 4 (Ubuntu LTS).
# Run as root on the VPS:
#   bash backend/deploy/vps/install.sh
#
# Safe to re-run — skips steps that are already done.
set -o errexit
set -o pipefail

APP_NAME="mnxstore"
APP_USER="mnxstore"
APP_DIR="/var/www/${APP_NAME}"
VENV_DIR="${APP_DIR}/venv"
ENV_FILE="${APP_DIR}/.env"
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Override before running if needed:
GIT_REPO="${GIT_REPO:-https://github.com/Bhargava1111/front-end-friend-tool.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"
VPS_IP="${VPS_IP:-200.234.39.88}"
DOMAIN="${DOMAIN:-}"
DB_NAME="${DB_NAME:-mnxstore}"
DB_USER="${DB_USER:-mnxstore}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

echo "=============================================="
echo " Sri Mahalakshmi Stores — VPS install"
echo " App dir: ${APP_DIR}"
echo " Git:     ${GIT_REPO} (${GIT_BRANCH})"
echo "=============================================="

# ── 1. System packages ─────────────────────────────────────────────
echo "[1/14] Installing system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  python3 python3-venv python3-pip python3-dev \
  build-essential libpq-dev \
  postgresql postgresql-contrib \
  redis-server \
  nginx git curl ufw certbot python3-certbot-nginx \
  acl

# ── 2. App user ──────────────────────────────────────────────────────
echo "[2/14] Creating service user..."
if ! id "${APP_USER}" &>/dev/null; then
  useradd --system --home "${APP_DIR}" --shell /usr/sbin/nologin "${APP_USER}"
fi
mkdir -p "${APP_DIR}"
chown "${APP_USER}:${APP_USER}" "${APP_DIR}"

# ── 3. Clone / update code ─────────────────────────────────────────
echo "[3/14] Fetching application code..."
if [[ -d "${APP_DIR}/.git" ]]; then
  echo "  Repo exists — pulling latest..."
  git config --global --add safe.directory "${APP_DIR}" 2>/dev/null || true
  sudo -u "${APP_USER}" git -C "${APP_DIR}" fetch origin
  sudo -u "${APP_USER}" git -C "${APP_DIR}" checkout "${GIT_BRANCH}"
  sudo -u "${APP_USER}" git -C "${APP_DIR}" pull origin "${GIT_BRANCH}"
elif [[ ! -f "${APP_DIR}/manage.py" && ! -f "${APP_DIR}/backend/manage.py" ]]; then
  sudo -u "${APP_USER}" git clone --branch "${GIT_BRANCH}" --depth 1 "${GIT_REPO}" "${APP_DIR}"
  chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"
else
  echo "  Code already present — skipping clone."
fi

# Detect Django project directory
if [[ -f "${APP_DIR}/backend/manage.py" ]]; then
  BACKEND_DIR="${APP_DIR}/backend"
elif [[ -f "${APP_DIR}/manage.py" ]]; then
  BACKEND_DIR="${APP_DIR}"
else
  echo "ERROR: manage.py not found under ${APP_DIR} or ${APP_DIR}/backend"
  exit 1
fi
echo "  Django dir: ${BACKEND_DIR}"

# ── 4. Python virtualenv ─────────────────────────────────────────────
echo "[4/14] Python virtual environment..."
if [[ ! -d "${VENV_DIR}" ]]; then
  python3 -m venv "${VENV_DIR}"
  chown -R "${APP_USER}:${APP_USER}" "${VENV_DIR}"
fi
"${VENV_DIR}/bin/pip" install --upgrade pip wheel
"${VENV_DIR}/bin/pip" install -r "${BACKEND_DIR}/requirements.txt"

# ── 5. PostgreSQL ────────────────────────────────────────────────────
echo "[5/14] PostgreSQL database..."
DB_PASSWORD="${DB_PASSWORD:-}"
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  echo ""
  echo "Enter a strong password for PostgreSQL user '${DB_USER}':"
  read -rs DB_PASSWORD
  echo ""
  if [[ -z "${DB_PASSWORD}" ]]; then
    echo "ERROR: Database password cannot be empty."
    exit 1
  fi
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL
else
  echo "  Database user '${DB_USER}' already exists — skipping create."
fi

# ── 6. Environment file ──────────────────────────────────────────────
echo "[6/14] Production .env..."
if [[ ! -f "${ENV_FILE}" ]]; then
  cp "${DEPLOY_DIR}/env.production.template" "${ENV_FILE}"
  SECRET=$("${VENV_DIR}/bin/python" -c "import secrets; print(secrets.token_urlsafe(50))")
  sed -i "s|CHANGE_ME_GENERATE_WITH_python_-c_import_secrets_print_secrets_token_urlsafe_50|${SECRET}|" "${ENV_FILE}"

  if [[ -n "${DB_PASSWORD}" ]]; then
    # Escape sed special chars in password
    ESCAPED_PW=$(printf '%s' "${DB_PASSWORD}" | sed 's/[&/\]/\\&/g')
    sed -i "s|CHANGE_DB_PASSWORD|${ESCAPED_PW}|" "${ENV_FILE}"
  else
    echo "  WARN: Set DATABASE_URL password in ${ENV_FILE} manually."
  fi

  if [[ -n "${DOMAIN}" ]]; then
    sed -i "s|YOUR_DOMAIN|${DOMAIN}|g" "${ENV_FILE}"
    sed -i "s|http://${VPS_IP}|https://${DOMAIN}|g" "${ENV_FILE}"
  fi

  chmod 600 "${ENV_FILE}"
  chown "${APP_USER}:${APP_USER}" "${ENV_FILE}"
  echo "  Created ${ENV_FILE}"
else
  echo "  ${ENV_FILE} already exists — not overwriting."
fi

# ── 7. Media / static directories ──────────────────────────────────
echo "[7/14] Directories and permissions..."
mkdir -p "${BACKEND_DIR}/media" "${BACKEND_DIR}/staticfiles" "${APP_DIR}/backups"
chown -R "${APP_USER}:www-data" "${BACKEND_DIR}/media" "${BACKEND_DIR}/staticfiles"
chmod -R 775 "${BACKEND_DIR}/media" "${BACKEND_DIR}/staticfiles"
setfacl -R -m u:www-data:rwx "${BACKEND_DIR}/media" "${BACKEND_DIR}/staticfiles" 2>/dev/null || true

# ── 8. Django setup ────────────────────────────────────────────────
echo "[8/14] Django migrate + collectstatic..."
sudo -u "${APP_USER}" bash -c "
  set -a
  source ${ENV_FILE}
  set +a
  cd ${BACKEND_DIR}
  ${VENV_DIR}/bin/python manage.py check
  ${VENV_DIR}/bin/python manage.py migrate --noinput
  ${VENV_DIR}/bin/python manage.py collectstatic --noinput
"

if grep -q "ALLOW_DEMO_SEED=1" "${ENV_FILE}" 2>/dev/null; then
  echo "  Seeding demo data..."
  sudo -u "${APP_USER}" bash -c "
    set -a
    source ${ENV_FILE}
    set +a
    cd ${BACKEND_DIR}
    ALLOW_DEMO_SEED=1 ${VENV_DIR}/bin/python manage.py seed_demo || true
  "
fi

echo "[10/14] Redis..."
systemctl enable redis-server
systemctl start redis-server
# Keep Redis local only
if grep -q "^# bind 127.0.0.1" /etc/redis/redis.conf 2>/dev/null; then
  sed -i 's/^# bind 127.0.0.1/bind 127.0.0.1/' /etc/redis/redis.conf
  systemctl restart redis-server
fi

# ── 11. Gunicorn workers (based on CPU) ──────────────────────────────
CORES=$(nproc)
WORKERS=$(( CORES * 2 + 1 ))
if (( WORKERS > 9 )); then WORKERS=9; fi
if (( WORKERS < 3 )); then WORKERS=3; fi
echo "[11/14] Gunicorn workers: ${WORKERS}"

# ── 12. systemd (Gunicorn + Celery) ──────────────────────────────────
echo "[12/14] systemd services..."
sed "s|--workers 5|--workers ${WORKERS}|; s|/var/www/mnxstore/backend|${BACKEND_DIR}|g" \
  "${DEPLOY_DIR}/systemd/mnxstore-api.service" \
  > /etc/systemd/system/mnxstore-api.service
cp "${DEPLOY_DIR}/systemd/mnxstore-api.socket" /etc/systemd/system/
sed "s|/var/www/mnxstore/backend|${BACKEND_DIR}|g" \
  "${DEPLOY_DIR}/systemd/mnxstore-celery.service" \
  > /etc/systemd/system/mnxstore-celery.service
systemctl daemon-reload
systemctl enable mnxstore-api.socket mnxstore-api.service mnxstore-celery.service
systemctl restart mnxstore-api.socket
systemctl restart mnxstore-api.service
systemctl restart mnxstore-celery.service

# ── 13. Web frontend (Node/Nitro) ────────────────────────────────────
echo "[13/16] Web frontend..."
if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]]; then
  echo "  Installing Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi
echo "  Node: $(node -v)"

WEB_OUT="${APP_DIR}/web-output"
if [[ -f "${APP_DIR}/package.json" ]]; then
  echo "  Building web app (this may take a few minutes)..."
  cp "${DEPLOY_DIR}/systemd/mnxstore-web.service" /etc/systemd/system/
  systemctl daemon-reload
  systemctl enable mnxstore-web.service
  if ! sudo -u "${APP_USER}" bash -c "
    set -a
    source ${ENV_FILE}
    set +a
    cd ${APP_DIR}
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
    echo "  WARN: web frontend build failed — API will still work for the mobile app."
  else
    systemctl restart mnxstore-web.service
  fi
else
  echo "  WARN: ${APP_DIR}/package.json not found — skip web frontend (API only)."
fi

# ── 14. Nginx ────────────────────────────────────────────────────────
echo "[14/16] Nginx..."
SERVER_NAMES="${VPS_IP}"
if [[ -n "${DOMAIN}" ]]; then
  SERVER_NAMES="${DOMAIN} ${VPS_IP}"
fi
sed "s|SERVER_NAME_PLACEHOLDER|${SERVER_NAMES}|" \
  "${DEPLOY_DIR}/nginx/mnxstore.conf" \
  > /etc/nginx/sites-available/mnxstore
ln -sf /etc/nginx/sites-available/mnxstore /etc/nginx/sites-enabled/mnxstore
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx

# ── 15. Firewall ─────────────────────────────────────────────────────
echo "[15/16] UFW firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Copy helper scripts
cp "${DEPLOY_DIR}/deploy.sh" "${APP_DIR}/deploy.sh"
cp "${DEPLOY_DIR}/backup-db.sh" "${APP_DIR}/backup-db.sh"
cp "${DEPLOY_DIR}/status.sh" "${APP_DIR}/status.sh"
chmod +x "${APP_DIR}/deploy.sh" "${APP_DIR}/backup-db.sh" "${APP_DIR}/status.sh"
chown "${APP_USER}:${APP_USER}" "${APP_DIR}/backup-db.sh"

# Daily backup cron
CRON_LINE="0 3 * * * ${APP_USER} ${APP_DIR}/backup-db.sh >> /var/log/mnxstore-backup.log 2>&1"
(crontab -u "${APP_USER}" -l 2>/dev/null | grep -v backup-db.sh; echo "${CRON_LINE}") | crontab -u "${APP_USER}" -

# ── SSL (optional) ───────────────────────────────────────────────────
if [[ -n "${DOMAIN}" ]]; then
  echo ""
  echo "Setting up Let's Encrypt SSL for ${DOMAIN}..."
  echo "Make sure DNS A record points ${DOMAIN} -> ${VPS_IP}"
  read -rp "Press Enter to run certbot (Ctrl+C to skip)..."
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "care@srimahalakshmistores.in" || {
    echo "Certbot failed — run manually after DNS is ready:"
    echo "  certbot --nginx -d ${DOMAIN}"
  }
  if grep -q "SECURE_SSL_REDIRECT=False" "${ENV_FILE}"; then
    sed -i 's|SECURE_SSL_REDIRECT=False|SECURE_SSL_REDIRECT=True|' "${ENV_FILE}"
    systemctl restart mnxstore-api.service
  fi
fi

echo ""
echo "=============================================="
echo " INSTALL COMPLETE"
echo "=============================================="
echo ""
echo "Health:  http://${VPS_IP}/api/v1/health/"
echo "Web app: http://${VPS_IP}/"
echo "API:     http://${VPS_IP}/api/v1/"
if [[ -n "${DOMAIN}" ]]; then
  echo "Domain:  https://${DOMAIN}/api/v1/"
fi
echo ""
echo "Demo login: admin@mnxstore.in / Demo@12345"
echo ""
echo "Useful commands:"
echo "  bash ${APP_DIR}/status.sh"
echo "  systemctl status mnxstore-web mnxstore-api mnxstore-celery nginx postgresql redis-server"
echo "  journalctl -u mnxstore-api -f"
echo "  journalctl -u mnxstore-celery -f"
echo "  bash ${APP_DIR}/deploy.sh"
echo ""
