#!/usr/bin/env bash
# Open HTTP/HTTPS and start store services on the VPS.
# Run as root:
#   bash backend/deploy/vps/fix-http.sh
# or:
#   ssh root@200.234.39.88 'bash -s' < backend/deploy/vps/fix-http.sh
set -o errexit
set -o pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

echo "=== Sri Mahalakshmi Stores — fix public HTTP ==="
echo "Host: $(hostname)  Time: $(date -Is)"
echo ""

export DEBIAN_FRONTEND=noninteractive
if ! command -v nginx >/dev/null 2>&1; then
  echo "Nginx is not installed. Run install.sh first:"
  echo "  bash /var/www/mnxstore/backend/deploy/vps/install.sh"
  echo "  # or: bash /var/www/mnxstore/deploy/vps/install.sh"
  exit 1
fi

echo "[1/6] Opening firewall (UFW + iptables)..."
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 22/tcp >/dev/null 2>&1 || true
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  ufw allow 'Nginx Full' >/dev/null 2>&1 || true
  ufw --force enable >/dev/null 2>&1 || true
  ufw reload >/dev/null 2>&1 || true
  echo "  UFW:"
  ufw status verbose | sed 's/^/    /' || true
fi
iptables -I INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
iptables -I INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
iptables -I INPUT -p tcp --dport 22 -j ACCEPT 2>/dev/null || true

echo ""
echo "[2/6] Starting database and API..."
systemctl enable --now postgresql >/dev/null 2>&1 || true
systemctl enable --now redis-server >/dev/null 2>&1 || true
systemctl enable mnxstore-api.socket mnxstore-api.service >/dev/null 2>&1 || true
systemctl restart mnxstore-api.socket >/dev/null 2>&1 || true
systemctl restart mnxstore-api.service >/dev/null 2>&1 || true
systemctl restart mnxstore-web.service >/dev/null 2>&1 || true
systemctl restart mnxstore-celery.service >/dev/null 2>&1 || true

echo ""
echo "[3/6] Starting Nginx on ports 80/443..."
systemctl enable nginx >/dev/null 2>&1 || true
if [[ -f /etc/nginx/sites-available/mnxstore ]]; then
  ln -sf /etc/nginx/sites-available/mnxstore /etc/nginx/sites-enabled/mnxstore
  rm -f /etc/nginx/sites-enabled/default
fi
nginx -t
systemctl restart nginx

echo ""
echo "[4/6] Listening ports:"
ss -tlnp | grep -E ':80|:443|:22|:3000|:8000' || ss -tlnp | head -20

echo ""
echo "[5/6] Local health checks:"
curl -sS -m 8 -o /tmp/mnx-health.json -w "  localhost/api/v1/health/ -> HTTP %{http_code}\n" http://127.0.0.1/api/v1/health/ || echo "  API health failed"
python3 -m json.tool /tmp/mnx-health.json 2>/dev/null | sed 's/^/    /' || true
curl -sS -m 8 -o /dev/null -w "  localhost:80 -> HTTP %{http_code}\n" http://127.0.0.1/ || echo "  Nginx :80 failed"

echo ""
echo "[6/6] Service status:"
for svc in nginx mnxstore-api mnxstore-web postgresql redis-server; do
  printf "  %-18s %s\n" "${svc}:" "$(systemctl is-active "${svc}" 2>/dev/null || echo missing)"
done

echo ""
echo "If the phone still cannot load:"
echo "  1. Hostinger hPanel → VPS → Firewall → allow inbound TCP 80 and 443"
echo "  2. systemctl status nginx mnxstore-api --no-pager"
echo "  3. journalctl -u nginx -u mnxstore-api -n 80 --no-pager"
echo ""
