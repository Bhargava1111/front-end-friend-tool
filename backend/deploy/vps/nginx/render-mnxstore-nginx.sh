#!/usr/bin/env bash
# Render /etc/nginx/sites-available/mnxstore from the template.
# Usage (as root):
#   VPS_IP=200.234.39.88 bash backend/deploy/vps/nginx/render-mnxstore-nginx.sh
set -o errexit
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="${SCRIPT_DIR}/mnxstore.conf"
TARGET="/etc/nginx/sites-available/mnxstore"
VPS_IP="${VPS_IP:-200.234.39.88}"
DOMAIN="${DOMAIN:-}"
DISABLE_IPV6="${DISABLE_IPV6:-}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

if [[ ! -f "${TEMPLATE}" ]]; then
  echo "ERROR: template not found: ${TEMPLATE}"
  exit 1
fi

SERVER_NAMES="${VPS_IP} _"
if [[ -n "${DOMAIN}" ]]; then
  SERVER_NAMES="${DOMAIN} ${SERVER_NAMES}"
fi

IPV6_LISTEN="listen [::]:80 default_server;"
if [[ "${DISABLE_IPV6}" == "1" ]]; then
  echo "IPv6 listener disabled (DISABLE_IPV6=1)"
  IPV6_LISTEN=""
elif command -v ping6 >/dev/null 2>&1; then
  if ! ping6 -c1 -W2 2001:4860:4860::8888 >/dev/null 2>&1; then
    echo "WARN: IPv6 route looks broken — omitting [::]:80 (fixes some mobile ERR_CONNECTION_ABORTED)"
    IPV6_LISTEN=""
  fi
fi

sed \
  -e "s|SERVER_NAME_PLACEHOLDER|${SERVER_NAMES}|" \
  -e "s|IPV6_LISTEN_PLACEHOLDER|${IPV6_LISTEN}|" \
  "${TEMPLATE}" > "${TARGET}"

ln -sf "${TARGET}" /etc/nginx/sites-enabled/mnxstore
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
systemctl reload nginx

echo "Nginx site rendered: ${TARGET}"
echo "  server_name: ${SERVER_NAMES}"
echo "  ipv6: $([[ -n "${IPV6_LISTEN}" ]] && echo enabled || echo disabled)"
