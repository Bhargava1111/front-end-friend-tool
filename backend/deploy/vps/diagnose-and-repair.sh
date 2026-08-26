#!/usr/bin/env bash
# Diagnose VPS deployment and apply safe repairs (no reinstall, no data deletion).
# Run as root on the VPS:
#   bash backend/deploy/vps/diagnose-and-repair.sh
# From your PC (pipe over SSH):
#   ssh root@200.234.39.88 'bash -s' < backend/deploy/vps/diagnose-and-repair.sh
set -o pipefail

APP_NAME="mnxstore"
APP_USER="mnxstore"
APP_DIR="/var/www/${APP_NAME}"
VENV_DIR="${APP_DIR}/venv"
ENV_FILE="${APP_DIR}/.env"
VPS_IP="${VPS_IP:-200.234.39.88}"
REPAIR=1

if [[ "${1:-}" == "--diagnose-only" ]]; then
  REPAIR=0
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

section() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

find_deploy_dir() {
  if [[ -d "${APP_DIR}/backend/deploy/vps" ]]; then
    echo "${APP_DIR}/backend/deploy/vps"
  elif [[ -d "${APP_DIR}/deploy/vps" ]]; then
    echo "${APP_DIR}/deploy/vps"
  else
    echo ""
  fi
}

find_backend_dir() {
  if [[ -f "${APP_DIR}/backend/manage.py" ]]; then
    echo "${APP_DIR}/backend"
  elif [[ -f "${APP_DIR}/manage.py" ]]; then
    echo "${APP_DIR}"
  else
    echo ""
  fi
}

section "Host"
echo "  hostname: $(hostname)"
echo "  time:     $(date -Is)"

section "1. Application code"
if [[ -d "${APP_DIR}" ]]; then
  echo "  ${APP_DIR}: exists"
  ls -la "${APP_DIR}" 2>/dev/null | head -12 | sed 's/^/    /'
else
  echo "  ${APP_DIR}: MISSING"
fi

BACKEND_DIR="$(find_backend_dir)"
DEPLOY_DIR="$(find_deploy_dir)"

if [[ -n "${BACKEND_DIR}" ]]; then
  echo "  Django:   ${BACKEND_DIR}"
else
  echo "  Django:   manage.py NOT FOUND"
fi

if [[ -f "${ENV_FILE}" ]]; then
  echo "  .env:     exists"
  grep -E '^[A-Z_]+=' "${ENV_FILE}" | cut -d= -f1 | sort | sed 's/^/    /'
else
  echo "  .env:     MISSING"
fi

if [[ -d "${VENV_DIR}" ]]; then
  echo "  venv:     exists"
else
  echo "  venv:     MISSING"
fi

section "2. Runtime packages"
for cmd in nginx python3 node redis-server psql; do
  if command -v "${cmd}" >/dev/null 2>&1; then
    echo "  ${cmd}: $(command -v "${cmd}")"
  else
    echo "  ${cmd}: NOT INSTALLED"
  fi
done
nginx -v 2>&1 | sed 's/^/    /' || true

section "3. systemd units"
systemctl list-unit-files 'mnxstore*' 2>/dev/null | sed 's/^/  /' || true
ls -la /etc/systemd/system/mnxstore* 2>/dev/null | sed 's/^/  /' || echo "  no mnxstore units in /etc/systemd/system/"

section "4. Nginx"
echo "  active: $(systemctl is-active nginx 2>/dev/null || echo missing)"
ls -la /etc/nginx/sites-enabled/ 2>/dev/null | sed 's/^/    /' || true
if [[ -f /etc/nginx/sites-available/mnxstore ]]; then
  echo "  mnxstore site: EXISTS"
else
  echo "  mnxstore site: MISSING"
fi
nginx -t 2>&1 | sed 's/^/    /' || true

