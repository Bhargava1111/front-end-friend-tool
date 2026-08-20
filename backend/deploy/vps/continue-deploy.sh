#!/usr/bin/env bash
# Continue VPS deployment from partial state (no reinstall / no clone).
# Run as root on the VPS:
#   bash /var/www/mnxstore/backend/deploy/vps/continue-deploy.sh
set -o errexit
set -o pipefail

APP_USER="mnxstore"
APP_DIR="/var/www/mnxstore"
BACKEND_DIR="${APP_DIR}/backend"
VENV_DIR="${APP_DIR}/venv"
ENV_FILE="${APP_DIR}/.env"
DEPLOY_DIR="${APP_DIR}/backend/deploy/vps"
VPS_IP="200.234.39.88"

stage() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  STAGE: $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

fail() {
  echo ""
  echo "ERROR: $1"
  exit 1
}

if [[ "${EUID}" -ne 0 ]]; then
  fail "Run as root: sudo bash $0"
fi

[[ -f "${BACKEND_DIR}/manage.py" ]] || fail "manage.py not found at ${BACKEND_DIR}/manage.py"
[[ -f "${ENV_FILE}" ]] || fail ".env not found at ${ENV_FILE}"
[[ -d "${DEPLOY_DIR}" ]] || fail "deploy dir not found at ${DEPLOY_DIR}"

# venv may have been created as root during manual setup
chown -R "${APP_USER}:${APP_USER}" "${VENV_DIR}"

# ── Stage 1: Inspect .env (no secrets) ───────────────────────────────
stage "1 — Inspect .env (keys only, no secret values)"
grep -E '^[A-Z_][A-Z0-9_]*=' "${ENV_FILE}" | cut -d= -f1 | sort | sed 's/^/  /'

SECRET_LINE=$(grep -E '^DJANGO_SECRET_KEY=' "${ENV_FILE}" || true)
if [[ -z "${SECRET_LINE}" ]]; then
  echo "  DJANGO_SECRET_KEY: MISSING"
  NEED_SECRET=1
elif [[ "${SECRET_LINE}" == "DJANGO_SECRET_KEY=CHANGE_ME_GENERATE_WITH_python_-c_import_secrets_print_secrets_token_urlsafe_50" ]] \
  || [[ "${SECRET_LINE}" == "DJANGO_SECRET_KEY=" ]]; then
  echo "  DJANGO_SECRET_KEY: PLACEHOLDER (will generate)"
  NEED_SECRET=1
else
  echo "  DJANGO_SECRET_KEY: set (value hidden)"
fi

DB_LINE=$(grep -E '^DATABASE_URL=' "${ENV_FILE}" | cut -d= -f2- || true)
if [[ -z "${DB_LINE}" ]]; then
  echo "  DATABASE_URL: MISSING"
  fail "DATABASE_URL is required — set it in .env without changing this script"