section "5. PostgreSQL / Redis"
echo "  postgresql: $(systemctl is-active postgresql 2>/dev/null || echo missing)"
dpkg -l 2>/dev/null | grep -i '^ii.*postgresql' | head -3 | sed 's/^/    /' || true
ss -tlnp | grep 5432 | sed 's/^/    /' || echo "    nothing on 5432"
echo "  redis:      $(systemctl is-active redis-server 2>/dev/null || echo missing)"

section "6. Listening ports"
ss -tlnp | grep -E ':80|:443|:3000|:5432|:6379' | sed 's/^/  /' || echo "  none of expected ports listening"
ls -la /run/mnxstore/ 2>/dev/null | sed 's/^/  /' || echo "  /run/mnxstore/ does not exist"

section "7. Service summary"
for svc in mnxstore-web mnxstore-api mnxstore-celery nginx postgresql redis-server; do
  printf "  %-18s %s\n" "${svc}:" "$(systemctl is-active "${svc}" 2>/dev/null || echo missing)"
done

# ── Determine scenario ─────────────────────────────────────────────
SCENARIO="unknown"
if [[ -z "${BACKEND_DIR}" ]] && ! command -v nginx >/dev/null 2>&1; then
  SCENARIO="A"
elif [[ -n "${BACKEND_DIR}" ]] && [[ ! -f /etc/systemd/system/mnxstore-api.service ]]; then
  SCENARIO="B"
elif [[ -f /etc/systemd/system/mnxstore-api.service ]]; then
  SCENARIO="C"
elif [[ -z "${BACKEND_DIR}" ]]; then
  SCENARIO="A"
else
  SCENARIO="B"
fi

section "Diagnosis"
case "${SCENARIO}" in
  A)
    echo "  Scenario A: First-time install never completed."
    echo "  Action: run install.sh (does not delete existing files if present)."
    ;;
  B)
    echo "  Scenario B: Code exists but systemd/nginx not provisioned."
    echo "  Action: install missing unit files and start services."
    ;;
  C)
    echo "  Scenario C: Services installed but stopped."
    echo "  Action: start services + open firewall."
    ;;
esac

if [[ "${REPAIR}" -eq 0 ]]; then
  echo ""
  echo "Diagnose-only mode — no changes made."
  exit 0
fi

if [[ "${SCENARIO}" == "A" ]]; then
  section "Repair — first-time install required"
  if [[ -n "${DEPLOY_DIR}" ]] && [[ -f "${DEPLOY_DIR}/install.sh" ]]; then
    echo "  Running: bash ${DEPLOY_DIR}/install.sh"
    echo "  (You may be prompted for the PostgreSQL password if the DB user does not exist.)"
    bash "${DEPLOY_DIR}/install.sh"
  else
    echo "  install.sh not found locally. Clone repo then run install:"
    echo ""
    echo "    apt-get update && apt-get install -y git"
    echo "    git clone --branch main https://github.com/Bhargava1111/front-end-friend-tool.git ${APP_DIR}"
    echo "    bash ${APP_DIR}/backend/deploy/vps/install.sh"
    echo ""
    echo "  Or pipe this script from your PC after pulling latest code:"
    echo "    ssh root@${VPS_IP} 'bash -s' < backend/deploy/vps/diagnose-and-repair.sh"
    exit 1
  fi
fi