elif [[ "${DB_LINE}" =~ postgresql://mnxstore: ]] && [[ "${DB_LINE}" =~ @127\.0\.0\.1:5432/mnxstore ]]; then
  echo "  DATABASE_URL: user=mnxstore, host=127.0.0.1:5432, db=mnxstore (value hidden)"
else
  echo "  DATABASE_URL: present but user/host/db may be wrong (value hidden)"
  echo "  Expected format: postgresql://mnxstore:***@127.0.0.1:5432/mnxstore"
  fail "Fix DATABASE_URL in .env manually, then re-run"
fi

# ── Stage 2: Fix .env formatting / SECRET_KEY only if needed ─────────
stage "2 — Fix .env (no password changes)"
if grep -q '^EMAIL_PORT=587EMAIL_HOST_USER=' "${ENV_FILE}"; then
  echo "  Fixing merged EMAIL_PORT / EMAIL_HOST_USER line..."
  sed -i 's/^EMAIL_PORT=587EMAIL_HOST_USER=/EMAIL_PORT=587\nEMAIL_HOST_USER=/' "${ENV_FILE}"
fi

if [[ "${NEED_SECRET:-0}" -eq 1 ]]; then
  echo "  Generating DJANGO_SECRET_KEY..."
  NEW_SECRET=$("${VENV_DIR}/bin/python" -c "import secrets; print(secrets.token_urlsafe(50))")
  if grep -q '^DJANGO_SECRET_KEY=' "${ENV_FILE}"; then
    sed -i "s|^DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY=${NEW_SECRET}|" "${ENV_FILE}"
  else
    echo "DJANGO_SECRET_KEY=${NEW_SECRET}" >> "${ENV_FILE}"
  fi
  echo "  DJANGO_SECRET_KEY: generated (value hidden)"
fi

chown "${APP_USER}:${APP_USER}" "${ENV_FILE}"
chmod 600 "${ENV_FILE}"

# ── Stage 3: Django check / migrate / collectstatic ──────────────────
stage "3 — Django check, migrate, collectstatic"
sudo -u "${APP_USER}" bash -c "
  set -a
  source '${ENV_FILE}'
  set +a
  cd '${BACKEND_DIR}'
  '${VENV_DIR}/bin/python' manage.py check
  '${VENV_DIR}/bin/python' manage.py migrate --noinput
  '${VENV_DIR}/bin/python' manage.py collectstatic --noinput
"

# ── Stage 4: Ownership and permissions ───────────────────────────────
stage "4 — Ownership and permissions"
mkdir -p /run/mnxstore "${BACKEND_DIR}/media" "${BACKEND_DIR}/staticfiles" "${APP_DIR}/backups"
chown www-data:www-data /run/mnxstore
chown -R "${APP_USER}:www-data" "${BACKEND_DIR}/media" "${BACKEND_DIR}/staticfiles"
chmod -R 775 "${BACKEND_DIR}/media" "${BACKEND_DIR}/staticfiles"
if command -v setfacl >/dev/null 2>&1; then
  setfacl -R -m u:www-data:rwx "${BACKEND_DIR}/media" "${BACKEND_DIR}/staticfiles" 2>/dev/null || true
fi
chown "${APP_USER}:${APP_USER}" "${ENV_FILE}"
chmod 600 "${ENV_FILE}"
echo "  permissions OK"

# ── Stage 5: Install systemd units ───────────────────────────────────
stage "5 — Install systemd units"
CORES=$(nproc)
WORKERS=$(( CORES * 2 + 1 ))
if (( WORKERS > 9 )); then WORKERS=9; fi
if (( WORKERS < 3 )); then WORKERS=3; fi
echo "  Gunicorn workers: ${WORKERS}"

sed "s|--workers 5|--workers ${WORKERS}|; s|/var/www/mnxstore/backend|${BACKEND_DIR}|g" \
  "${DEPLOY_DIR}/systemd/mnxstore-api.service" \
  > /etc/systemd/system/mnxstore-api.service
cp "${DEPLOY_DIR}/systemd/mnxstore-api.socket" /etc/systemd/system/
sed "s|/var/www/mnxstore/backend|${BACKEND_DIR}|g" \
  "${DEPLOY_DIR}/systemd/mnxstore-celery.service" \
  > /etc/systemd/system/mnxstore-celery.service
echo "  units installed to /etc/systemd/system/"

# ── Stage 6: Enable/start services ───────────────────────────────────
stage "6 — Start redis, API socket, API, celery"
if systemctl list-unit-files redis-server.service &>/dev/null; then
  systemctl enable --now redis-server
else
  echo "  WARN: redis-server not installed — celery may fail"
fi

systemctl daemon-reload
systemctl enable mnxstore-api.socket mnxstore-api.service mnxstore-celery.service
systemctl restart mnxstore-api.socket
systemctl restart mnxstore-api.service
systemctl restart mnxstore-celery.service || echo "  WARN: mnxstore-celery failed to start (API may still work)"

# ── Stage 7: Verify mnxstore-api ─────────────────────────────────────
stage "7 — Verify mnxstore-api"
API_STATE=$(systemctl is-active mnxstore-api.service 2>/dev/null || echo "inactive")
echo "  mnxstore-api: ${API_STATE}"
if [[ "${API_STATE}" != "active" ]]; then
  echo ""
  echo "  journalctl -u mnxstore-api -n 50 --no-pager:"
  journalctl -u mnxstore-api -n 50 --no-pager || true
  fail "mnxstore-api is not active — fix errors above before continuing"
fi
ls -la /run/mnxstore/gunicorn.sock

# ── Stage 8: Nginx site config ───────────────────────────────────────
stage "8 — Configure nginx"
if ! command -v nginx >/dev/null 2>&1; then
  fail "nginx is not installed — install with: apt-get install -y nginx"
fi

sed "s|SERVER_NAME_PLACEHOLDER|${VPS_IP}|" \
  "${DEPLOY_DIR}/nginx/mnxstore.conf" \
  > /etc/nginx/sites-available/mnxstore
ln -sf /etc/nginx/sites-available/mnxstore /etc/nginx/sites-enabled/mnxstore
rm -f /etc/nginx/sites-enabled/default
echo "  site config: /etc/nginx/sites-available/mnxstore"

# ── Stage 9: nginx -t ──────────────────────────────────────────────
stage "9 — nginx -t"
nginx -t

# ── Stage 10: Enable and restart nginx ───────────────────────────────
stage "10 — Enable and restart nginx"
systemctl enable nginx
systemctl restart nginx
echo "  nginx: $(systemctl is-active nginx)"

# ── Stage 11: UFW ────────────────────────────────────────────────────
stage "11 — UFW (keep SSH, allow 80/443)"
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp >/dev/null 2>&1 || true
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable >/dev/null 2>&1 || true
  ufw reload >/dev/null 2>&1 || true
  ufw status verbose | sed 's/^/  /'
else
  echo "  ufw not installed — skipping"
fi

# ── Stage 12: Local verify ───────────────────────────────────────────
stage "12 — Local verify"
ss -tlnp | grep -E ':80|:443' || echo "  WARN: nothing on 80/443"
echo ""
curl -v -m 10 http://127.0.0.1/api/v1/health/ || fail "local health check failed"

# ── Stage 13: Public verify ──────────────────────────────────────────
stage "13 — Public verify"
if curl -v -m 10 "http://${VPS_IP}/api/v1/health/"; then
  echo ""
  echo "SUCCESS: public health check OK"
else
  echo ""
  stage "14 — Public timeout (Hostinger / network)"
  echo "  Local health worked but public IP failed."
  echo "  Do NOT change VPS app config further."
  echo "  Check Hostinger hPanel → VPS → Firewall inbound rules:"
  echo "    - Accept TCP 80 from Any (0.0.0.0/0)"
  echo "    - Accept TCP 443 from Any (0.0.0.0/0)"
  echo "    - Accept TCP 22 from Any (before any Drop-all rule)"
  echo "  Ensure rules are INBOUND and applied to this VPS (srv1912140)."
  echo "  Wait 2-5 minutes after changes, then retry:"
  echo "    curl -v -m 10 http://${VPS_IP}/api/v1/health/"
  exit 1
fi

echo ""
echo "Deployment continuation complete."