if [[ "${SCENARIO}" == "B" ]]; then
  section "Repair — install systemd + nginx configs"
  if [[ -z "${DEPLOY_DIR}" ]]; then
    echo "  ERROR: deploy/vps directory not found under ${APP_DIR}"
    exit 1
  fi

  CORES=$(nproc)
  WORKERS=$(( CORES * 2 + 1 ))
  if (( WORKERS > 9 )); then WORKERS=9; fi
  if (( WORKERS < 3 )); then WORKERS=3; fi

  mkdir -p /run/mnxstore
  chown www-data:www-data /run/mnxstore

  sed "s|--workers 5|--workers ${WORKERS}|; s|/var/www/mnxstore/backend|${BACKEND_DIR}|g" \
    "${DEPLOY_DIR}/systemd/mnxstore-api.service" \
    > /etc/systemd/system/mnxstore-api.service
  cp "${DEPLOY_DIR}/systemd/mnxstore-api.socket" /etc/systemd/system/
  sed "s|/var/www/mnxstore/backend|${BACKEND_DIR}|g" \
    "${DEPLOY_DIR}/systemd/mnxstore-celery.service" \
    > /etc/systemd/system/mnxstore-celery.service

  if [[ -f "${DEPLOY_DIR}/systemd/mnxstore-web.service" ]] && [[ -d "${APP_DIR}/web-output" ]]; then
    cp "${DEPLOY_DIR}/systemd/mnxstore-web.service" /etc/systemd/system/
  fi

  if command -v nginx >/dev/null 2>&1; then
    sed "s|SERVER_NAME_PLACEHOLDER|${VPS_IP}|" \
      "${DEPLOY_DIR}/nginx/mnxstore.conf" \
      > /etc/nginx/sites-available/mnxstore
    ln -sf /etc/nginx/sites-available/mnxstore /etc/nginx/sites-enabled/mnxstore
    rm -f /etc/nginx/sites-enabled/default
  fi

  systemctl daemon-reload
  echo "  systemd + nginx configs installed."
fi

# Scenario B and C: start services + ensure nginx routes web on /
if [[ "${SCENARIO}" == "B" ]] || [[ "${SCENARIO}" == "C" ]]; then
  section "Repair — nginx + web routing"
  if [[ -n "${DEPLOY_DIR}" ]] && [[ -f "${DEPLOY_DIR}/nginx/mnxstore.conf" ]]; then
    sed "s|SERVER_NAME_PLACEHOLDER|${VPS_IP}|" \
      "${DEPLOY_DIR}/nginx/mnxstore.conf" \
      > /etc/nginx/sites-available/mnxstore
    ln -sf /etc/nginx/sites-available/mnxstore /etc/nginx/sites-enabled/mnxstore
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
  fi
  if [[ -f "${DEPLOY_DIR}/fix-web-frontend.sh" ]] && [[ ! -d "${APP_DIR}/web-output" ]]; then
    bash "${DEPLOY_DIR}/fix-web-frontend.sh"
  fi
  section "Repair — start services"
  if [[ -f "${DEPLOY_DIR}/fix-http.sh" ]]; then
    bash "${DEPLOY_DIR}/fix-http.sh"
  else
  systemctl enable --now postgresql >/dev/null 2>&1 || true
  systemctl enable --now redis-server >/dev/null 2>&1 || true
  systemctl enable mnxstore-api.socket mnxstore-api.service >/dev/null 2>&1 || true
  systemctl restart mnxstore-api.socket >/dev/null 2>&1 || true
  systemctl restart mnxstore-api.service >/dev/null 2>&1 || true
  systemctl restart mnxstore-celery.service >/dev/null 2>&1 || true
  systemctl restart mnxstore-web.service >/dev/null 2>&1 || true
  systemctl enable nginx >/dev/null 2>&1 || true
  nginx -t && systemctl restart nginx
  fi
fi

section "Final check"
curl -sS -m 8 -o /tmp/mnx-health.json -w "  http://127.0.0.1/api/v1/health/ -> HTTP %{http_code}\n" \
  http://127.0.0.1/api/v1/health/ || echo "  health check failed"
python3 -m json.tool /tmp/mnx-health.json 2>/dev/null | sed 's/^/    /' || true
ss -tlnp | grep -E ':80|:443' | sed 's/^/  /' || echo "  ports 80/443 still not listening"

for svc in nginx mnxstore-api postgresql redis-server; do
  printf "  %-18s %s\n" "${svc}:" "$(systemctl is-active "${svc}" 2>/dev/null || echo missing)"
done

echo ""
echo "If health is OK locally but not from your PC:"
echo "  Hostinger hPanel → VPS → Firewall → allow inbound TCP 80 and 443"
echo ""
